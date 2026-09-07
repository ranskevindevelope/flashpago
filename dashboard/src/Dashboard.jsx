import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, TrendingUp, Download, DollarSign, Calendar, CheckCircle, Shield, Trophy, BarChart3, Eye, X, Moon, Mail, Users, UserX, UserCheck, Edit, Trash2, Save, AlertTriangle, Clock, Bell, Activity, Zap, Wifi, WifiOff, ShoppingBag, Receipt, Wallet, PlusCircle, MinusCircle, ArrowDownUp, Settings, Building2, MailCheck, ChevronDown, ChevronUp, Volume2, Package, Rocket, Lock, Inbox, Circle, ChevronRight } from 'lucide-react';
import { createApiClient } from './services/api';
import Sidebar from './components/Sidebar';
import DashboardHeader from './components/DashboardHeader';
import NotificacionesEnVivo from './components/NotificacionesEnVivo';
import Button from './components/ui/Button';
import { FilaSkeleton, TarjetaSkeleton } from './components/ui/Skeleton';
import SeccionBuscar from './secciones/SeccionBuscar';
import SeccionUsuarios from './secciones/SeccionUsuarios';
import SeccionDuplicados from './secciones/SeccionDuplicados';
import CierreCaja from './secciones/CierreCaja';
import { useUsuarios } from './hooks/useUsuarios';
import { formatearMonto, formatearMiles, soloDigitos } from './utils/formato';
import { getBancoBadge, getPlanLabel, getPlanColor } from './utils/bancos';

// Recharts pesa ~366 KB: se carga solo cuando el usuario abre una sección
// que realmente muestra una gráfica, no al entrar al dashboard.
const VentasPorDiaChart = lazy(() => import('./components/charts/VentasPorDiaChart'));
const VentasPorHoraChart = lazy(() => import('./components/charts/VentasPorHoraChart'));
const VentasVsEfectivoChart = lazy(() => import('./components/charts/VentasVsEfectivoChart'));
const GastosPorCategoriaChart = lazy(() => import('./components/charts/GastosPorCategoriaChart'));

const GraficaCargando = ({ alto = '100%' }) => (
  <div className="skeleton-block" style={{ width: '100%', height: alto }} />
);
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

const PLANES_INFO = {
  basico: { id: 'basico', nombre: 'Básico', precio: '$39.900' },
  premium: { id: 'premium', nombre: 'Premium', precio: '$79.900' },
  premium_plus: { id: 'premium_plus', nombre: 'Premium Plus', precio: '$109.900' },
};

function Dashboard({ onLogout }) {
  const getInitialSection = () => {
    if (typeof window === 'undefined') return 'panel';
    const params = new URLSearchParams(window.location.search);
    const seccion = params.get('seccion');
    return ['panel', 'pagos', 'ventas', 'estadisticas', 'buscar', 'exportar', 'duplicados', 'usuarios', 'configuracion', 'negocios'].includes(seccion)
      ? seccion
      : 'panel';
  };

  const [diasGrafica, setDiasGrafica] = useState(30);
  const [totales, setTotales] = useState({ dia: { total: 0, cantidad: 0 }, mes: { total: 0, cantidad: 0 } });
  const userGuardado = JSON.parse(localStorage.getItem('fp_user') || '{}');
  const esSuperAdmin = userGuardado.rol === 'superadmin';
  const esAdmin = userGuardado.rol === 'admin' || esSuperAdmin;
  const [pagos, setPagos] = useState([]);
  const [ventasPorHora, setVentasPorHora] = useState([]);
  const [duplicadosPendientes, setDuplicadosPendientes] = useState([]);
  const [pendientes, setPendientes] = useState({ cantidad: 0, total: 0 });
  const [stats, setStats] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fotoActiva, setFotoActiva] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState(getInitialSection);
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [onboardingOculto, setOnboardingOculto] = useState(() => {
    try { return localStorage.getItem('fp_onboarding_oculto') === '1'; } catch { return false; }
  });
  const [configVisitada, setConfigVisitada] = useState(() => {
    try { return localStorage.getItem('fp_config_visitada') === '1'; } catch { return false; }
  });
  const ocultarOnboarding = () => {
    setOnboardingOculto(true);
    try { localStorage.setItem('fp_onboarding_oculto', '1'); } catch { /* no disponible */ }
  };
  const [tema, setTema] = useState(() => {
    try { return localStorage.getItem('fp_tema') || 'light'; } catch { return 'light'; }
  });
  const alternarTema = () => {
    setTema((prev) => {
      const nuevo = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('fp_tema', nuevo); } catch { /* localStorage no disponible */ }
      return nuevo;
    });
  };
  const [sidebarFijado, setSidebarFijado] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);
  const sidebarExpandido = sidebarFijado || sidebarHover || sidebarAbierto;

  // ─── Estado para Configuración (horario del negocio) ───
  const DIAS_SEMANA = [
    { valor: 0, corto: 'Dom' }, { valor: 1, corto: 'Lun' }, { valor: 2, corto: 'Mar' },
    { valor: 3, corto: 'Mié' }, { valor: 4, corto: 'Jue' }, { valor: 5, corto: 'Vie' }, { valor: 6, corto: 'Sáb' },
  ];
  const [horaCierre, setHoraCierre] = useState({ 0: '21:00', 1: '21:00', 2: '21:00', 3: '21:00', 4: '21:00', 5: '21:00', 6: '21:00' });
  const [diasOperacion, setDiasOperacion] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [cargandoConfig, setCargandoConfig] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  // ─── Estado para la voz de las notificaciones de pago ───
  const [vocesDisponibles, setVocesDisponibles] = useState([]);
  const [vozSeleccionada, setVozSeleccionada] = useState(() => localStorage.getItem('fp_voz_notificacion') || '');

  // ─── Estado para Negocios (superadmin) ─────────────────
  // negocios/cargandoNegocios: ver useQuery mas abajo, junto a `api` (ensayo con TanStack Query)
  const [mostrarFormNegocio, setMostrarFormNegocio] = useState(false);
  const [editandoNegocio, setEditandoNegocio] = useState(null);
  const [formNegocio, setFormNegocio] = useState({ nombre: '', whatsapp: '', plan: 'basico', plan_ilimitado: false });

  // ─── Estado para Plan y Gmail ──────────────────────────
  const [planInfo, setPlanInfo] = useState(null);
  const [pagandoPlan, setPagandoPlan] = useState(null);
  const [gmailEstado, setGmailEstado] = useState(null);
  const [gmailCargando, setGmailCargando] = useState(false);
  const [modalPagoPlan, setModalPagoPlan] = useState(null);
  const [transferenciaInfo, setTransferenciaInfo] = useState(null);
  const [cargandoTransferencia, setCargandoTransferencia] = useState(false);

  // Detectar redirect de Gmail OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailResult = params.get('gmail');
    if (gmailResult === 'conectado') {
      toast.success('¡Gracias por conectar! Todo quedó correcto, ya puedes verificar pagos de tu banco.', { duration: 6000 });
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
      // Limpiar URL
      const url = new URL(window.location.href);
      url.searchParams.delete('gmail');
      window.history.replaceState({}, '', url.toString());
    } else if (gmailResult === 'error') {
      toast.error('Error conectando Gmail. Intenta de nuevo.');
      const url = new URL(window.location.href);
      url.searchParams.delete('gmail');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // ─── Estado para Ventas (cierre de caja) ───────────────
  const [ventasResumen, setVentasResumen] = useState(null);
  const [ventasExpandido, setVentasExpandido] = useState(false);
  const [ventasCierres, setVentasCierres] = useState([]);
  const [ventasSemanal, setVentasSemanal] = useState(null);
  const [ventasGastosCategorias, setVentasGastosCategorias] = useState([]);
  const [gastoMonto, setGastoMonto] = useState('');
  const [gastoCategoria, setGastoCategoria] = useState('general');
  const [gastoDescripcion, setGastoDescripcion] = useState('');
  const [gastoMetodo, setGastoMetodo] = useState('efectivo');
  const [guardandoGasto, setGuardandoGasto] = useState(false);
  const [ventasTab, setVentasTab] = useState('hoy');

  // ─── Estado para filtro por periodo ────────────────────
  const [periodoMes, setPeriodoMes] = useState(new Date().getMonth() + 1);
  const [periodoAnio, setPeriodoAnio] = useState(new Date().getFullYear());
  const [resumenPeriodo, setResumenPeriodo] = useState(null);
  const [statsPeriodo, setStatsPeriodo] = useState([]);
  const [pagosPeriodo, setPagosPeriodo] = useState([]);
  const [cargandoPeriodo, setCargandoPeriodo] = useState(false);

  const api = useMemo(() => createApiClient(onLogout), [onLogout]);
  const queryClient = useQueryClient();

  // ─── Negocios (superadmin) — ensayo con TanStack Query ─
  const { data: negocios = [], isLoading: cargandoNegocios } = useQuery({
    queryKey: ['negocios'],
    queryFn: () => api.request('/api/negocios').then((d) => (d.ok ? d.negocios || [] : [])),
    enabled: seccionActiva === 'negocios',
  });

  // Los usuarios los administra SeccionUsuarios; acá solo se leen para el
  // badge del sidebar y el paso de onboarding (misma queryKey, una sola
  // petición compartida).
  const { data: usuarios = [] } = useUsuarios(api, { enabled: esAdmin });

  const cambiarSeccion = (nuevaSeccion) => {
    if (nuevaSeccion === 'configuracion' && !configVisitada) {
      setConfigVisitada(true);
      try { localStorage.setItem('fp_config_visitada', '1'); } catch { /* no disponible */ }
    }

    if (nuevaSeccion === seccionActiva) {
      setSidebarAbierto(false);
      return;
    }

    setSeccionActiva(nuevaSeccion);
    setSidebarAbierto(false);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('seccion', nuevaSeccion);
      window.history.pushState({ seccion: nuevaSeccion }, '', `${url.pathname}?${url.searchParams.toString()}`);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const url = new URL(window.location.href);
    if (!url.searchParams.get('seccion')) {
      url.searchParams.set('seccion', seccionActiva);
      window.history.replaceState({ seccion: seccionActiva }, '', `${url.pathname}?${url.searchParams.toString()}`);
    }

    const manejarPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const seccionDesdeUrl = params.get('seccion');
      const siguienteSeccion = ['panel', 'pagos', 'ventas', 'estadisticas', 'buscar', 'exportar', 'duplicados', 'usuarios'].includes(seccionDesdeUrl)
        ? seccionDesdeUrl
        : 'panel';
      setSeccionActiva(siguienteSeccion);
    };

    window.addEventListener('popstate', manejarPopState);
    return () => window.removeEventListener('popstate', manejarPopState);
  }, [seccionActiva]);

  useEffect(() => {
    cargarDatos();
    const intervalo = setInterval(() => cargarDatos(), 30000);
    return () => clearInterval(intervalo);
  }, [diasGrafica, api]);

  useEffect(() => {
    if (seccionActiva === 'configuracion') cargarConfiguracion();
  }, [seccionActiva]);

  useEffect(() => {
    if (seccionActiva === 'ventas') cargarVentas();
  }, [seccionActiva]);

  useEffect(() => {
    if (seccionActiva === 'estadisticas' || seccionActiva === 'pagos' || seccionActiva === 'panel') cargarPeriodo();
  }, [seccionActiva, periodoMes, periodoAnio]);

  const cargarDatos = async () => {
    try {
      const [resTotales, resPagos, resStats, resPendientes, resDuplicados, resPlan, resGmail, resVentasHora, resVentasResumen] = await Promise.all([
        api.request('/api/dashboard/totales'),
        api.request('/api/dashboard/pagos?limite=20'),
        api.request(`/api/dashboard/stats?dias=${diasGrafica}`),
        api.request('/api/dashboard/pendientes'),
        api.request('/api/dashboard/duplicados?estado=PENDIENTE'),
        api.request('/api/negocios/uso/plan').catch(() => null),
        api.request('/api/gmail/estado').catch(() => null),
        api.request('/api/dashboard/ventas-hoy-por-hora').catch(() => null),
        api.request('/api/ventas/resumen').catch(() => null),
      ]);

      setTotales(resTotales || { dia: { total: 0, cantidad: 0 }, mes: { total: 0, cantidad: 0 } });
      setPagos(Array.isArray(resPagos) ? resPagos : []);
      setStats(Array.isArray(resStats) ? resStats : []);
      setPendientes(resPendientes || { cantidad: 0, total: 0 });
      setDuplicadosPendientes(Array.isArray(resDuplicados) ? resDuplicados : []);
      if (resPlan?.ok) setPlanInfo(resPlan);
      if (resGmail?.ok) setGmailEstado(resGmail);
      if (resVentasHora?.ok) setVentasPorHora(resVentasHora.datos);
      if (resVentasResumen?.ok) setVentasResumen(resVentasResumen);
      setCargando(false);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setCargando(false);
    }
  };

  // ─── Funciones de Configuración ────────────────────────
  const cargarConfiguracion = async () => {
    setCargandoConfig(true);
    try {
      const data = await api.request('/api/negocio/configuracion');
      if (data.ok) {
        setHoraCierre(data.hora_cierre);
        setDiasOperacion(data.dias_operacion);
      }
    } catch (err) {
      toast.error('Error cargando la configuración');
    }
    setCargandoConfig(false);
  };

  const alternarDia = (dia) => {
    setDiasOperacion((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia].sort()
    );
    setHoraCierre((prev) => (prev[dia] ? prev : { ...prev, [dia]: '21:00' }));
  };

  const cambiarHoraCierreDia = (dia, valor) => {
    setHoraCierre((prev) => ({ ...prev, [dia]: valor }));
  };

  const aplicarHoraATodos = (valor) => {
    setHoraCierre((prev) => {
      const actualizado = { ...prev };
      diasOperacion.forEach((d) => { actualizado[d] = valor; });
      return actualizado;
    });
  };

  const guardarConfiguracion = async () => {
    if (diasOperacion.length === 0) {
      toast.error('Selecciona al menos un día de operación');
      return;
    }
    setGuardandoConfig(true);
    try {
      const data = await api.request('/api/negocio/configuracion', {
        method: 'PUT',
        body: JSON.stringify({ hora_cierre: horaCierre, dias_operacion: diasOperacion }),
      });
      if (data.ok) {
        toast.success('Configuración guardada');
      } else {
        toast.error(data.error || 'Error guardando la configuración');
      }
    } catch (err) {
      toast.error('Error de conexión');
    }
    setGuardandoConfig(false);
  };

  // ─── Funciones de voz de notificaciones ────────────────
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const cargarVoces = () => {
      const todas = window.speechSynthesis.getVoices();
      const hispanas = todas.filter((v) => v.lang && v.lang.toLowerCase().startsWith('es'));
      setVocesDisponibles(hispanas.length > 0 ? hispanas : todas);
    };
    cargarVoces();
    window.speechSynthesis.addEventListener('voiceschanged', cargarVoces);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', cargarVoces);
  }, []);

  const seleccionarVoz = (nombreVoz) => {
    setVozSeleccionada(nombreVoz);
    localStorage.setItem('fp_voz_notificacion', nombreVoz);
  };

  const probarVoz = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance('Pago confirmado de Juan Pérez. Cincuenta mil pesos.');
    const voz = vocesDisponibles.find((v) => v.name === vozSeleccionada);
    if (voz) utterance.voice = voz;
    utterance.lang = voz ? voz.lang : 'es-CO';
    window.speechSynthesis.speak(utterance);
  };

  // ─── Funciones de Negocios (superadmin) ────────────────
  const refrescarNegocios = () => queryClient.invalidateQueries({ queryKey: ['negocios'] });

  const crearNegocio = async () => {
    if (!formNegocio.nombre.trim()) {
      toast.error('El nombre del negocio es requerido');
      return;
    }
    try {
      const data = await api.request('/api/negocios', {
        method: 'POST',
        body: JSON.stringify(formNegocio),
      });
      if (data.ok) {
        toast.success(`Negocio "${formNegocio.nombre}" creado exitosamente`);
        setFormNegocio({ nombre: '', whatsapp: '', plan: 'basico', plan_ilimitado: false });
        setMostrarFormNegocio(false);
        refrescarNegocios();
      } else {
        toast.error(data.error || 'Error creando negocio');
      }
    } catch (err) {
      toast.error('Error de conexión');
    }
  };

  const actualizarNegocio = async () => {
    try {
      const data = await api.request(`/api/negocios/${editandoNegocio}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre: formNegocio.nombre, whatsapp: formNegocio.whatsapp, plan: formNegocio.plan, plan_ilimitado: formNegocio.plan_ilimitado }),
      });
      if (data.ok) {
        toast.success('Negocio actualizado');
        setEditandoNegocio(null);
        setMostrarFormNegocio(false);
        setFormNegocio({ nombre: '', whatsapp: '', plan: 'basico', plan_ilimitado: false });
        refrescarNegocios();
      } else {
        toast.error(data.error || 'Error actualizando');
      }
    } catch (err) {
      toast.error('Error de conexión');
    }
  };

  const iniciarEdicionNegocio = (n) => {
    setEditandoNegocio(n.id);
    setFormNegocio({ nombre: n.nombre, whatsapp: n.whatsapp || '', plan: n.plan, plan_ilimitado: !!n.plan_ilimitado });
    setMostrarFormNegocio(true);
  };

  const cancelarFormNegocio = () => {
    setMostrarFormNegocio(false);
    setEditandoNegocio(null);
    setFormNegocio({ nombre: '', whatsapp: '', plan: 'basico', plan_ilimitado: false });
  };

  const alternarActivoNegocio = async (n) => {
    try {
      const data = await api.request(`/api/negocios/${n.id}`, {
        method: 'PUT',
        body: JSON.stringify({ activo: n.activo ? 0 : 1 }),
      });
      if (data.ok) {
        toast.success(n.activo ? `"${n.nombre}" desactivado` : `"${n.nombre}" reactivado`);
        refrescarNegocios();
      }
    } catch (err) {
      toast.error('Error de conexión');
    }
  };

  const estadoNegocioInfo = (n) => {
    if (n.plan_ilimitado) return { label: 'Ilimitado', clase: 'badge-nequi' };
    if (n.pagado) {
      if (!n.plan_vence) return { label: 'Pagado', clase: 'badge-nequi' };
      const diasRestantes = Math.ceil((new Date(n.plan_vence) - new Date()) / (1000 * 60 * 60 * 24));
      if (diasRestantes <= 0) return { label: 'Plan vencido', clase: 'badge-avvillas' };
      if (diasRestantes <= 5) return { label: `Pagado (${diasRestantes}d)`, clase: 'badge-transfiya' };
      return { label: 'Pagado', clase: 'badge-nequi' };
    }
    if (!n.trial_fin) return { label: 'Activo', clase: 'badge-nequi' };
    const diasRestantes = Math.ceil((new Date(n.trial_fin) - new Date()) / (1000 * 60 * 60 * 24));
    if (diasRestantes <= 0) return { label: 'Trial vencido', clase: 'badge-avvillas' };
    return { label: `Trial (${diasRestantes}d)`, clase: 'badge-transfiya' };
  };

  const eliminarNegocio = async () => {
    if (!window.confirm(
      '¿Eliminar tu cuenta de FlashPago?\n\nEsto desactiva tu negocio y a todos sus usuarios de inmediato — nadie podrá volver a iniciar sesión ni el bot seguirá verificando pagos. Tus datos históricos se conservan; contacta soporte si necesitas reactivarla.'
    )) return;
    try {
      const data = await api.request('/api/negocio', { method: 'DELETE' });
      if (data.ok) {
        onLogout();
      } else {
        toast.error(data.error || 'No se pudo eliminar la cuenta');
      }
    } catch (err) {
      toast.error('Error de conexión');
    }
  };

  const exportarPagos = async () => {
    try {
      const blob = await api.download('/exportar');
      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'pagos.csv';
      enlace.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
    } catch (err) {
      console.error('Error exportando pagos:', err);
    }
  };

  // ─── Funciones de Gmail ──────────────────────────────────
  const conectarGmail = async () => {
    setGmailCargando(true);
    try {
      const token = localStorage.getItem('fp_token');
      const data = await api.request(`/api/gmail/auth-url?token=${token}`);
      if (data.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Error obteniendo URL de Google');
      }
    } catch (err) {
      toast.error('Error de conexión');
    }
    setGmailCargando(false);
  };

  const desconectarGmail = async () => {
    if (!window.confirm('¿Desconectar Gmail? El bot no podrá verificar pagos automáticamente.')) return;
    try {
      const data = await api.request('/api/gmail/desconectar', { method: 'DELETE' });
      if (data.ok) {
        setGmailEstado({ ok: true, conectado: false, email: null });
        toast.success('Gmail desconectado');
      }
    } catch (err) {
      toast.error('Error desconectando');
    }
  };

  // ─── Funciones de pago (Wompi) ──────────────────────────
  const pagarConWompi = async (planId, planNombre) => {
    if (typeof window.WidgetCheckout !== 'function') {
      toast.error('No se pudo cargar la pasarela de pago. Recarga la página e intenta de nuevo.');
      return;
    }
    setPagandoPlan(planId);
    try {
      const data = await api.request('/api/wompi/iniciar', {
        method: 'POST',
        body: JSON.stringify({ plan: planId }),
      });
      if (!data.ok) {
        toast.error(data.error || 'No se pudo iniciar el pago');
        setPagandoPlan(null);
        return;
      }

      const checkout = new window.WidgetCheckout({
        currency: data.currency,
        amountInCents: data.amountInCents,
        reference: data.referencia,
        publicKey: data.publicKey,
        signature: { integrity: data.signature },
      });

      checkout.open(async (result) => {
        setPagandoPlan(null);
        const estado = result?.transaction?.status;
        if (estado === 'APPROVED') {
          toast.success(`¡Gracias por tu pago! Tu plan ${planNombre} ya está activo. Bienvenido de nuevo a FlashPago.`, { duration: 7000 });
          await cargarDatos();
        } else if (estado) {
          toast.error('El pago no se completó (' + estado + '). Puedes intentarlo de nuevo.');
        }
      });
    } catch (err) {
      toast.error('Error de conexión al iniciar el pago');
      setPagandoPlan(null);
    }
  };

  const iniciarTransferencia = async (planId) => {
    setCargandoTransferencia(true);
    try {
      const data = await api.request('/api/wompi/transferencia/iniciar', {
        method: 'POST',
        body: JSON.stringify({ plan: planId }),
      });
      if (!data.ok) {
        toast.error(data.error || 'No se pudo iniciar la transferencia');
        setCargandoTransferencia(false);
        return;
      }
      setTransferenciaInfo(data);
    } catch (err) {
      toast.error(err.message || 'Error de conexión al iniciar la transferencia');
    }
    setCargandoTransferencia(false);
  };

  const cerrarModalPago = () => {
    setModalPagoPlan(null);
    setTransferenciaInfo(null);
  };

  // ─── Funciones de Periodo ────────────────────────────────
  const cargarPeriodo = async () => {
    setCargandoPeriodo(true);
    const m = String(periodoMes).padStart(2, '0');
    const a = periodoAnio;
    try {
      const [resResumen, resStats, resPagos] = await Promise.all([
        api.request(`/api/dashboard/resumen-periodo?mes=${m}&anio=${a}`),
        api.request(`/api/dashboard/stats?mes=${m}&anio=${a}`),
        api.request(`/api/dashboard/pagos?mes=${m}&anio=${a}&limite=100`),
      ]);
      if (resResumen?.ok) setResumenPeriodo(resResumen);
      setStatsPeriodo(Array.isArray(resStats) ? resStats : []);
      setPagosPeriodo(Array.isArray(resPagos) ? resPagos : []);
    } catch (err) {
      console.error('Error cargando periodo:', err);
    }
    setCargandoPeriodo(false);
  };

  const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const cambiarMes = (direccion) => {
    let nuevoMes = periodoMes + direccion;
    let nuevoAnio = periodoAnio;
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++; }
    if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio--; }
    setPeriodoMes(nuevoMes);
    setPeriodoAnio(nuevoAnio);
  };

  const esMesActual = periodoMes === new Date().getMonth() + 1 && periodoAnio === new Date().getFullYear();

  // ─── Funciones de Ventas ─────────────────────────────────
  const cargarVentas = async () => {
    try {
      const [resResumen, resCierres, resSemanal, resCategorias] = await Promise.all([
        api.request('/api/ventas/resumen'),
        api.request('/api/ventas/cierres?dias=30'),
        api.request('/api/ventas/semanal'),
        api.request('/api/ventas/gastos/categorias'),
      ]);
      if (resResumen?.ok) setVentasResumen(resResumen);
      if (resCierres?.ok) setVentasCierres(resCierres.cierres || []);
      if (resSemanal?.ok) setVentasSemanal(resSemanal);
      if (resCategorias?.ok) setVentasGastosCategorias(resCategorias.categorias || []);
    } catch (err) {
      console.error('Error cargando ventas:', err);
    }
  };

  const agregarGasto = async () => {
    const monto = parseInt(gastoMonto.replace(/[.,\s]/g, ''));
    if (!monto || monto <= 0) {
      toast.error('Ingresa el monto del gasto');
      return;
    }
    if (!gastoDescripcion.trim()) {
      toast.error('Agrega una descripción del gasto');
      return;
    }
    setGuardandoGasto(true);
    try {
      const data = await api.request('/api/ventas/gasto', {
        method: 'POST',
        body: JSON.stringify({ monto, categoria: gastoCategoria, descripcion: gastoDescripcion.trim(), metodo_pago: gastoMetodo }),
      });
      if (data.ok) {
        toast.success(`Gasto de $${monto.toLocaleString('es-CO')} registrado`);
        setGastoMonto('');
        setGastoDescripcion('');
        setGastoCategoria('general');
        setGastoMetodo('efectivo');
        cargarVentas();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Error registrando gasto');
    }
    setGuardandoGasto(false);
  };

  const eliminarGastoHandler = async (id) => {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    try {
      const data = await api.request(`/api/ventas/gasto/${id}`, { method: 'DELETE' });
      if (data.ok) cargarVentas();
    } catch (err) {
      console.error('Error eliminando gasto:', err);
    }
  };

  const getCategoriaColor = (cat) => {
    const colores = {
      general: '#6B7280', insumos: '#F59E0B', nomina: '#3B82F6',
      servicios: '#8B5CF6', arriendo: '#EF4444', transporte: '#10B981', otro: '#9CA3AF',
    };
    return colores[cat] || '#6B7280';
  };

  const getCategoriaLabel = (cat) => {
    const labels = {
      general: 'General', insumos: 'Insumos', nomina: 'Nómina',
      servicios: 'Servicios', arriendo: 'Arriendo', transporte: 'Transporte', otro: 'Otro',
    };
    return labels[cat] || cat;
  };


  const statsFormateados = stats.map(s => ({
    ...s,
    fecha: s.fecha ? s.fecha.slice(0, 5) : '',
    totalK: Math.round(s.total / 1000),
  }));

  if (cargando) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh',
        background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)'
      }}>
        <div style={{ position: 'relative', width: 90, height: 90, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Inbox size={58} color="#F57C00" style={{ animation: 'bandejaImpacto 1.6s infinite' }} />
          <div style={{ position: 'absolute', animation: 'boltAtraviesa 1.6s infinite' }}>
            <Zap size={34} color="#FFA726" fill="#FFA726" strokeWidth={1.5}
              style={{ transform: 'scale(0.7, 1.3)', filter: 'drop-shadow(0 0 8px rgba(255,167,38,1)) drop-shadow(0 0 18px rgba(255,140,0,0.7))' }}
            />
          </div>
        </div>
        <h2 style={{ color: '#F57C00', fontFamily: "'Space Grotesk',sans-serif", fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          FlashPago
        </h2>
        <p style={{ color: '#b0b0c8', fontSize: '0.9rem' }}>Cargando panel...</p>
        <div style={{
          width: 200, height: 4, background: 'rgba(255,255,255,0.1)',
          borderRadius: 4, marginTop: '1.5rem', overflow: 'hidden'
        }}>
          <div style={{
            width: '40%', height: '100%', background: '#F57C00',
            borderRadius: 4, animation: 'loadingBar 1.5s infinite ease-in-out'
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="layout" data-theme={tema === 'dark' ? 'dark' : undefined}>
      <NotificacionesEnVivo onLogout={onLogout} />
      {sidebarAbierto && <div className="sidebar-overlay" onClick={() => setSidebarAbierto(false)} />}
      <Sidebar
        activeSection={seccionActiva}
        isOpen={sidebarAbierto}
        isAdmin={esAdmin}
        isSuperAdmin={esSuperAdmin}
        negocioNombre={planInfo?.nombre}
        paymentCount={totales.dia.cantidad}
        userCount={usuarios.length}
        onSectionChange={(section) => cambiarSeccion(section)}
        onLogout={onLogout}
        tema={tema}
        onToggleTema={alternarTema}
      />

      {/* MAIN CONTENT */}
      <main className="main-content">
        <DashboardHeader
          activeSection={seccionActiva}
          onToggleSidebar={() => setSidebarAbierto(!sidebarAbierto)}
        />

        <div className="main-body">
          {/* ─── PANTALLA BLOQUEADA (trial expirado) ─── */}
          {planInfo?.trial && !planInfo.trial.activo ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: '2rem',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--tint-orange-bg)', color: 'var(--tint-orange-fg)', fontSize: 11, fontWeight: 700,
                letterSpacing: 0.8, textTransform: 'uppercase', padding: '0.35rem 0.9rem',
                borderRadius: 50, marginBottom: '1.25rem',
              }}>
                <Lock size={12} /> Acceso suspendido
              </span>

              <div style={{
                width: 76, height: 76, borderRadius: '50%',
                background: 'linear-gradient(135deg, #F57C00, #E65100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.5rem', boxShadow: '0 10px 30px rgba(245,124,0,0.3)',
              }}>
                <Clock size={34} color="#fff" strokeWidth={2} />
              </div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1.7rem', fontWeight: 700, color: 'var(--dash-text)', marginBottom: '0.6rem' }}>
                {planInfo.trial.razon === 'plan_vencido' ? 'Tu plan venció' : 'Tu prueba gratuita terminó'}
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--dash-text-muted)', maxWidth: 460, lineHeight: 1.6, marginBottom: '2.5rem' }}>
                {planInfo.trial.razon === 'plan_vencido'
                  ? 'El bot dejó de verificar comprobantes y el dashboard está suspendido. Renueva tu pago para reactivar tu cuenta al instante — tu historial de pagos queda intacto.'
                  : 'El bot dejó de verificar comprobantes y el dashboard está suspendido. Elige un plan para reactivar tu cuenta al instante — tu historial de pagos queda intacto.'}
              </p>

              {/* Cards de planes */}
              <div className="planes-bloqueo-grid" style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18,
                maxWidth: 900, width: '100%', marginBottom: '2rem', alignItems: 'stretch',
              }}>
                {[
                  { id: 'basico', nombre: 'Básico', precio: '$39.900', comprobantes: '300 comprobantes/mes', Icono: Package,
                    features: ['Verificación por WhatsApp', 'IA para lectura de bancos', '300 comprobantes/mes'] },
                  { id: 'premium', nombre: 'Premium', precio: '$79.900', comprobantes: '1,000 comprobantes/mes', Icono: Rocket, popular: true,
                    features: ['Todo lo de Básico', 'Reportes diarios automáticos', 'Dashboard completo'] },
                  { id: 'premium_plus', nombre: 'Premium Plus', precio: '$109.900', comprobantes: 'Comprobantes ilimitados', Icono: Zap,
                    features: ['Todo lo de Premium', 'Comprobantes ilimitados', 'Soporte prioritario'] },
                ].map((p) => (
                  <div key={p.nombre} className={`plan-card-bloqueo ${p.popular ? 'plan-card-bloqueo-popular' : ''}`} style={{
                    display: 'flex', flexDirection: 'column',
                    border: p.popular ? `2px solid #F57C00` : '1px solid var(--dash-border)',
                    borderRadius: 18, padding: '1.75rem 1.25rem', position: 'relative',
                    background: p.popular ? 'linear-gradient(180deg, rgba(245,124,0,0.04) 0%, var(--dash-surface) 100%)' : 'var(--dash-surface)',
                    boxShadow: p.popular ? '0 12px 34px rgba(245,124,0,0.16)' : '0 4px 16px rgba(20,20,40,0.05)',
                    transform: p.popular ? 'translateY(-6px)' : 'none',
                  }}>
                    {p.popular && (
                      <div style={{
                        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                        background: '#F57C00', color: '#fff', fontSize: 11, padding: '3px 16px',
                        borderRadius: 10, fontWeight: 700, letterSpacing: 0.4,
                      }}>MÁS ELEGIDO</div>
                    )}
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, margin: '0 auto 1rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: p.popular ? '#F57C00' : 'var(--tint-orange-bg)',
                    }}>
                      <p.Icono size={21} color={p.popular ? '#fff' : '#F57C00'} strokeWidth={2} />
                    </div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--dash-text)', marginBottom: 4 }}>{p.nombre}</div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, color: 'var(--dash-text)', lineHeight: 1.2 }}>{p.precio}</div>
                    <div style={{ fontSize: 11, color: 'var(--dash-text-faint)', marginBottom: '1.1rem' }}>por mes</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.5rem', flexGrow: 1, textAlign: 'left' }}>
                      {p.features.map((f) => (
                        <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <CheckCircle size={14} color="#43A047" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: 12.5, color: 'var(--dash-text-muted)', lineHeight: 1.4 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant={p.popular ? 'primary' : 'dark'}
                      fullWidth
                      onClick={() => setModalPagoPlan(p)}
                    >
                      Activar {p.nombre}
                    </Button>
                  </div>
                ))}
              </div>

              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'var(--dash-surface-2)', borderRadius: 50, padding: '0.7rem 1.5rem',
              }}>
                <Shield size={15} color="var(--dash-text-faint)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', color: 'var(--dash-text-muted)' }}>
                  Pago seguro procesado por Wompi. Tus datos están protegidos.
                </span>
              </div>

            </div>
          ) : (
          <>
          {seccionActiva === 'duplicados' && (
            <SeccionDuplicados
              api={api}
              esAdmin={esAdmin}
              onVerFoto={setFotoActiva}
              onRevisionGuardada={cargarDatos}
            />
          )}

          {/* ─── PANEL GENERAL ────────────────────── */}
          {seccionActiva === 'panel' && (
            <>
              <div className="dashboard-intro">
                <div>
                  <h2>Buenos días, {userGuardado.nombre || userGuardado.usuario || 'Admin'} <span aria-hidden="true">👋</span></h2>
                  <p>Aquí tienes el resumen de actividad de FlashPago.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {gmailEstado && (
                    <button
                      className="btn-gmail-pill"
                      onClick={gmailEstado.conectado ? desconectarGmail : conectarGmail}
                      disabled={gmailCargando}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.35rem 0.75rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                        background: gmailEstado.conectado ? 'var(--tint-green-bg)' : 'var(--tint-orange-bg)',
                        color: gmailEstado.conectado ? 'var(--tint-green-fg)' : 'var(--tint-orange-fg)',
                        border: 'none', cursor: gmailCargando ? 'wait' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {gmailCargando ? '...' : gmailEstado.conectado ? <Wifi size={13} /> : <WifiOff size={13} />}
                      {gmailEstado.conectado ? `Gmail: ${gmailEstado.email}` : 'Conectar Gmail'}
                    </button>
                  )}
                  <div className="dashboard-live"><Activity size={15} /> Actualización automática</div>
                </div>
              </div>

              {/* ─── Primeros pasos (onboarding) ─────── */}
              {esAdmin && !onboardingOculto && (() => {
                const pasos = [
                  {
                    id: 'gmail', icon: Mail, titulo: 'Conecta tu Gmail',
                    desc: 'Verifica los pagos automáticamente comparando con las notificaciones de tu banco.',
                    hecho: !!gmailEstado?.conectado, accion: () => cambiarSeccion('panel'),
                  },
                  {
                    id: 'pago', icon: CreditCard, titulo: 'Recibe tu primer pago verificado',
                    desc: 'Pide a un empleado que envíe un comprobante por WhatsApp para probar el flujo.',
                    hecho: (totales?.mes?.cantidad || 0) > 0, accion: () => cambiarSeccion('pagos'),
                  },
                  {
                    id: 'equipo', icon: Users, titulo: 'Agrega a tu equipo',
                    desc: 'Invita a tus empleados para que puedan enviar comprobantes desde su WhatsApp.',
                    hecho: usuarios.length > 1, accion: () => cambiarSeccion('usuarios'),
                  },
                  {
                    id: 'horario', icon: Settings, titulo: 'Configura tu horario',
                    desc: 'Define cuándo cierra tu negocio para los reportes y verificaciones automáticas.',
                    hecho: configVisitada, accion: () => cambiarSeccion('configuracion'),
                  },
                ];
                const completados = pasos.filter(p => p.hecho).length;
                if (completados === pasos.length) return null;

                return (
                  <div className="seccion" style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
                      <div>
                        <h2 className="seccion-titulo" style={{ marginBottom: '0.3rem' }}><Rocket size={18} /> Primeros pasos</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--dash-text-muted)' }}>
                          {completados} de {pasos.length} completados — dejá listo tu negocio en FlashPago.
                        </p>
                      </div>
                      <button
                        onClick={ocultarOnboarding}
                        title="Ocultar"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dash-text-faint)', padding: 4, flexShrink: 0 }}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div style={{ height: 6, background: 'var(--dash-border-soft)', borderRadius: 3, marginBottom: '1.25rem', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${(completados / pasos.length) * 100}%`,
                        background: '#F57C00', borderRadius: 3, transition: 'width 0.4s ease',
                      }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.9rem' }}>
                      {pasos.map((p) => (
                        <button
                          key={p.id}
                          onClick={p.accion}
                          disabled={p.hecho}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: '0.75rem', textAlign: 'left',
                            padding: '0.9rem', borderRadius: 10, border: '1px solid var(--dash-border)',
                            background: p.hecho ? 'var(--tint-green-bg)' : 'var(--dash-surface-2)',
                            cursor: p.hecho ? 'default' : 'pointer', transition: 'all 0.2s', width: '100%',
                          }}
                        >
                          {p.hecho
                            ? <CheckCircle size={20} color="var(--tint-green-fg)" style={{ flexShrink: 0, marginTop: 1 }} />
                            : <Circle size={20} color="var(--dash-text-faint)" style={{ flexShrink: 0, marginTop: 1 }} />
                          }
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                              color: p.hecho ? 'var(--tint-green-fg)' : 'var(--dash-text)',
                              textDecoration: p.hecho ? 'line-through' : 'none',
                            }}>
                              <p.icon size={14} /> {p.titulo}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--dash-text-muted)', marginTop: 3, lineHeight: 1.4 }}>
                              {p.desc}
                            </div>
                          </div>
                          {!p.hecho && <ChevronRight size={16} color="var(--dash-text-faint)" style={{ flexShrink: 0, marginTop: 2 }} />}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ─── Banner de trial ────────────────── */}
              {planInfo?.trial && !planInfo.trial.pagado && planInfo.trial.trial_fin && (
                <div style={{
                  background: planInfo.trial.activo
                    ? planInfo.trial.dias <= 3 ? 'var(--tint-orange-bg)' : 'var(--tint-blue-bg)'
                    : 'var(--tint-red-bg)',
                  border: `1px solid ${planInfo.trial.activo
                    ? planInfo.trial.dias <= 3 ? 'var(--tint-orange-fg)' : 'var(--tint-blue-fg)'
                    : 'var(--tint-red-fg)'}`,
                  borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem',
                  display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: planInfo.trial.activo
                      ? planInfo.trial.dias <= 3 ? '#F57C00' : '#1565C0'
                      : '#E53935',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {planInfo.trial.activo
                      ? <Clock size={20} color="#fff" />
                      : <Shield size={20} color="#fff" />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{
                      fontWeight: 600, fontSize: '0.9rem',
                      color: planInfo.trial.activo
                        ? planInfo.trial.dias <= 3 ? 'var(--tint-orange-fg)' : 'var(--tint-blue-fg)'
                        : 'var(--tint-red-fg)',
                    }}>
                      {planInfo.trial.activo
                        ? `Prueba gratuita — ${planInfo.trial.dias} día${planInfo.trial.dias === 1 ? '' : 's'} restante${planInfo.trial.dias === 1 ? '' : 's'}`
                        : 'Tu prueba gratuita ha terminado'
                      }
                    </div>
                    <div style={{
                      fontSize: '0.78rem', marginTop: 2,
                      color: planInfo.trial.activo
                        ? planInfo.trial.dias <= 3 ? 'var(--tint-orange-fg)' : 'var(--tint-blue-fg)'
                        : 'var(--tint-red-fg)',
                    }}>
                      {planInfo.trial.activo
                        ? planInfo.trial.dias <= 3
                          ? 'Elige un plan para seguir verificando sin interrupción.'
                          : `Tu periodo de prueba termina el ${new Date(planInfo.trial.trial_fin).toLocaleDateString('es-CO')}. Todas las funciones están activas.`
                        : 'El bot dejó de verificar comprobantes. Elige un plan para reactivar.'
                      }
                    </div>
                    {planInfo.trial.activo && (
                      <div style={{
                        height: 4, background: 'rgba(0,0,0,0.08)', borderRadius: 2,
                        overflow: 'hidden', marginTop: 6,
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          background: planInfo.trial.dias <= 3 ? '#F57C00' : '#1565C0',
                          width: `${Math.round(((15 - planInfo.trial.dias) / 15) * 100)}%`,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    )}
                  </div>
                  {(planInfo.trial.dias <= 3 || !planInfo.trial.activo) && (
                    <Button onClick={() => setModalPagoPlan(PLANES_INFO[planInfo.plan] || PLANES_INFO.basico)}>
                      Elegir plan
                    </Button>
                  )}
                </div>
              )}

              {/* ─── Banner de plan pagado próximo a vencer ────── */}
              {planInfo?.trial?.pagado && !planInfo.trial.ilimitado && planInfo.trial.plan_vence && planInfo.trial.dias <= 5 && (
                <div style={{
                  background: 'var(--tint-orange-bg)', border: '1px solid var(--tint-orange-fg)',
                  borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem',
                  display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: '#F57C00', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Clock size={20} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--tint-orange-fg)' }}>
                      Tu plan vence en {planInfo.trial.dias} día{planInfo.trial.dias === 1 ? '' : 's'}
                    </div>
                    <div style={{ fontSize: '0.78rem', marginTop: 2, color: 'var(--tint-orange-fg)' }}>
                      Renueva antes del {new Date(planInfo.trial.plan_vence).toLocaleDateString('es-CO')} para que el bot no deje de verificar comprobantes.
                    </div>
                  </div>
                  <Button onClick={() => setModalPagoPlan(PLANES_INFO[planInfo.plan] || PLANES_INFO.basico)}>
                    Renovar plan
                  </Button>
                </div>
              )}

              {/* ─── Barra de progreso del plan ────── */}
              {planInfo && (
                <div className="plan-usage-bar" style={{
                  background: 'var(--dash-surface)', borderRadius: 12, padding: '1rem 1.25rem',
                  marginBottom: '1.25rem', border: '1px solid var(--dash-border)',
                  display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Zap size={18} color="#F57C00" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--dash-text)' }}>
                      Plan {getPlanLabel(planInfo.plan)}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div style={{
                      height: 8, background: 'var(--dash-surface-2)', borderRadius: 4, overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${Math.min(planInfo.porcentaje, 100)}%`,
                        height: '100%',
                        background: getPlanColor(planInfo.porcentaje),
                        borderRadius: 4,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.8rem', fontWeight: 600,
                    color: getPlanColor(planInfo.porcentaje),
                  }}>
                    {planInfo.usados} / {planInfo.limite} comprobantes ({planInfo.porcentaje}%)
                  </span>
                </div>
              )}

              {/* Tarjeta de conectar Gmail */}
              {gmailEstado && !gmailEstado.conectado && esAdmin && (
                <div style={{
                  background: 'var(--dash-surface)', borderRadius: 12, padding: '1rem 1.25rem',
                  marginBottom: '1.25rem', border: '2px solid var(--tint-orange-bg)',
                  display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: 'var(--tint-orange-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Mail size={22} color="var(--tint-orange-fg)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--dash-text)' }}>
                      Conecta tu Gmail para verificar pagos
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--dash-text-muted)', marginTop: 2 }}>
                      FlashPago necesita leer las notificaciones de tu banco para verificar comprobantes automáticamente.
                    </div>
                  </div>
                  <Button
                    onClick={conectarGmail}
                    loading={gmailCargando}
                    icon={<Mail size={15} />}
                  >
                    {gmailCargando ? 'Conectando...' : 'Conectar Gmail'}
                  </Button>
                </div>
              )}

              <div className="tarjetas-grid">
                <div className="tarjeta tarjeta-accent">
                  <div className="tarjeta-icon-box tarjeta-icon-naranja"><DollarSign size={22} /></div>
                  <div className="tarjeta-info">
                    <span className="tarjeta-label">Hoy</span>
                    <span className="tarjeta-valor">{formatearMonto(totales.dia.total)}</span>
                    <span className="tarjeta-sub">{totales.dia.cantidad} pagos verificados</span>
                  </div>
                </div>

                <div className="tarjeta">
                  <div className="tarjeta-icon-box tarjeta-icon-azul"><Calendar size={22} /></div>
                  <div className="tarjeta-info">
                    <span className="tarjeta-label">Últimos 30 días</span>
                    <span className="tarjeta-valor">{formatearMonto(totales.mes.total)}</span>
                    <span className="tarjeta-sub">{totales.mes.cantidad} pagos</span>
                  </div>
                </div>
                <div className="tarjeta">
                  <div className="tarjeta-icon-box tarjeta-icon-verde"><CheckCircle size={22} /></div>
                  <div className="tarjeta-info">
                    <span className="tarjeta-label">Verificados</span>
                    <span className="tarjeta-valor">{totales.mes.cantidad}</span>
                    <span className="tarjeta-sub">Tasa de éxito: —</span>
                  </div>
                </div>

                <div className="tarjeta">
                  <div className="tarjeta-icon-box tarjeta-icon-morado"><Shield size={22} /></div>
                  <div className="tarjeta-info">
                    <span className="tarjeta-label">Ticket promedio</span>
                    <span className="tarjeta-valor">
                      {totales.mes.cantidad > 0 ? formatearMonto(Math.round(totales.mes.total / totales.mes.cantidad)) : '$0'}
                    </span>
                    <span className="tarjeta-sub">Promedio por pago</span>
                  </div>
                </div>

                <div className="tarjeta" style={pendientes.cantidad > 0 ? { borderLeft: '3px solid #E53935' } : {}}>
                  <div className="tarjeta-icon-box tarjeta-icon-naranja" style={pendientes.cantidad > 0 ? { background: 'var(--tint-red-bg)' } : {}}>
                    <Clock size={22} color={pendientes.cantidad > 0 ? '#E53935' : '#F57C00'} />
                  </div>
                  <div className="tarjeta-info">
                    <span className="tarjeta-label">Pendientes</span>
                    <span className="tarjeta-valor" style={pendientes.cantidad > 0 ? { color: '#E53935' } : {}}>
                      {pendientes.cantidad}
                    </span>
                    <span className="tarjeta-sub">
                      {pendientes.cantidad > 0 ? `${formatearMonto(pendientes.total)} por verificar` : 'Todo verificado'}
                    </span>
                  </div>
                </div>
                <button
                  className="tarjeta tarjeta-clickable"
                  onClick={() => cambiarSeccion('duplicados')}
                  aria-label={`Ver ${duplicadosPendientes.length} duplicados pendientes`}
                >
                  <div className="tarjeta-icon-box tarjeta-icon-rojo">
                    <AlertTriangle size={22} />
                  </div>
                  <div className="tarjeta-info">
                    <span className="tarjeta-label">Duplicados</span>
                    <span className="tarjeta-valor">{duplicadosPendientes.length}</span>
                    <span className="tarjeta-sub">
                      {duplicadosPendientes.length > 0 ? 'Requieren revisión' : 'Ninguno pendiente'}
                    </span>
                  </div>
                </button>
              </div>

              <div className="dashboard-overview-grid">
                <div className="seccion dashboard-chart-card">
                  <div className="seccion-header">
                    <h2 className="seccion-titulo"><BarChart3 size={18} /> Ventas por día</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button onClick={() => cambiarMes(-1)} style={{
                        width: 28, height: 28, borderRadius: 8, border: '2px solid var(--dash-border)',
                        background: 'transparent', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: 'var(--dash-text-muted)',
                      }}>‹</button>
                      <div style={{
                        padding: '0.3rem 0.7rem', borderRadius: 8, background: '#F57C00',
                        color: '#fff', fontWeight: 600, fontSize: '0.75rem', minWidth: 100, textAlign: 'center',
                      }}>
                        {mesesNombres[periodoMes - 1]} {periodoAnio}
                      </div>
                      <button onClick={() => cambiarMes(1)} disabled={esMesActual} style={{
                        width: 28, height: 28, borderRadius: 8, border: '2px solid var(--dash-border)',
                        background: 'transparent', cursor: esMesActual ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', color: 'var(--dash-text-muted)', opacity: esMesActual ? 0.3 : 1,
                      }}>›</button>
                    </div>
                  </div>
                  {/* Resumen rápido del periodo */}
                  {resumenPeriodo && (
                    <div style={{
                      display: 'flex', gap: '1rem', padding: '0.5rem 0 0.75rem',
                      borderBottom: '1px solid var(--dash-border-soft)', marginBottom: '0.5rem', flexWrap: 'wrap',
                    }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--dash-text-muted)' }}>
                        Total: <strong style={{ color: 'var(--dash-text)' }}>{formatearMonto(resumenPeriodo.total)}</strong>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--dash-text-muted)' }}>
                        Pagos: <strong style={{ color: 'var(--dash-text)' }}>{resumenPeriodo.cantidad}</strong>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--dash-text-muted)' }}>
                        Promedio: <strong style={{ color: 'var(--dash-text)' }}>{formatearMonto(resumenPeriodo.ticket_promedio)}</strong>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--dash-text-muted)' }}>
                        Mejor: <strong style={{ color: '#2E7D32' }}>{formatearMonto(resumenPeriodo.pago_mas_alto)}</strong>
                      </div>
                    </div>
                  )}
                  <div className="grafica-container">
                    <Suspense fallback={<GraficaCargando alto={250} />}>
                      <VentasPorDiaChart
                        height={250}
                        data={statsPeriodo.length > 0 ? statsPeriodo.map(s => ({
                          ...s,
                          fecha: s.fecha ? s.fecha.slice(8, 10) + '/' + s.fecha.slice(5, 7) : (s.fecha || '').slice(0, 5),
                          totalK: Math.round(s.total / 1000),
                        })) : statsFormateados}
                      />
                    </Suspense>
                  </div>
                </div>
                <div className="seccion alertas-card">
                  <div className="seccion-header">
                    <h2 className="seccion-titulo"><Bell size={18} /> Alertas</h2>
                    <span className="alertas-count">{pendientes.cantidad + duplicadosPendientes.length}</span>
                  </div>
                  {pendientes.cantidad > 0 ? (
                    <div className="alerta-item alerta-item-danger">
                      <AlertTriangle size={17} />
                      <div>
                        <strong>{pendientes.cantidad} pago{pendientes.cantidad === 1 ? '' : 's'} pendiente{pendientes.cantidad === 1 ? '' : 's'}</strong>
                        <span>{formatearMonto(pendientes.total)} por verificar</span>
                      </div>
                    </div>
                  ) : duplicadosPendientes.length === 0 ? (
                    <div className="alerta-item alerta-item-success">
                      <CheckCircle size={17} />
                      <div>
                        <strong>Todo está al día</strong>
                        <span>No hay pagos pendientes</span>
                      </div>
                    </div>
                  ) : null}
                  {duplicadosPendientes.length > 0 && (
                    <div className="alerta-item alerta-item-warning">
                      <AlertTriangle size={17} />
                      <div>
                        <strong>{duplicadosPendientes.length} duplicado{duplicadosPendientes.length === 1 ? '' : 's'} detectado{duplicadosPendientes.length === 1 ? '' : 's'}</strong>
                        <span>Revisar referencias repetidas</span>
                      </div>
                    </div>
                  )}

                  {/* Alerta de plan si está cerca del límite */}
                  {planInfo && planInfo.porcentaje >= 80 && (
                    <div className="alerta-item alerta-item-warning">
                      <Zap size={17} />
                      <div>
                        <strong>Plan {getPlanLabel(planInfo.plan)} al {planInfo.porcentaje}%</strong>
                        <span>{planInfo.limite - planInfo.usados} comprobantes restantes</span>
                      </div>
                    </div>
                  )}

                  <div className="alerta-item alerta-item-info">
                    <Activity size={17} />
                    <div>
                      <strong>Monitoreo activo</strong>
                      <span>Datos sincronizados cada 30 segundos</span>
                    </div>
                  </div>
                  <button className="alertas-link" onClick={() => cambiarSeccion(pendientes.cantidad > 0 ? 'pagos' : duplicadosPendientes.length > 0 ? 'duplicados' : 'panel')}>
                    {pendientes.cantidad > 0 ? 'Revisar pagos →' : duplicadosPendientes.length > 0 ? 'Revisar duplicados →' : 'Ver actividad →'}
                  </button>
                  <button className="alertas-link alertas-link-secondary" onClick={() => cambiarSeccion('duplicados')}>
                    Ver duplicados ({duplicadosPendientes.length}) →
                  </button>
                </div>
              </div>

              <div className="seccion">
                <div className="seccion-header">
                  <h2 className="seccion-titulo"><CreditCard size={18} /> Últimos pagos</h2>
                  <button className="ver-mas-btn" onClick={() => cambiarSeccion('pagos')}>Ver todos →</button>
                </div>
                <div className="tabla-container">
                  <table className="tabla-pagos">
                    <thead><tr><th>Cliente</th><th>Monto</th><th>Banco</th><th>Hora</th></tr></thead>
                    <tbody>
                      {pagos.slice(0, 5).map((pago) => {
                        const banco = getBancoBadge(pago.banco);
                        return (
                          <tr key={pago.id}>
                            <td className="td-cliente">{pago.nombre_cliente || 'Sin nombre'}</td>
                            <td className="td-monto">{formatearMonto(pago.monto)}</td>
                            <td><span className={`banco-badge ${banco.clase}`}>{banco.nombre}</span></td>
                            <td>{pago.hora || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="seccion">
                <div className="seccion-header">
                  <h2 className="seccion-titulo"><TrendingUp size={18} /> Ventas de hoy por hora</h2>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F57C00' }}>
                    {formatearMonto(ventasPorHora.reduce((s, v) => s + v.total, 0))}
                  </span>
                </div>
                {ventasPorHora.length > 1 ? (
                  <div style={{ width: '100%', height: 190 }}>
                    <Suspense fallback={<GraficaCargando />}>
                      <VentasPorHoraChart data={ventasPorHora} />
                    </Suspense>
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: 'var(--dash-text-faint)', fontSize: '0.85rem', padding: '1.5rem 0' }}>
                    Todavía no hay ventas registradas hoy.
                  </p>
                )}
              </div>

              <div className="seccion" style={{ padding: 0, overflow: 'hidden' }}>
                <button
                  onClick={() => setVentasExpandido(!ventasExpandido)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span className="seccion-titulo" style={{ margin: 0 }}>
                    <Wallet size={18} /> Ventas y efectivo de hoy
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {ventasResumen?.cierre && (
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2E7D32' }}>
                        {formatearMonto(ventasResumen.cierre.total_ventas)}
                      </span>
                    )}
                    {ventasExpandido ? <ChevronUp size={18} color="var(--dash-text-faint)" /> : <ChevronDown size={18} color="var(--dash-text-faint)" />}
                  </div>
                </button>

                {ventasExpandido && (
                  <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--dash-border-soft)' }}>
                    {ventasResumen?.cierre ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingTop: '1rem' }}>
                        {[
                          { label: 'Total ventas', valor: ventasResumen.cierre.total_ventas, color: 'var(--dash-text)' },
                          { label: 'Transferencias', valor: ventasResumen.cierre.total_transferencias, color: '#1565C0' },
                          { label: 'Efectivo en caja', valor: ventasResumen.cierre.total_efectivo, color: '#2E7D32' },
                          { label: 'Gastos del día', valor: ventasResumen.cierre.total_gastos, color: '#E53935' },
                        ].map((item, i) => (
                          <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.5rem 0', borderBottom: i < 3 ? '1px solid var(--dash-border-soft)' : 'none',
                          }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--dash-text-muted)' }}>{item.label}</span>
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: item.color }}>{formatearMonto(item.valor)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: 'var(--dash-text-muted)', paddingTop: '1rem' }}>
                        Todavía no has registrado el cierre de caja de hoy.
                      </p>
                    )}
                    <button className="ver-mas-btn" style={{ marginTop: '0.75rem' }} onClick={() => cambiarSeccion('ventas')}>
                      Ir a Ventas →
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ─── PAGOS ───────────────────────────── */}
          {seccionActiva === 'pagos' && (
            <>
              {/* Selector de mes */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button onClick={() => cambiarMes(-1)} style={{
                    width: 36, height: 36, borderRadius: 10, border: '2px solid var(--dash-border)',
                    background: 'var(--dash-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>‹</span>
                  </button>
                  <div style={{
                    padding: '0.5rem 1.25rem', borderRadius: 10, background: '#F57C00',
                    color: '#fff', fontWeight: 700, fontSize: '0.95rem', minWidth: 160, textAlign: 'center',
                  }}>
                    {mesesNombres[periodoMes - 1]} {periodoAnio}
                  </div>
                  <button onClick={() => cambiarMes(1)} disabled={esMesActual} style={{
                    width: 36, height: 36, borderRadius: 10, border: '2px solid var(--dash-border)',
                    background: esMesActual ? 'var(--dash-surface-2)' : 'var(--dash-surface)', cursor: esMesActual ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: esMesActual ? 0.4 : 1,
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>›</span>
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--dash-text-muted)', fontWeight: 500 }}>
                    {pagosPeriodo.length} pagos — {formatearMonto(pagosPeriodo.reduce((s, p) => s + p.monto, 0))}
                  </span>
                  <button className="exportar-btn" onClick={exportarPagos}>
                    <Download size={14} /> Exportar
                  </button>
                </div>
              </div>
              <div className="seccion">
                <div className="tabla-container">
                  <table className="tabla-pagos">
                    <thead><tr><th>Cliente</th><th>Monto</th><th>Banco</th><th>Fecha</th><th>Hora</th><th>Fuente</th><th>Foto</th></tr></thead>
                    <tbody>
                      {cargandoPeriodo ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <FilaSkeleton key={`skeleton-${i}`} columnas={['75%', '55%', 60, 55, 40, 65, 30]} />
                        ))
                      ) : pagosPeriodo.length === 0 ? (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--dash-text-faint)' }}>No hay pagos en {mesesNombres[periodoMes - 1]} {periodoAnio}</td></tr>
                      ) : (
                        pagosPeriodo.map((pago) => {
                          const banco = getBancoBadge(pago.banco);
                          return (
                            <tr key={pago.id}>
                              <td className="td-cliente">{pago.nombre_cliente || 'Sin nombre'}</td>
                              <td className="td-monto">{formatearMonto(pago.monto)}</td>
                              <td><span className={`banco-badge ${banco.clase}`}>{banco.nombre}</span></td>
                              <td>{pago.fecha || '-'}</td>
                              <td>{pago.hora || '-'}</td>
                              <td>
                                <span className={`fuente-badge ${pago.fuente === 'gmail_nocturna' ? 'fuente-nocturna' : 'fuente-gmail'}`}>
                                  {pago.fuente === 'gmail_nocturna' ? <><Moon size={11} /> asincronica</> : <><Mail size={11} /> Gmail</>}
                                </span>
                              </td>
                              <td>
                                {pago.foto ? (
                                  <button className="ver-foto-btn" onClick={() => setFotoActiva(pago.foto)}><Eye size={13} /> Ver</button>
                                ) : (<span className="sin-foto">—</span>)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ─── ESTADÍSTICAS ────────────────────── */}
          {seccionActiva === 'estadisticas' && (
            <>
              {/* Selector de mes */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button onClick={() => cambiarMes(-1)} style={{
                    width: 36, height: 36, borderRadius: 10, border: '2px solid var(--dash-border)',
                    background: 'var(--dash-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>‹</span>
                  </button>
                  <div style={{
                    padding: '0.5rem 1.25rem', borderRadius: 10, background: '#F57C00',
                    color: '#fff', fontWeight: 700, fontSize: '0.95rem', minWidth: 160, textAlign: 'center',
                  }}>
                    {mesesNombres[periodoMes - 1]} {periodoAnio}
                  </div>
                  <button onClick={() => cambiarMes(1)} disabled={esMesActual} style={{
                    width: 36, height: 36, borderRadius: 10, border: '2px solid var(--dash-border)',
                    background: esMesActual ? 'var(--dash-surface-2)' : 'var(--dash-surface)', cursor: esMesActual ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: esMesActual ? 0.4 : 1,
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>›</span>
                  </button>
                </div>
              </div>

              {/* Cards del periodo */}
              <div className="tarjetas-grid">
                {cargandoPeriodo ? (
                  <>
                    <TarjetaSkeleton />
                    <TarjetaSkeleton />
                    <TarjetaSkeleton />
                    <TarjetaSkeleton />
                  </>
                ) : (
                  <>
                    <div className="tarjeta tarjeta-accent">
                      <div className="tarjeta-icon-box tarjeta-icon-naranja"><DollarSign size={22} /></div>
                      <div className="tarjeta-info">
                        <span className="tarjeta-label">Total {mesesNombres[periodoMes - 1]}</span>
                        <span className="tarjeta-valor">{formatearMonto(resumenPeriodo?.total || 0)}</span>
                        <span className="tarjeta-sub">{resumenPeriodo?.cantidad || 0} transacciones</span>
                      </div>
                    </div>
                    <div className="tarjeta">
                      <div className="tarjeta-icon-box tarjeta-icon-azul"><BarChart3 size={22} /></div>
                      <div className="tarjeta-info">
                        <span className="tarjeta-label">Promedio diario</span>
                        <span className="tarjeta-valor">
                          {resumenPeriodo?.dias_con_ventas > 0 ? formatearMonto(Math.round(resumenPeriodo.total / resumenPeriodo.dias_con_ventas)) : '$0'}
                        </span>
                        <span className="tarjeta-sub">{resumenPeriodo?.dias_con_ventas || 0} días con ventas</span>
                      </div>
                    </div>
                    <div className="tarjeta">
                      <div className="tarjeta-icon-box tarjeta-icon-verde"><Trophy size={22} /></div>
                      <div className="tarjeta-info">
                        <span className="tarjeta-label">Pago más alto</span>
                        <span className="tarjeta-valor">
                          {formatearMonto(resumenPeriodo?.pago_mas_alto || 0)}
                        </span>
                        <span className="tarjeta-sub">En una sola transacción</span>
                      </div>
                    </div>
                    <div className="tarjeta">
                      <div className="tarjeta-icon-box tarjeta-icon-morado"><Shield size={22} /></div>
                      <div className="tarjeta-info">
                        <span className="tarjeta-label">Ticket promedio</span>
                        <span className="tarjeta-valor">
                          {formatearMonto(resumenPeriodo?.ticket_promedio || 0)}
                        </span>
                        <span className="tarjeta-sub">Por transacción</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Gráfica del periodo */}
              <div className="seccion" style={{ marginBottom: '1.25rem' }}>
                <div className="seccion-header">
                  <h2 className="seccion-titulo"><TrendingUp size={18} /> Ventas por día — {mesesNombres[periodoMes - 1]} {periodoAnio}</h2>
                </div>
                {cargandoPeriodo ? (
                  <div className="grafica-container">
                    <div className="skeleton-block" style={{ width: '100%', height: '100%' }} />
                  </div>
                ) : statsPeriodo.length === 0 ? (
                  <p className="empty-state">No hay ventas registradas en este mes.</p>
                ) : (
                  <div className="grafica-container">
                    <Suspense fallback={<GraficaCargando alto={300} />}>
                      <VentasPorDiaChart
                        height={300}
                        data={statsPeriodo.map(s => ({
                          ...s,
                          fecha: s.fecha ? s.fecha.slice(8, 10) + '/' + s.fecha.slice(5, 7) : '',
                          totalK: Math.round(s.total / 1000),
                        }))}
                      />
                    </Suspense>
                  </div>
                )}
              </div>

              {/* Bancos más usados */}
              {resumenPeriodo?.bancos?.length > 0 && (
                <div className="seccion">
                  <h2 className="seccion-titulo"><CreditCard size={18} /> Bancos más usados</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem' }}>
                    {resumenPeriodo.bancos.map((b) => {
                      const max = Math.max(...resumenPeriodo.bancos.map(x => x.total));
                      const pct = max > 0 ? Math.round((b.total / max) * 100) : 0;
                      const banco = getBancoBadge(b.banco);
                      return (
                        <div key={b.banco}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                              <span className={`banco-badge ${banco.clase}`} style={{ marginRight: '0.4rem' }}>{banco.nombre}</span>
                              {b.cantidad} pagos
                            </span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                              {formatearMonto(b.total)}
                            </span>
                          </div>
                          <div style={{ height: 8, background: 'var(--dash-surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`, height: '100%', background: '#F57C00',
                              borderRadius: 4, transition: 'width 0.5s ease',
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── BUSCAR ──────────────────────────── */}
          {seccionActiva === 'buscar' && <SeccionBuscar api={api} />}

          {/* ─── EXPORTAR ────────────────────────── */}
          {seccionActiva === 'exportar' && (
            <div className="seccion exportar-seccion">
              <div className="exportar-card">
                <div className="exportar-icon-box"><Download size={32} color="#F57C00" /></div>
                <h2>Exportar pagos a Excel</h2>
                <p>Descarga un archivo con todos los pagos de los últimos 30 días. Se abre en Excel, Google Sheets o cualquier programa de hojas de cálculo.</p>
                <button className="exportar-btn" onClick={exportarPagos}>
                  <Download size={14} /> Exportar Excel
                </button>
              </div>
            </div>
          )}

          {/* ─── VENTAS (Cierre de Caja) ────────── */}
          {seccionActiva === 'ventas' && (
            <>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {[
                  { id: 'hoy', label: 'Hoy', icon: <Receipt size={15} /> },
                  { id: 'historial', label: 'Historial', icon: <Calendar size={15} /> },
                  { id: 'gastos', label: 'Gastos', icon: <MinusCircle size={15} /> },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setVentasTab(tab.id)} style={{
                    padding: '0.5rem 1rem', borderRadius: 10, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600,
                    background: ventasTab === tab.id ? '#F57C00' : 'var(--dash-surface-2)',
                    color: ventasTab === tab.id ? '#fff' : 'var(--dash-text-muted)',
                  }}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* ── TAB: HOY ──────────────────────────── */}
              {ventasTab === 'hoy' && (
                <>
                  {/* Cards resumen del día */}
                  <div className="tarjetas-grid">
                    {!ventasResumen ? (
                      <>
                        <TarjetaSkeleton />
                        <TarjetaSkeleton />
                        <TarjetaSkeleton />
                        <TarjetaSkeleton />
                      </>
                    ) : (
                      <>
                        <div className="tarjeta tarjeta-accent">
                          <div className="tarjeta-icon-box tarjeta-icon-naranja"><ArrowDownUp size={22} /></div>
                          <div className="tarjeta-info">
                            <span className="tarjeta-label">Transferencias hoy</span>
                            <span className="tarjeta-valor">{formatearMonto(ventasResumen?.transferencias?.total || 0)}</span>
                            <span className="tarjeta-sub">{ventasResumen?.transferencias?.cantidad || 0} verificadas</span>
                          </div>
                        </div>
                        <div className="tarjeta">
                          <div className="tarjeta-icon-box tarjeta-icon-rojo"><MinusCircle size={22} /></div>
                          <div className="tarjeta-info">
                            <span className="tarjeta-label">Gastos hoy</span>
                            <span className="tarjeta-valor" style={{ color: '#E53935' }}>{formatearMonto(ventasResumen?.gastos?.total || 0)}</span>
                            <span className="tarjeta-sub">{ventasResumen?.gastos?.cantidad || 0} registrados</span>
                          </div>
                        </div>
                        <div className="tarjeta">
                          <div className="tarjeta-icon-box tarjeta-icon-verde"><Wallet size={22} /></div>
                          <div className="tarjeta-info">
                            <span className="tarjeta-label">Efectivo esperado</span>
                            <span className="tarjeta-valor" style={{ color: '#43A047' }}>
                              {ventasResumen?.cierre
                                ? formatearMonto(ventasResumen.cierre.total_efectivo)
                                : '—'}
                            </span>
                            <span className="tarjeta-sub">{ventasResumen?.cierre ? 'Cierre registrado' : 'Sin cierre aún'}</span>
                          </div>
                        </div>
                        <div className="tarjeta">
                          <div className="tarjeta-icon-box tarjeta-icon-morado"><ShoppingBag size={22} /></div>
                          <div className="tarjeta-info">
                            <span className="tarjeta-label">Total ventas</span>
                            <span className="tarjeta-valor">
                              {ventasResumen?.cierre
                                ? formatearMonto(ventasResumen.cierre.total_ventas)
                                : '—'}
                            </span>
                            <span className="tarjeta-sub">{ventasResumen?.cierre ? 'Del cierre de caja' : 'Pendiente de cierre'}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="dashboard-overview-grid">
                    {/* Cierre de caja */}
                    <div className="seccion dashboard-chart-card">
                      <div className="seccion-header">
                        <h2 className="seccion-titulo"><Receipt size={18} /> Cierre de caja</h2>
                      </div>
                      <CierreCaja
                        resumen={ventasResumen}
                        api={api}
                        esAdmin={esAdmin}
                        onGuardado={() => { cargarVentas(); cargarDatos(); }}
                      />
                    </div>

                    {/* Gastos rápidos */}
                    <div className="seccion alertas-card">
                      <div className="seccion-header">
                        <h2 className="seccion-titulo"><MinusCircle size={18} /> Registrar gasto</h2>
                      </div>
                      <div style={{ marginBottom: '0.6rem' }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Monto ($)"
                          value={formatearMiles(gastoMonto)}
                          onChange={(e) => setGastoMonto(soloDigitos(e.target.value))}
                          style={{
                            width: '100%', padding: '0.55rem 0.8rem', borderRadius: 8,
                            border: '2px solid var(--dash-border)', fontSize: '0.95rem', fontWeight: 600,
                            outline: 'none', marginBottom: '0.5rem', boxSizing: 'border-box',
                          }}
                        />
                        <select
                          value={gastoCategoria}
                          onChange={(e) => setGastoCategoria(e.target.value)}
                          style={{
                            width: '100%', padding: '0.5rem 0.8rem', borderRadius: 8,
                            border: '2px solid var(--dash-border)', fontSize: '0.85rem',
                            outline: 'none', marginBottom: '0.5rem', background: 'var(--dash-surface)', boxSizing: 'border-box',
                          }}
                        >
                          <option value="general">General</option>
                          <option value="insumos">Insumos</option>
                          <option value="nomina">Nómina</option>
                          <option value="servicios">Servicios</option>
                          <option value="arriendo">Arriendo</option>
                          <option value="transporte">Transporte</option>
                          <option value="otro">Otro</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Descripción del gasto"
                          value={gastoDescripcion}
                          onChange={(e) => setGastoDescripcion(e.target.value)}
                          style={{
                            width: '100%', padding: '0.55rem 0.8rem', borderRadius: 8,
                            border: '2px solid var(--dash-border)', fontSize: '0.85rem',
                            outline: 'none', marginBottom: '0.6rem', boxSizing: 'border-box',
                          }}
                        />
                        {/* Solo lo pagado en efectivo sale del cajón, así que
                            define si el gasto se resta del cierre. */}
                        <div className="gasto-metodo">
                          <button
                            type="button"
                            aria-pressed={gastoMetodo === 'efectivo'}
                            onClick={() => setGastoMetodo('efectivo')}
                          >
                            Pagué en efectivo
                          </button>
                          <button
                            type="button"
                            aria-pressed={gastoMetodo === 'transferencia'}
                            onClick={() => setGastoMetodo('transferencia')}
                          >
                            Por transferencia
                          </button>
                        </div>
                        <button
                          className="btn-registrar-gasto"
                          disabled={guardandoGasto || !gastoMonto || !gastoDescripcion.trim()}
                          onClick={agregarGasto}
                          style={{
                            width: '100%', padding: '0.6rem', borderRadius: 8, border: 'none',
                            background: gastoMonto && gastoDescripcion.trim() ? '#E53935' : 'var(--dash-surface-2)',
                            color: gastoMonto && gastoDescripcion.trim() ? '#fff' : 'var(--dash-text-faint)',
                            fontWeight: 600, fontSize: '0.85rem', cursor: gastoMonto ? 'pointer' : 'default',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                          }}
                        >
                          {guardandoGasto
                            ? <span className="fp-btn__spinner" style={{ width: 15, height: 15 }} aria-hidden="true" />
                            : <PlusCircle size={15} />}
                          {guardandoGasto ? 'Guardando...' : 'Registrar gasto'}
                        </button>
                      </div>

                      {/* Lista de gastos de hoy */}
                      {ventasResumen?.gastos?.lista?.length > 0 && (
                        <div style={{ borderTop: '1px solid var(--dash-border-soft)', paddingTop: '0.6rem', marginTop: '0.3rem' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--dash-text-faint)', fontWeight: 600, marginBottom: '0.4rem' }}>
                            GASTOS DE HOY
                          </div>
                          {ventasResumen.gastos.lista.map((g) => (
                            <div key={g.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '0.4rem 0', borderBottom: '1px solid var(--dash-border-soft)',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                  width: 8, height: 8, borderRadius: '50%',
                                  background: getCategoriaColor(g.categoria), flexShrink: 0,
                                }} />
                                <div>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{g.descripcion}</div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--dash-text-faint)' }}>
                                    {getCategoriaLabel(g.categoria)}
                                    {' · '}
                                    {(g.metodo_pago || 'efectivo') === 'transferencia' ? 'Transferencia' : 'Efectivo'}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E53935' }}>
                                  -{formatearMonto(g.monto)}
                                </span>
                                {esAdmin && (
                                  <button onClick={() => eliminarGastoHandler(g.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--dash-text-faint)' }}>
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ── TAB: HISTORIAL ────────────────────── */}
              {ventasTab === 'historial' && (
                <>
                  {/* Resumen semanal cards */}
                  {!ventasResumen ? (
                    <div className="tarjetas-grid">
                      <TarjetaSkeleton />
                      <TarjetaSkeleton />
                      <TarjetaSkeleton />
                      <TarjetaSkeleton />
                    </div>
                  ) : ventasSemanal && (
                    <div className="tarjetas-grid">
                      <div className="tarjeta tarjeta-accent">
                        <div className="tarjeta-icon-box tarjeta-icon-naranja"><ShoppingBag size={22} /></div>
                        <div className="tarjeta-info">
                          <span className="tarjeta-label">Ventas (7 días)</span>
                          <span className="tarjeta-valor">{formatearMonto(ventasSemanal.totales?.ventas || 0)}</span>
                          <span className="tarjeta-sub">{ventasSemanal.dias?.length || 0} cierres</span>
                        </div>
                      </div>
                      <div className="tarjeta">
                        <div className="tarjeta-icon-box tarjeta-icon-azul"><ArrowDownUp size={22} /></div>
                        <div className="tarjeta-info">
                          <span className="tarjeta-label">Transferencias</span>
                          <span className="tarjeta-valor">{formatearMonto(ventasSemanal.totales?.transferencias || 0)}</span>
                          <span className="tarjeta-sub">Verificadas en la semana</span>
                        </div>
                      </div>
                      <div className="tarjeta">
                        <div className="tarjeta-icon-box tarjeta-icon-verde"><Wallet size={22} /></div>
                        <div className="tarjeta-info">
                          <span className="tarjeta-label">Efectivo</span>
                          <span className="tarjeta-valor" style={{ color: '#43A047' }}>{formatearMonto(ventasSemanal.totales?.efectivo || 0)}</span>
                          <span className="tarjeta-sub">Total en caja</span>
                        </div>
                      </div>
                      <div className="tarjeta">
                        <div className="tarjeta-icon-box tarjeta-icon-rojo"><MinusCircle size={22} /></div>
                        <div className="tarjeta-info">
                          <span className="tarjeta-label">Gastos</span>
                          <span className="tarjeta-valor" style={{ color: '#E53935' }}>{formatearMonto(ventasSemanal.totales?.gastos || 0)}</span>
                          <span className="tarjeta-sub">En la semana</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Gráfica semanal */}
                  {ventasSemanal?.dias?.length > 0 && (
                    <div className="seccion" style={{ marginBottom: '1.25rem' }}>
                      <h2 className="seccion-titulo"><BarChart3 size={18} /> Ventas vs Efectivo (7 días)</h2>
                      <div className="grafica-container">
                        <Suspense fallback={<GraficaCargando alto={260} />}>
                          <VentasVsEfectivoChart dias={ventasSemanal.dias} />
                        </Suspense>
                      </div>
                    </div>
                  )}

                  {/* Tabla historial */}
                  <div className="seccion">
                    <div className="seccion-header">
                      <h2 className="seccion-titulo"><Calendar size={18} /> Historial de cierres</h2>
                      <span style={{ fontSize: '0.8rem', color: 'var(--dash-text-faint)' }}>{ventasCierres.length} cierres</span>
                    </div>
                    {!ventasResumen ? (
                      <div className="tabla-container">
                        <table className="tabla-pagos">
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Ventas</th>
                              <th>Transferencias</th>
                              <th>Efectivo</th>
                              <th>Gastos</th>
                              <th>Cerrado por</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <FilaSkeleton key={`skeleton-${i}`} columnas={[70, '55%', '55%', '55%', '45%', '50%']} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : ventasCierres.length === 0 ? (
                      <p className="empty-state">No hay cierres registrados aún.</p>
                    ) : (
                      <div className="tabla-container">
                        <table className="tabla-pagos">
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Ventas</th>
                              <th>Transferencias</th>
                              <th>Efectivo</th>
                              <th>Gastos</th>
                              <th>Cerrado por</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ventasCierres.map((c) => (
                              <tr key={c.id}>
                                <td style={{ fontWeight: 500 }}>{c.fecha}</td>
                                <td className="td-monto">{formatearMonto(c.total_ventas)}</td>
                                <td style={{ color: '#1565C0' }}>{formatearMonto(c.total_transferencias)}</td>
                                <td style={{ color: '#2E7D32', fontWeight: 600 }}>{formatearMonto(c.total_efectivo)}</td>
                                <td style={{ color: '#E53935' }}>{c.total_gastos > 0 ? `-${formatearMonto(c.total_gastos)}` : '$0'}</td>
                                <td style={{ fontSize: '0.8rem' }}>{c.cerrado_por || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── TAB: GASTOS ───────────────────────── */}
              {ventasTab === 'gastos' && (
                <>
                  {/* Gastos por categoría */}
                  {ventasGastosCategorias.length > 0 && (
                    <>
                      <div className="tarjetas-grid" style={{ gridTemplateColumns: 'minmax(0, 320px)' }}>
                        <div className="tarjeta tarjeta-accent">
                          <div className="tarjeta-icon-box tarjeta-icon-rojo"><MinusCircle size={22} /></div>
                          <div className="tarjeta-info">
                            <span className="tarjeta-label">Total gastos (30 días)</span>
                            <span className="tarjeta-valor" style={{ color: '#E53935' }}>
                              {formatearMonto(ventasGastosCategorias.reduce((s, c) => s + c.total, 0))}
                            </span>
                            <span className="tarjeta-sub">{ventasGastosCategorias.reduce((s, c) => s + c.cantidad, 0)} gastos</span>
                          </div>
                        </div>
                      </div>

                      <div className="seccion">
                        <h2 className="seccion-titulo"><BarChart3 size={18} /> Gastos por categoría (30 días)</h2>
                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '1rem' }}>
                          <div style={{ position: 'relative', width: 190, height: 190, flexShrink: 0, margin: '0 auto' }}>
                            <Suspense fallback={<GraficaCargando />}>
                              <GastosPorCategoriaChart
                                categorias={ventasGastosCategorias}
                                getColor={getCategoriaColor}
                                getLabel={getCategoriaLabel}
                              />
                            </Suspense>
                            <div style={{
                              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                              textAlign: 'center', pointerEvents: 'none',
                            }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--dash-text-faint)' }}>Total</div>
                              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#E53935' }}>
                                {formatearMonto(ventasGastosCategorias.reduce((s, c) => s + c.total, 0))}
                              </div>
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {ventasGastosCategorias.map((cat) => {
                              const totalGeneral = ventasGastosCategorias.reduce((s, c) => s + c.total, 0);
                              const pct = totalGeneral > 0 ? Math.round((cat.total / totalGeneral) * 100) : 0;
                              return (
                                <div key={cat.categoria} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: getCategoriaColor(cat.categoria), flexShrink: 0 }} />
                                    {getCategoriaLabel(cat.categoria)}
                                  </span>
                                  <span style={{ fontSize: '0.85rem', textAlign: 'right' }}>
                                    <strong style={{ color: 'var(--dash-text)' }}>{formatearMonto(cat.total)}</strong>{' '}
                                    <span style={{ color: 'var(--dash-text-faint)' }}>({pct}% · {cat.cantidad})</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {ventasGastosCategorias.length === 0 && (
                    <div className="seccion">
                      <p className="empty-state">No hay gastos registrados en los últimos 30 días.</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ─── USUARIOS ────────────────────────── */}
          {seccionActiva === 'usuarios' && <SeccionUsuarios api={api} />}

          {/* ─── CONFIGURACIÓN ──────────────────── */}
          {seccionActiva === 'configuracion' && (
            <>
            <div className="seccion">
              <div className="seccion-header">
                <h2 className="seccion-titulo"><Settings size={18} /> Horario de operación</h2>
              </div>


              {cargandoConfig ? (
                <div style={{ maxWidth: 480 }}>
                  <span className="skeleton-bar" style={{ width: '100%', height: '0.9rem', marginBottom: 6 }} />
                  <span className="skeleton-bar" style={{ width: '85%', height: '0.9rem', marginBottom: '1.5rem' }} />

                  <span className="skeleton-bar" style={{ width: 140, marginBottom: '0.5rem' }} />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <span key={i} className="skeleton-block" style={{ width: 44, height: 38, borderRadius: 10 }} />
                    ))}
                  </div>

                  <span className="skeleton-bar" style={{ width: 160, marginBottom: '0.5rem' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.5rem' }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <span key={i} className="skeleton-block" style={{ width: '100%', height: 40, borderRadius: 10 }} />
                    ))}
                  </div>

                  <span className="skeleton-block" style={{ width: 190, height: 40, borderRadius: 10, display: 'block' }} />
                </div>
              ) : (
                <div style={{ maxWidth: 480 }}>
                  <p style={{ color: 'var(--dash-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                    Define qué días opera tu negocio y a qué hora cierra cada uno (puede variar, por ejemplo
                    cerrar más tarde el fin de semana). El bot usa esta información para saber cuándo hacer
                    las verificaciones nocturnas de pagos y enviar el reporte diario.
                  </p>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--dash-text-muted)', marginBottom: '0.5rem' }}>
                      Días de operación
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {DIAS_SEMANA.map((d) => {
                        const activo = diasOperacion.includes(d.valor);
                        return (
                          <button
                            key={d.valor}
                            type="button"
                            className="dia-chip"
                            onClick={() => alternarDia(d.valor)}
                            style={{
                              border: activo ? '2px solid #F57C00' : '2px solid var(--dash-border)',
                              background: activo ? 'var(--tint-orange-bg)' : 'var(--dash-surface)',
                              color: activo ? '#F57C00' : 'var(--dash-text-faint)',
                            }}
                          >
                            {d.corto}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--dash-text-muted)' }}>
                        Hora de cierre por día
                      </label>
                      <button
                        type="button"
                        onClick={() => aplicarHoraATodos(horaCierre[diasOperacion[0]] || '21:00')}
                        style={{
                          background: 'none', border: 'none', color: '#F57C00', fontSize: '0.8rem',
                          fontWeight: 600, cursor: 'pointer', padding: 0,
                        }}
                      >
                        Usar la misma hora todos los días
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {DIAS_SEMANA.filter((d) => diasOperacion.includes(d.valor)).map((d) => (
                        <div key={d.valor} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ width: 40, fontSize: '0.85rem', color: 'var(--dash-text-muted)', fontWeight: 600 }}>{d.corto}</span>
                          <input
                            type="time"
                            value={horaCierre[d.valor] || '21:00'}
                            onChange={(e) => cambiarHoraCierreDia(d.valor, e.target.value)}
                            style={{
                              padding: '0.6rem 0.9rem', border: '2px solid var(--dash-border)', borderRadius: 10,
                              fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit',
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--dash-text-faint)', marginTop: '0.6rem' }}>
                      Las verificaciones se hacen a esa hora y una hora después; el reporte diario se envía junto con la segunda verificación.
                    </p>
                  </div>

                  <Button onClick={guardarConfiguracion} loading={guardandoConfig} icon={<Save size={15} />}>
                    {guardandoConfig ? 'Guardando...' : 'Guardar configuración'}
                  </Button>
                </div>
              )}
            </div>

            {/* ─── Gmail ──────────────────────────── */}
            <div className="seccion">
              <div className="seccion-header">
                <h2 className="seccion-titulo"><Mail size={18} /> Verificación por Gmail</h2>
              </div>
              <p style={{ color: 'var(--dash-text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.6, maxWidth: 520 }}>
                La cuenta de Gmail conectada es la que el bot revisa para confirmar pagos por notificación del banco.
              </p>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                padding: '1rem 1.2rem', borderRadius: 12,
                background: gmailEstado?.conectado ? 'var(--tint-green-bg)' : 'var(--tint-orange-bg)',
                border: `1px solid ${gmailEstado?.conectado ? 'var(--tint-green-fg)' : 'var(--tint-orange-fg)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {gmailEstado?.conectado ? <Wifi size={18} color="var(--tint-green-fg)" /> : <WifiOff size={18} color="var(--tint-orange-fg)" />}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: gmailEstado?.conectado ? 'var(--tint-green-fg)' : 'var(--tint-orange-fg)' }}>
                      {gmailEstado?.conectado ? 'Gmail conectado' : 'Gmail no conectado'}
                    </div>
                    {gmailEstado?.conectado && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--dash-text-muted)' }}>{gmailEstado.email}</div>
                    )}
                  </div>
                </div>
                <button
                  className={gmailEstado?.conectado ? 'usuario-btn-cancelar' : 'usuario-btn-guardar'}
                  onClick={gmailEstado?.conectado ? desconectarGmail : conectarGmail}
                  disabled={gmailCargando}
                >
                  {gmailCargando ? 'Conectando...' : gmailEstado?.conectado ? <><X size={15} /> Desconectar</> : <><Mail size={15} /> Conectar Gmail</>}
                </button>
              </div>
              {!gmailEstado?.conectado && (
                <div style={{
                  display: 'flex', gap: 10, marginTop: '0.9rem',
                  padding: '0.9rem 1.1rem', borderRadius: 10,
                  background: 'var(--tint-orange-bg)', border: '1px solid var(--tint-orange-fg)',
                }}>
                  <AlertTriangle size={16} color="var(--tint-orange-fg)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: '0.83rem', color: 'var(--tint-orange-fg)', lineHeight: 1.6, margin: 0 }}>
                    Elige la cuenta que te avisa cuando te pagan — sin la corriente correcta,
                    tu <strong>rayo</strong> no tiene cómo avisarte.
                  </p>
                </div>
              )}
            </div>

            {/* ─── Voz de notificaciones ────────────── */}
            <div className="seccion">
              <div className="seccion-header">
                <h2 className="seccion-titulo"><Volume2 size={18} /> Voz de las notificaciones</h2>
              </div>
              <p style={{ color: 'var(--dash-text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.6, maxWidth: 520 }}>
                Cuando llega un pago verificado, el dashboard lo anuncia en voz alta. Elige qué voz usar
                (depende de las voces instaladas en este computador) y pruébala antes de guardarla.
              </p>
              {vocesDisponibles.length === 0 ? (
                <p style={{ color: 'var(--dash-text-faint)', fontSize: '0.85rem' }}>
                  Este navegador no tiene voces disponibles. Se usará la voz por defecto del sistema.
                </p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <select
                    value={vozSeleccionada}
                    onChange={(e) => seleccionarVoz(e.target.value)}
                    style={{
                      padding: '0.7rem 1rem', border: '2px solid var(--dash-border)', borderRadius: 10,
                      fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', minWidth: 260,
                    }}
                  >
                    <option value="">Voz por defecto del sistema</option>
                    {vocesDisponibles.map((v) => (
                      <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                  <button type="button" className="usuario-btn-guardar" onClick={probarVoz}>
                    <Volume2 size={15} /> Probar voz
                  </button>
                </div>
              )}
            </div>

            {/* ─── Zona de peligro ────────────────── */}
            <div className="seccion" style={{ border: '1px solid #FFCDD2' }}>
              <div className="seccion-header">
                <h2 className="seccion-titulo" style={{ color: '#C62828' }}><AlertTriangle size={18} /> Zona de peligro</h2>
              </div>
              <p style={{ color: 'var(--dash-text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.6, maxWidth: 520 }}>
                Eliminar tu cuenta desactiva tu negocio y a todos sus usuarios de inmediato. El bot deja de verificar
                pagos y nadie podrá volver a iniciar sesión. Tu historial de pagos se conserva.
              </p>
              <button className="btn-peligro" onClick={eliminarNegocio}>
                <Trash2 size={15} /> Eliminar mi cuenta
              </button>
            </div>
            </>
          )}

          {/* ─── NEGOCIOS (superadmin) ────────────── */}
          {seccionActiva === 'negocios' && (
            <>
              <div className="tarjetas-grid">
                <div className="tarjeta tarjeta-accent">
                  <div className="tarjeta-icon-box tarjeta-icon-naranja"><Building2 size={22} /></div>
                  <div className="tarjeta-info">
                    <span className="tarjeta-label">Total negocios</span>
                    <span className="tarjeta-valor">{negocios.length}</span>
                    <span className="tarjeta-sub">Registrados</span>
                  </div>
                </div>
                <div className="tarjeta">
                  <div className="tarjeta-icon-box tarjeta-icon-verde"><CheckCircle size={22} /></div>
                  <div className="tarjeta-info">
                    <span className="tarjeta-label">Pagando</span>
                    <span className="tarjeta-valor">{negocios.filter(n => n.pagado).length}</span>
                    <span className="tarjeta-sub">Con plan activo</span>
                  </div>
                </div>
                <div className="tarjeta">
                  <div className="tarjeta-icon-box tarjeta-icon-azul"><Clock size={22} /></div>
                  <div className="tarjeta-info">
                    <span className="tarjeta-label">En trial</span>
                    <span className="tarjeta-valor">{negocios.filter(n => !n.pagado && n.trial_fin && new Date(n.trial_fin) >= new Date()).length}</span>
                    <span className="tarjeta-sub">Prueba gratuita</span>
                  </div>
                </div>
                <div className="tarjeta">
                  <div className="tarjeta-icon-box tarjeta-icon-morado"><Mail size={22} /></div>
                  <div className="tarjeta-info">
                    <span className="tarjeta-label">Gmail conectado</span>
                    <span className="tarjeta-valor">{negocios.filter(n => n.gmail_conectado).length}</span>
                    <span className="tarjeta-sub">Verificación activa</span>
                  </div>
                </div>
              </div>


              <div className="seccion">
                <div className="seccion-header">
                  <h2 className="seccion-titulo"><Building2 size={18} /> Negocios de la plataforma</h2>
                  {!mostrarFormNegocio && (
                    <button className="exportar-btn" onClick={() => { setMostrarFormNegocio(true); setEditandoNegocio(null); setFormNegocio({ nombre: '', whatsapp: '', plan: 'basico' }); }}>
                      <Building2 size={14} /> Nuevo negocio
                    </button>
                  )}
                </div>

                {mostrarFormNegocio && (
                  <div className="usuario-form">
                    <h3 className="usuario-form-titulo">
                      {editandoNegocio ? <><Edit size={16} /> Editar negocio</> : <><Building2 size={16} /> Crear nuevo negocio</>}
                    </h3>
                    <div className="usuario-form-grid">
                      <div className="usuario-form-campo">
                        <label>Nombre del negocio</label>
                        <input type="text" placeholder="Ej: Pizzería Don Mario" value={formNegocio.nombre} onChange={(e) => setFormNegocio({ ...formNegocio, nombre: e.target.value })} />
                      </div>
                      <div className="usuario-form-campo">
                        <label>WhatsApp (opcional)</label>
                        <input type="text" placeholder="Ej: 573001234567" value={formNegocio.whatsapp} onChange={(e) => setFormNegocio({ ...formNegocio, whatsapp: e.target.value })} />
                      </div>
                      <div className="usuario-form-campo">
                        <label>Plan</label>
                        <select value={formNegocio.plan} onChange={(e) => setFormNegocio({ ...formNegocio, plan: e.target.value })}>
                          <option value="basico">Básico (300/mes)</option>
                          <option value="premium">Premium (1,000/mes)</option>
                          <option value="premium_plus">Premium Plus (ilimitado)</option>
                        </select>
                      </div>
                    </div>
                    {editandoNegocio && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: '1rem', fontSize: '0.85rem', color: 'var(--dash-text-muted)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formNegocio.plan_ilimitado}
                          onChange={(e) => setFormNegocio({ ...formNegocio, plan_ilimitado: e.target.checked })}
                        />
                        Plan ilimitado (nunca vence, sin importar pagos ni trial — para cuentas internas)
                      </label>
                    )}
                    <div className="usuario-form-acciones">
                      <button className="usuario-btn-guardar" onClick={editandoNegocio ? actualizarNegocio : crearNegocio}>
                        <Save size={15} /> {editandoNegocio ? 'Guardar cambios' : 'Crear negocio'}
                      </button>
                      <button className="usuario-btn-cancelar" onClick={cancelarFormNegocio}>
                        <X size={15} /> Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {cargandoNegocios ? (
                  <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--dash-text-faint)' }}>Cargando negocios...</p>
                ) : (
                  <div className="tabla-container">
                    <table className="tabla-pagos">
                      <thead>
                        <tr>
                          <th>Negocio</th>
                          <th>Plan</th>
                          <th>Estado</th>
                          <th>Uso del plan</th>
                          <th>Gmail</th>
                          <th>Estado cuenta</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {negocios.map(n => {
                          const estado = estadoNegocioInfo(n);
                          const porcentaje = n.limite_comprobantes ? Math.min(100, Math.round((n.comprobantes_usados / n.limite_comprobantes) * 100)) : 0;
                          return (
                            <tr key={n.id} style={!n.activo ? { opacity: 0.5 } : {}}>
                              <td className="td-cliente">{n.nombre}</td>
                              <td>
                                <span className="banco-badge badge-otro">{getPlanLabel(n.plan)}</span>
                              </td>
                              <td>
                                <span className={`banco-badge ${estado.clase}`}>{estado.label}</span>
                              </td>
                              <td style={{ minWidth: 140 }}>
                                <div style={{ height: 6, background: 'var(--dash-surface-2)', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                                  <div style={{ width: `${porcentaje}%`, height: '100%', background: getPlanColor(porcentaje), borderRadius: 4 }} />
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--dash-text-faint)' }}>
                                  {n.comprobantes_usados} / {n.limite_comprobantes === 999999 ? '∞' : n.limite_comprobantes}
                                </span>
                              </td>
                              <td>
                                {n.gmail_conectado ? (
                                  <span className="fuente-badge fuente-gmail" title={n.gmail_email}><MailCheck size={11} /> Conectado</span>
                                ) : (
                                  <span className="sin-foto">Sin conectar</span>
                                )}
                              </td>
                              <td>
                                <span className={`fuente-badge ${n.activo ? 'fuente-gmail' : 'fuente-nocturna'}`}>
                                  {n.activo ? <><UserCheck size={11} /> Activo</> : <><UserX size={11} /> Inactivo</>}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <button className="ver-foto-btn" onClick={() => iniciarEdicionNegocio(n)} title="Editar">
                                    <Edit size={13} />
                                  </button>
                                  <button
                                    className="ver-foto-btn"
                                    onClick={() => alternarActivoNegocio(n)}
                                    title={n.activo ? 'Desactivar' : 'Reactivar'}
                                    style={{ color: n.activo ? '#E53935' : '#43A047' }}
                                  >
                                    {n.activo ? <Trash2 size={13} /> : <UserCheck size={13} />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          </>
          )}

        </div>
      </main>

      {/* MODAL DE FOTO */}
      {fotoActiva && (
        <div className="modal-overlay" onClick={() => setFotoActiva(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setFotoActiva(null)}><X size={16} /></button>
            <img src={`/api/comprobantes/${fotoActiva}?token=${localStorage.getItem('fp_token')}`} alt="Comprobante" />
          </div>
        </div>
      )}

      {/* MODAL DE PAGO/RENOVACIÓN DE PLAN — disponible desde cualquier vista */}
      {modalPagoPlan && (
        <div onClick={cerrarModalPago} style={{
          position: 'fixed', inset: 0, background: 'rgba(20,20,40,0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--dash-surface)', borderRadius: 18, padding: '1.75rem',
            width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--dash-text)' }}>
                  Activar {modalPagoPlan.nombre}
                </div>
                <div style={{ fontSize: 13, color: 'var(--dash-text-faint)' }}>{modalPagoPlan.precio} / mes</div>
              </div>
              <button onClick={cerrarModalPago} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} color="var(--dash-text-faint)" />
              </button>
            </div>

            {!transferenciaInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  className="fp-option-btn"
                  onClick={() => { cerrarModalPago(); pagarConWompi(modalPagoPlan.id, modalPagoPlan.nombre); }}
                  disabled={pagandoPlan === modalPagoPlan.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '0.9rem 1rem',
                    borderRadius: 12, border: '1px solid var(--dash-border)', background: 'var(--dash-surface-2)',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {pagandoPlan === modalPagoPlan.id
                    ? <span className="fp-btn__spinner" style={{ color: '#F57C00', width: 20, height: 20 }} aria-hidden="true" />
                    : <CreditCard size={20} color="#F57C00" />}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--dash-text)' }}>PSE / Tarjeta</div>
                    <div style={{ fontSize: 12, color: 'var(--dash-text-faint)' }}>
                      {pagandoPlan === modalPagoPlan.id ? 'Abriendo pasarela...' : 'Pago inmediato con Wompi'}
                    </div>
                  </div>
                </button>

                <button
                  className="fp-option-btn"
                  onClick={() => iniciarTransferencia(modalPagoPlan.id)}
                  disabled={cargandoTransferencia}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '0.9rem 1rem',
                    borderRadius: 12, border: '2px solid #F57C00',
                    background: 'linear-gradient(135deg, rgba(245,124,0,0.08), rgba(245,124,0,0.02))',
                    cursor: 'pointer', textAlign: 'left',
                    position: 'relative', boxShadow: '0 4px 16px rgba(245,124,0,0.12)',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: -10, right: 14, background: '#F57C00', color: '#fff',
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
                    padding: '2px 10px', borderRadius: 50,
                  }}>
                    Recomendado
                  </div>
                  {cargandoTransferencia
                    ? <span className="fp-btn__spinner" style={{ color: '#F57C00', width: 20, height: 20 }} aria-hidden="true" />
                    : <Building2 size={20} color="#F57C00" />}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--dash-text)' }}>Transferencia bancaria</div>
                    <div style={{ fontSize: 12, color: 'var(--dash-text-faint)' }}>
                      {cargandoTransferencia ? 'Generando datos...' : 'Nequi, Bancolombia u otro banco'}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#F57C00', fontWeight: 600, marginTop: 3 }}>
                      Sin comisiones · Confirmación automática
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--dash-text-muted)' }}>
                  Transfiere <strong>${transferenciaInfo.montoPesos.toLocaleString('es-CO')}</strong> a esta cuenta:
                </div>

                <img
                  src="/qr-flashpago.jpeg"
                  alt="QR para pagar con Bre-B / Bancolombia"
                  style={{ width: '100%', maxWidth: 260, alignSelf: 'center', borderRadius: 12, display: 'block' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />

                <div style={{
                  background: 'var(--dash-surface-2)', borderRadius: 12, padding: '1rem',
                  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5,
                }}>
                  {transferenciaInfo.cuenta.banco && <div><strong>Banco:</strong> {transferenciaInfo.cuenta.banco}</div>}
                  {transferenciaInfo.cuenta.tipo && <div><strong>Tipo:</strong> {transferenciaInfo.cuenta.tipo}</div>}
                  {transferenciaInfo.cuenta.numero && <div><strong>Número:</strong> {transferenciaInfo.cuenta.numero}</div>}
                  {transferenciaInfo.cuenta.titular && <div><strong>Titular:</strong> {transferenciaInfo.cuenta.titular}</div>}
                  {transferenciaInfo.cuenta.nit && <div><strong>NIT:</strong> {transferenciaInfo.cuenta.nit}</div>}
                </div>
                <div style={{
                  background: 'var(--tint-orange-bg)', borderRadius: 12, padding: '0.9rem 1rem', fontSize: 13, color: 'var(--dash-text)',
                }}>
                  Después de transferir, envía la <strong>foto del comprobante</strong> por WhatsApp al{' '}
                  <strong>+{transferenciaInfo.whatsapp}</strong>. El sistema lo lee y activa tu plan automáticamente —
                  tenés 30 minutos.
                </div>
                <button onClick={() => setTransferenciaInfo(null)} style={{
                  alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--dash-text-faint)',
                  fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline', padding: 0,
                }}>
                  ← Volver a las opciones de pago
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;