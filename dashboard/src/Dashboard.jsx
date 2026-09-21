import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, TrendingUp, DollarSign, Calendar, CheckCircle, Shield, BarChart3, X, Mail, Users, UserX, UserCheck, Edit, Trash2, Save, AlertTriangle, Clock, Bell, Activity, Zap, Wifi, WifiOff, Wallet, Settings, Building2, MailCheck, ChevronDown, ChevronUp, Volume2, Package, Rocket, Lock, Inbox, Circle, ChevronRight, RefreshCw } from 'lucide-react';
import { createApiClient } from './services/api';
import Sidebar from './components/Sidebar';
import DashboardHeader from './components/DashboardHeader';
import NotificacionesEnVivo from './components/NotificacionesEnVivo';
import IndicadorActualizacion from './components/IndicadorActualizacion';
import Button from './components/ui/Button';
import ModalConfirmacion from './components/ModalConfirmacion';
import ModalConfirmarWhatsapp from './components/ModalConfirmarWhatsapp';
import { FilaSkeleton, TarjetaSkeleton } from './components/ui/Skeleton';
import SeccionBuscar from './secciones/SeccionBuscar';
import SeccionUsuarios from './secciones/SeccionUsuarios';
import SeccionDuplicados from './secciones/SeccionDuplicados';
import SeccionPagos from './secciones/SeccionPagos';
import SeccionEstadisticas from './secciones/SeccionEstadisticas';
import SeccionExportar from './secciones/SeccionExportar';
import SeccionVentas from './secciones/SeccionVentas';
import { useUsuarios } from './hooks/useUsuarios';
import { formatearMonto } from './utils/formato';
import { getBancoBadge, getPlanLabel, getPlanColor } from './utils/bancos';
import { permisoNotificaciones, pedirPermisoNotificaciones } from './utils/notificaciones';

// Recharts pesa ~366 KB: se carga solo cuando el usuario abre una sección
// que realmente muestra una gráfica, no al entrar al dashboard.
const VentasPorDiaChart = lazy(() => import('./components/charts/VentasPorDiaChart'));
const VentasPorHoraChart = lazy(() => import('./components/charts/VentasPorHoraChart'));

import GraficaCargando from './components/GraficaCargando';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

// "contacto@vinsonburgers.com" -> "co•••••@vinsonburgers.com" — se ve que hay
// una cuenta conectada sin exponer la direccion completa en pantalla.
function enmascararEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [usuario, dominio] = email.split('@');
  const visible = usuario.slice(0, Math.min(2, usuario.length));
  return `${visible}${'•'.repeat(Math.max(3, usuario.length - visible.length))}@${dominio}`;
}

const PLANES_INFO = {
  basico: { id: 'basico', nombre: 'Básico', precio: '$39.900' },
  premium: { id: 'premium', nombre: 'Premium', precio: '$79.900' },
  premium_plus: { id: 'premium_plus', nombre: 'Premium Plus', precio: '$109.900' },
};

// Precios anuales de lanzamiento (25/30/35% off sobre 12 meses sueltos, hasta
// 4.2 meses gratis en Premium Plus). Deben coincidir con PRECIOS_CENTAVOS en
// db.js — si cambian ahí, cambian aquí también.
const PLANES_PRECIOS = [
  { id: 'basico', nombre: 'Básico', Icono: Package, precioMensual: 39900, precioAnual: 359000,
    features: ['Verificación por WhatsApp', 'IA para lectura de bancos', '300 comprobantes/mes'] },
  { id: 'premium', nombre: 'Premium', Icono: Rocket, popular: true, precioMensual: 79900, precioAnual: 669000,
    features: ['Todo lo de Básico', 'Reportes diarios automáticos', 'Dashboard completo'] },
  { id: 'premium_plus', nombre: 'Premium Plus', Icono: Zap, precioMensual: 109900, precioAnual: 859000,
    features: ['Todo lo de Premium', 'Comprobantes ilimitados', 'Soporte prioritario'] },
];

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
  // Historial para la campana del header (antes se perdía al desaparecer
  // el toast a los 5s). En memoria, tope de 20.
  const [historialNotificaciones, setHistorialNotificaciones] = useState([]);
  const agregarNotificacion = (n) => {
    setHistorialNotificaciones((prev) => [
      { id: Date.now() + Math.random(), leida: false, fecha: new Date(), ...n },
      ...prev,
    ].slice(0, 20));
  };
  const marcarNotificacionesLeidas = () => {
    setHistorialNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  };
  // Ligado al negocio (no al navegador): sin esto, ocultar el checklist en
  // una cuenta lo dejaba oculto para siempre en ese navegador, sin importar
  // a qué otro negocio entraras después.
  const [onboardingOculto, setOnboardingOculto] = useState(false);
  const [configVisitada, setConfigVisitada] = useState(() => {
    try { return localStorage.getItem('fp_config_visitada') === '1'; } catch { return false; }
  });
  const ocultarOnboarding = () => {
    setOnboardingOculto(true);
    try { if (planInfo?.id) localStorage.setItem(`fp_onboarding_oculto_${planInfo.id}`, '1'); } catch { /* no disponible */ }
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
  // Lunes primero (orden natural en Colombia) aunque el valor numerico siga
  // el de Date.getDay() (0 = domingo) porque asi lo espera el resto del backend.
  const DIAS_SEMANA = [
    { valor: 1, corto: 'Lun', nombre: 'Lunes' }, { valor: 2, corto: 'Mar', nombre: 'Martes' },
    { valor: 3, corto: 'Mié', nombre: 'Miércoles' }, { valor: 4, corto: 'Jue', nombre: 'Jueves' },
    { valor: 5, corto: 'Vie', nombre: 'Viernes' }, { valor: 6, corto: 'Sáb', nombre: 'Sábado' },
    { valor: 0, corto: 'Dom', nombre: 'Domingo' },
  ];
  const [horaCierre, setHoraCierre] = useState({ 0: '21:00', 1: '21:00', 2: '21:00', 3: '21:00', 4: '21:00', 5: '21:00', 6: '21:00' });
  const [diasOperacion, setDiasOperacion] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [cargandoConfig, setCargandoConfig] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [modalEliminarCuenta, setModalEliminarCuenta] = useState(false);
  const [eliminandoCuenta, setEliminandoCuenta] = useState(false);
  const [holdEliminarProgreso, setHoldEliminarProgreso] = useState(0);
  const holdEliminarRef = useRef(null);

  // Modal genérico que reemplaza window.confirm(). `pedirConfirmacion`
  // guarda la acción a ejecutar; el modal la dispara si confirma.
  const [confirmacion, setConfirmacion] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const pedirConfirmacion = ({ titulo, descripcion, textoConfirmar, peligro, accion }) => {
    setConfirmacion({ titulo, descripcion, textoConfirmar, peligro, accion });
  };
  const ejecutarConfirmacion = async () => {
    if (!confirmacion) return;
    setConfirmando(true);
    try {
      await confirmacion.accion();
    } finally {
      setConfirmando(false);
      setConfirmacion(null);
    }
  };

  // ─── Avisos del sistema operativo ──────────────────────
  const [permisoAvisos, setPermisoAvisos] = useState(() => permisoNotificaciones());
  const activarAvisos = async () => {
    const resultado = await pedirPermisoNotificaciones();
    setPermisoAvisos(resultado);
    if (resultado === 'granted') {
      toast.success('Listo, te avisaremos aunque el panel no esté al frente');
    } else if (resultado === 'denied') {
      toast.error('El navegador bloqueó los avisos');
    }
  };

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
  const [botEstado, setBotEstado] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [errorActualizacion, setErrorActualizacion] = useState(false);
  const [gmailCargando, setGmailCargando] = useState(false);
  const [modalPagoPlan, setModalPagoPlan] = useState(null);
  // Arranca en Anual: es el precio de lanzamiento que queremos que la gente
  // vea primero. Puede cambiar a Mensual con el interruptor si prefiere.
  const [facturacionAnual, setFacturacionAnual] = useState(true);

  // ─── Método de pago ───────────────────────────────────────
  const [metodoPago, setMetodoPago] = useState(null); // null = sin tarjeta guardada
  const [cargandoMetodoPago, setCargandoMetodoPago] = useState(true);
  const [renovarAutomatico, setRenovarAutomatico] = useState(false);
  const [cambiandoAuto, setCambiandoAuto] = useState(false);
  const [modalTarjeta, setModalTarjeta] = useState(false);
  const [guardandoTarjeta, setGuardandoTarjeta] = useState(false);
  const [formTarjeta, setFormTarjeta] = useState({ numero: '', titular: '', mes: '', anio: '', cvc: '' });
  // Turnstile solo tras varios intentos fallidos (lo decide el backend,
  // ver requiereCaptchaTarjeta en routes/wompi.js).
  const [requiereCaptcha, setRequiereCaptcha] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const turnstileContenedorRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);
  const [transferenciaInfo, setTransferenciaInfo] = useState(null);
  const [cargandoTransferencia, setCargandoTransferencia] = useState(false);
  const [confirmacionWpp, setConfirmacionWpp] = useState({ abierto: false, waLink: '', confirmado: false });

  // Detectar redirect de Gmail OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailResult = params.get('gmail');
    if (gmailResult === 'conectado') {
      // Limpiar URL
      const url = new URL(window.location.href);
      url.searchParams.delete('gmail');
      window.history.replaceState({}, '', url.toString());

      // Gmail solo no basta: falta el paso obligatorio de confirmar el
      // WhatsApp (ver bot/confirmacionWhatsapp.js).
      api.request('/api/whatsapp/preparar-confirmacion', { method: 'POST' })
        .then((data) => {
          if (data.ok) setConfirmacionWpp({ abierto: true, waLink: data.waLink, confirmado: false });
        })
        .catch(() => {
          toast.success('¡Gracias por conectar! Todo quedó correcto, ya puedes verificar pagos de tu banco.', { duration: 6000 });
          // zIndex por encima del modal (1000, ver ModalConfirmarWhatsapp.jsx):
          // el default de canvas-confetti es 100, quedaría tapado detrás.
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, zIndex: 1100 });
        });
    } else if (gmailResult === 'error') {
      toast.error('Error conectando Gmail. Intenta de nuevo.');
      const url = new URL(window.location.href);
      url.searchParams.delete('gmail');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Mientras el modal de confirmación esté abierto y sin confirmar, pregunta
  // cada 3s si ya llegó el mensaje de WhatsApp.
  useEffect(() => {
    if (!confirmacionWpp.abierto || confirmacionWpp.confirmado) return;
    const intervalo = setInterval(async () => {
      try {
        const data = await api.request('/api/whatsapp/estado-confirmacion');
        if (data.ok && data.confirmado) {
          setConfirmacionWpp((prev) => ({ ...prev, confirmado: true }));
          toast.success('¡Cuenta configurada! Ya tu bot puede recibir transferencias.', { duration: 6000 });
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, zIndex: 1100 });
        }
      } catch (err) { /* reintenta en el próximo intervalo */ }
    }, 3000);
    return () => clearInterval(intervalo);
  }, [confirmacionWpp.abierto, confirmacionWpp.confirmado]);

  // ─── Estado para Ventas (cierre de caja) ───────────────
  // ventasResumen se queda acá porque Panel también lo muestra; el resto
  // del estado de Ventas (tabs, gastos, historial) vive en SeccionVentas.
  const [ventasResumen, setVentasResumen] = useState(null);
  const [ventasExpandido, setVentasExpandido] = useState(false);
  const [estadisticasExpandido, setEstadisticasExpandido] = useState(false);

  // ─── Estado para filtro por periodo ────────────────────
  // periodoDia: null = se ve el mes completo; con número, un día puntual
  // (comparte mes/año con el resto, no es un estado aparte).
  const [periodoMes, setPeriodoMes] = useState(new Date().getMonth() + 1);
  const [periodoAnio, setPeriodoAnio] = useState(new Date().getFullYear());
  const [periodoDia, setPeriodoDia] = useState(null);
  const [resumenPeriodo, setResumenPeriodo] = useState(null);
  const [statsPeriodo, setStatsPeriodo] = useState([]);
  const [cargandoPeriodo, setCargandoPeriodo] = useState(false);

  const api = useMemo(() => createApiClient(onLogout), [onLogout]);
  const queryClient = useQueryClient();

  // ─── Negocios (superadmin) — ensayo con TanStack Query ─
  const { data: negocios = [], isLoading: cargandoNegocios } = useQuery({
    queryKey: ['negocios'],
    queryFn: () => api.request('/api/negocios').then((d) => (d.ok ? d.negocios || [] : [])),
    enabled: seccionActiva === 'negocios',
  });

  // SeccionUsuarios administra los usuarios; acá solo se leen para el badge
  // del sidebar y el paso de onboarding (misma queryKey compartida).
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
    // En segundo plano no se pide cada 30s (gasta batería sin motivo);
    // al volver refresca de inmediato.
    const intervalo = setInterval(() => {
      if (!document.hidden) cargarDatos();
    }, 30000);
    const alVolver = () => { if (!document.hidden) cargarDatos(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [diasGrafica, api]);

  useEffect(() => {
    if (seccionActiva === 'configuracion') {
      cargarConfiguracion();
      cargarMetodoPago();
    }
  }, [seccionActiva]);

  useEffect(() => {
    if (seccionActiva === 'estadisticas' || seccionActiva === 'pagos' || seccionActiva === 'panel') cargarPeriodo();
  }, [seccionActiva, periodoMes, periodoAnio, periodoDia]);

  const cargarDatos = async () => {
    try {
      const [resTotales, resPagos, resStats, resPendientes, resDuplicados, resPlan, resGmail, resVentasHora, resVentasResumen, resBot] = await Promise.all([
        api.request('/api/dashboard/totales'),
        api.request('/api/dashboard/pagos?limite=20'),
        api.request(`/api/dashboard/stats?dias=${diasGrafica}`),
        api.request('/api/dashboard/pendientes'),
        api.request('/api/dashboard/duplicados?estado=PENDIENTE'),
        api.request('/api/negocios/uso/plan').catch(() => null),
        api.request('/api/gmail/estado').catch(() => null),
        api.request('/api/dashboard/ventas-hoy-por-hora').catch(() => null),
        api.request('/api/ventas/resumen').catch(() => null),
        api.request('/api/bot/estado').catch(() => null),
      ]);

      setTotales(resTotales || { dia: { total: 0, cantidad: 0 }, mes: { total: 0, cantidad: 0 } });
      setPagos(Array.isArray(resPagos) ? resPagos : []);
      setStats(Array.isArray(resStats) ? resStats : []);
      setPendientes(resPendientes || { cantidad: 0, total: 0 });
      setDuplicadosPendientes(Array.isArray(resDuplicados) ? resDuplicados : []);
      if (resPlan?.ok) {
        setPlanInfo(resPlan);
        try { setOnboardingOculto(localStorage.getItem(`fp_onboarding_oculto_${resPlan.id}`) === '1'); } catch { /* no disponible */ }
      }
      if (resGmail?.ok) setGmailEstado(resGmail);
      if (resBot?.ok) setBotEstado(resBot);
      if (resVentasHora?.ok) setVentasPorHora(resVentasHora.datos);
      if (resVentasResumen?.ok) setVentasResumen(resVentasResumen);
      setUltimaActualizacion(Date.now());
      setErrorActualizacion(false);
      setCargando(false);
    } catch (err) {
      console.error('Error cargando datos:', err);
      // No se toca ultimaActualizacion: el indicador debe seguir mostrando
      // de cuándo son los datos que estás viendo, no la hora del fallo.
      setErrorActualizacion(true);
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

  // ─── Resumen legible del horario (para la tarjeta de arriba) ──
  const formatearHora12 = (hhmm) => {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const periodo = h >= 12 ? 'p.m.' : 'a.m.';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${periodo}`;
  };

  const diasActivosOrdenados = () => DIAS_SEMANA.filter((d) => diasOperacion.includes(d.valor));

  const listaDias = (diasObjs) => {
    const nombres = diasObjs.map((d) => d.nombre.toLowerCase());
    if (nombres.length === 1) return nombres[0];
    return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  };

  const resumenHorario = () => {
    if (diasOperacion.length === 0) return 'Selecciona al menos un día de operación.';
    const horas = [...new Set(diasOperacion.map((d) => horaCierre[d] || '21:00'))].sort();
    const cierre = horas.length === 1
      ? `cierra a las ${formatearHora12(horas[0])}`
      : `cierra entre las ${formatearHora12(horas[0])} y las ${formatearHora12(horas[horas.length - 1])}`;
    const dias = diasOperacion.length === 7 ? 'todos los días' : `los ${listaDias(diasActivosOrdenados())}`;
    return `Abierto ${dias}, ${cierre}`;
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

  // ─── Funciones de método de pago ───────────────────────
  const cargarMetodoPago = async () => {
    setCargandoMetodoPago(true);
    try {
      const data = await api.request('/api/wompi/metodo-pago');
      if (data.ok) {
        setMetodoPago(data.metodo);
        setRenovarAutomatico(data.renovarAutomatico);
        setRequiereCaptcha(Boolean(data.requiereCaptcha));
        setTurnstileSiteKey(data.turnstileSiteKey || null);
      }
    } catch (err) {
      // Silencioso: sin Wompi configurado el endpoint da 503 y la sección
      // simplemente no muestra tarjeta.
    }
    setCargandoMetodoPago(false);
  };

  // Tarjeta tokenizada EN EL NAVEGADOR contra Wompi: número y CVV nunca
  // pasan por nuestro servidor, solo el token.
  // Reinicia Turnstile tras fallo: el token es de un solo uso.
  const reiniciarCaptcha = () => {
    setCaptchaToken(null);
    if (turnstileWidgetIdRef.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
  };

  const guardarTarjeta = async ({ numero, mes, anio, cvc, titular }) => {
    if (requiereCaptcha && !captchaToken) {
      toast.error('Resuelve la verificación de seguridad');
      return false;
    }
    setGuardandoTarjeta(true);
    try {
      const cfg = await api.request('/api/wompi/config');
      if (!cfg.ok) {
        toast.error('Wompi no está configurado todavía');
        return false;
      }

      const [tokenRes, aceptacion] = await Promise.all([
        fetch(`${cfg.apiUrl}/tokens/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.publicKey}` },
          body: JSON.stringify({
            number: numero.replace(/\s+/g, ''),
            exp_month: mes.padStart(2, '0'),
            exp_year: anio.length === 4 ? anio.slice(-2) : anio,
            cvc,
            card_holder: titular,
          }),
        }).then((r) => r.json()),
        api.request('/api/wompi/aceptacion'),
      ]);

      const datosTarjeta = tokenRes?.data;
      if (!datosTarjeta?.id) {
        toast.error(tokenRes?.error?.reason || 'No pudimos validar la tarjeta. Revisa los datos.');
        reiniciarCaptcha();
        return false;
      }
      if (!aceptacion.ok || !aceptacion.acceptanceToken || !aceptacion.personalAuthToken) {
        toast.error('No se pudo contactar a Wompi. Intenta de nuevo.');
        reiniciarCaptcha();
        return false;
      }

      const guardado = await api.request('/api/wompi/metodo-pago', {
        method: 'POST',
        body: JSON.stringify({
          token: datosTarjeta.id,
          acceptanceToken: aceptacion.acceptanceToken,
          personalAuthToken: aceptacion.personalAuthToken,
          marca: datosTarjeta.brand || null,
          ultimos4: datosTarjeta.last_four || numero.replace(/\s+/g, '').slice(-4),
          expMes: mes.padStart(2, '0'),
          expAnio: anio.length === 4 ? anio.slice(-2) : anio,
          captchaToken,
        }),
      });
      if (!guardado.ok) {
        toast.error(guardado.error || 'No se pudo guardar la tarjeta');
        reiniciarCaptcha();
        // Por si el fallo cruzó el umbral de captcha en el backend.
        await cargarMetodoPago();
        return false;
      }

      toast.success('Tarjeta guardada');
      await cargarMetodoPago();
      return true;
    } catch (err) {
      // api.request lanza en no-2xx: el mensaje real del backend viaja en
      // err.message (si no, un 400 se veía como "error de conexión" genérico).
      toast.error(err?.message || 'Error de conexión con Wompi');
      reiniciarCaptcha();
      // Por si el fallo cruzó el umbral de captcha en el backend.
      await cargarMetodoPago();
      return false;
    } finally {
      setGuardandoTarjeta(false);
    }
  };

  const quitarTarjeta = () => {
    pedirConfirmacion({
      titulo: '¿Quitar la tarjeta guardada?',
      descripcion: 'Se desactivará también la renovación automática.',
      textoConfirmar: 'Quitar tarjeta',
      accion: quitarTarjetaConfirmado,
    });
  };

  const quitarTarjetaConfirmado = async () => {
    try {
      const data = await api.request('/api/wompi/metodo-pago', { method: 'DELETE' });
      if (data.ok) {
        setMetodoPago(null);
        setRenovarAutomatico(false);
        toast.success('Tarjeta eliminada');
      } else {
        toast.error(data.error || 'Error eliminando la tarjeta');
      }
    } catch (err) {
      toast.error('Error de conexión');
    }
  };

  const alternarRenovarAutomatico = async () => {
    const nuevo = !renovarAutomatico;
    setCambiandoAuto(true);
    try {
      const data = await api.request('/api/wompi/metodo-pago/auto', {
        method: 'PATCH',
        body: JSON.stringify({ activo: nuevo }),
      });
      if (data.ok) {
        setRenovarAutomatico(nuevo);
      } else {
        toast.error(data.error || 'No se pudo cambiar la renovación automática');
      }
    } catch (err) {
      toast.error('Error de conexión');
    }
    setCambiandoAuto(false);
  };

  // Monta Turnstile solo si el modal está abierto, el backend pidió captcha
  // y hay site key. Script cacheado; widget se limpia al cerrar el modal.
  useEffect(() => {
    if (!modalTarjeta || !requiereCaptcha || !turnstileSiteKey) return;

    let cancelado = false;
    const montar = () => {
      if (cancelado || !turnstileContenedorRef.current || !window.turnstile) return;
      turnstileWidgetIdRef.current = window.turnstile.render(turnstileContenedorRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token) => setCaptchaToken(token),
        'error-callback': () => setCaptchaToken(null),
        'expired-callback': () => setCaptchaToken(null),
      });
    };

    if (window.turnstile) {
      montar();
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = montar;
      document.head.appendChild(script);
    }

    return () => {
      cancelado = true;
      if (turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
      }
      turnstileWidgetIdRef.current = null;
      setCaptchaToken(null);
    };
  }, [modalTarjeta, requiereCaptcha, turnstileSiteKey]);

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
    setEliminandoCuenta(true);
    try {
      const data = await api.request('/api/negocio', { method: 'DELETE' });
      if (data.ok) {
        onLogout();
      } else {
        toast.error(data.error || 'No se pudo eliminar la cuenta');
        setEliminandoCuenta(false);
      }
    } catch (err) {
      toast.error('Error de conexión');
      setEliminandoCuenta(false);
    }
  };

  // Eliminar cuenta pide mantener presionado ~1.8s (barra 0-100), no un
  // clic — se cancela si sueltas antes de llenarla.
  const DURACION_HOLD_ELIMINAR = 1800;
  const iniciarHoldEliminar = (e) => {
    if (eliminandoCuenta || holdEliminarRef.current) return;
    e.preventDefault();
    const inicio = performance.now();
    const tick = (ahora) => {
      const pct = Math.min(100, ((ahora - inicio) / DURACION_HOLD_ELIMINAR) * 100);
      setHoldEliminarProgreso(pct);
      if (pct >= 100) {
        holdEliminarRef.current = null;
        eliminarNegocio();
        return;
      }
      holdEliminarRef.current = requestAnimationFrame(tick);
    };
    holdEliminarRef.current = requestAnimationFrame(tick);
  };
  const cancelarHoldEliminar = () => {
    if (holdEliminarRef.current) {
      cancelAnimationFrame(holdEliminarRef.current);
      holdEliminarRef.current = null;
    }
    setHoldEliminarProgreso(0);
  };

  const exportarPagos = async (mes, anio) => {
    try {
      const query = mes && anio ? `?mes=${mes}&anio=${anio}` : '';
      const blob = await api.download('/exportar' + query);
      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = mes && anio
        ? `pagos-${mesesNombres[mes - 1].toLowerCase()}-${anio}.csv`
        : 'pagos.csv';
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
      const data = await api.request('/api/gmail/auth-url');
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

  const desconectarGmail = () => {
    pedirConfirmacion({
      titulo: '¿Desconectar Gmail?',
      descripcion: 'El bot no podrá verificar pagos automáticamente.',
      textoConfirmar: 'Desconectar',
      accion: desconectarGmailConfirmado,
    });
  };

  const desconectarGmailConfirmado = async () => {
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
    const d = periodoDia ? `&dia=${String(periodoDia).padStart(2, '0')}` : '';
    try {
      const [resResumen, resStats] = await Promise.all([
        api.request(`/api/dashboard/resumen-periodo?mes=${m}&anio=${a}${d}`),
        api.request(`/api/dashboard/stats?mes=${m}&anio=${a}${d}`),
      ]);
      if (resResumen?.ok) setResumenPeriodo(resResumen);
      setStatsPeriodo(Array.isArray(resStats) ? resStats : []);
    } catch (err) {
      console.error('Error cargando periodo:', err);
    }
    setCargandoPeriodo(false);
  };

  const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Suma/resta un mes (diciembre↔enero incluido); la usan periodoMes,
  // gastosMes y exportarMes con sus propios estados.
  const sumarMes = (mes, anio, direccion) => {
    let nuevoMes = mes + direccion;
    let nuevoAnio = anio;
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++; }
    if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio--; }
    return { mes: nuevoMes, anio: nuevoAnio };
  };

  const esMesActualGenerico = (mes, anio) => mes === new Date().getMonth() + 1 && anio === new Date().getFullYear();

  const cambiarMes = (direccion) => {
    const { mes, anio } = sumarMes(periodoMes, periodoAnio, direccion);
    setPeriodoMes(mes);
    setPeriodoAnio(anio);
    setPeriodoDia(null);
  };

  // Handler unificado para SelectorMesCalendario (Estadísticas y Pagos):
  // dia llega null cuando se elige "ver todo el mes".
  const cambiarPeriodo = (mes, anio, dia) => {
    setPeriodoMes(mes);
    setPeriodoAnio(anio);
    setPeriodoDia(dia || null);
  };

  const esMesActual = esMesActualGenerico(periodoMes, periodoAnio);


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
      <NotificacionesEnVivo onLogout={onLogout} onNotificacion={agregarNotificacion} />
      {sidebarAbierto && <div className="sidebar-overlay" onClick={() => setSidebarAbierto(false)} />}
      <Sidebar
        activeSection={seccionActiva}
        isOpen={sidebarAbierto}
        isAdmin={esAdmin}
        isSuperAdmin={esSuperAdmin}
        negocioNombre={planInfo?.nombre}
        planInfo={planInfo}
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
          sidebarAbierto={sidebarAbierto}
          onToggleSidebar={() => setSidebarAbierto(!sidebarAbierto)}
          notificaciones={historialNotificaciones}
          onAbrirNotificaciones={marcarNotificacionesLeidas}
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

              {/* Mensual / Anual — precio de lanzamiento */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: !facturacionAnual ? 600 : 400, color: !facturacionAnual ? 'var(--dash-text)' : 'var(--dash-text-faint)' }}>
                  Mensual
                </span>
                <button
                  type="button"
                  onClick={() => setFacturacionAnual((v) => !v)}
                  aria-label="Cambiar entre facturación mensual y anual"
                  style={{
                    width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
                    background: facturacionAnual ? 'linear-gradient(135deg, #F57C00, #E65100)' : 'var(--dash-border)',
                    position: 'relative', padding: 0, transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 2, left: facturacionAnual ? 22 : 2, width: 20, height: 20,
                    borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                  }} />
                </button>
                <span style={{ fontSize: 13, fontWeight: facturacionAnual ? 600 : 400, color: facturacionAnual ? 'var(--dash-text)' : 'var(--dash-text-faint)' }}>
                  Anual
                </span>
              </div>

              {/* Cards de planes */}
              <div className="planes-bloqueo-grid" style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18,
                maxWidth: 900, width: '100%', marginBottom: '2rem', alignItems: 'stretch',
              }}>
                {PLANES_PRECIOS.map((p) => {
                  const precioMostrado = facturacionAnual ? p.precioAnual : p.precioMensual;
                  const descuentoPct = Math.round((1 - p.precioAnual / (p.precioMensual * 12)) * 100);
                  // Meses "gratis" respecto a 12 meses sueltos — se comunica mejor que el %.
                  const mesesGratis = Math.round((1 - p.precioAnual / (p.precioMensual * 12)) * 12 * 10) / 10;
                  const idPlan = facturacionAnual ? `${p.id}_anual` : p.id;

                  return (
                    <div key={p.id} className={`plan-card-bloqueo ${p.popular ? 'plan-card-bloqueo-popular' : ''}`} style={{
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
                      {/* Cinta de lanzamiento en la esquina opuesta a "MÁS ELEGIDO",
                          y solo en las cards que hoy no tienen nada arriba — Premium
                          ya lleva su propia etiqueta, ponerle dos se ve recargado.
                          Es absolute: no empuja nada, se puede montar/desmontar sin
                          el problema de layout que tuvo la del interruptor. */}
                      {facturacionAnual && !p.popular && (
                        <div style={{
                          position: 'absolute', top: 14, left: 14,
                          background: 'var(--tint-orange-bg)', color: '#F57C00', fontSize: 10, fontWeight: 700,
                          padding: '3px 9px', borderRadius: 999, letterSpacing: 0.2,
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                          <Rocket size={10} /> Lanzamiento
                        </div>
                      )}
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, margin: '0 auto 1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: p.popular ? '#F57C00' : 'var(--tint-orange-bg)',
                      }}>
                        <p.Icono size={21} color={p.popular ? '#fff' : '#F57C00'} strokeWidth={2} />
                      </div>
                      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--dash-text)', marginBottom: 4 }}>{p.nombre}</div>
                      {/* El -X% va junto al precio, no suelto en una esquina: en el
                          plan Básico (sin borde ni fondo naranja) quedaría flotando
                          sin nada que lo acompañe. Mismo tratamiento que en la landing. */}
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
                        {/* En mensual el precio va en el color neutro de siempre; en
                            anual pasa a un degradado naranja — el color "se pone mas
                            fuerte" justo cuando aparece el precio con descuento. */}
                        <div style={{
                          fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, lineHeight: 1.2,
                          transition: 'color .2s',
                          ...(facturacionAnual
                            ? { backgroundImage: 'linear-gradient(135deg, #F57C00, #E65100)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
                            : { color: 'var(--dash-text)' }),
                        }}>
                          ${precioMostrado.toLocaleString('es-CO')}
                        </div>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, color: '#fff', background: '#43A047',
                          padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap',
                          visibility: facturacionAnual ? 'visible' : 'hidden',
                        }}>
                          -{descuentoPct}%
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--dash-text-faint)', marginBottom: 4 }}>
                        {facturacionAnual ? 'por año' : 'por mes'}
                      </div>
                      {/* Se mantiene montada (solo cambia visibility) y con el mismo
                          marginBottom en los dos modos: si esta linea aparece y
                          desaparece, empuja el resto de la card (features, boton)
                          hacia arriba o abajo al cambiar de mensual a anual. */}
                      <div style={{
                        fontSize: 11, fontWeight: 600, color: '#43A047', marginBottom: '1.1rem',
                        visibility: facturacionAnual ? 'visible' : 'hidden',
                      }}>
                        Equivale a {mesesGratis} meses gratis
                      </div>
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
                        onClick={() => setModalPagoPlan({
                          id: idPlan,
                          nombre: facturacionAnual ? `${p.nombre} Anual` : p.nombre,
                          precio: `$${precioMostrado.toLocaleString('es-CO')}`,
                          periodo: facturacionAnual ? 'año' : 'mes',
                        })}
                      >
                        Activar {p.nombre}
                      </Button>
                    </div>
                  );
                })}
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
                        background: 'var(--dash-surface-2)', color: 'var(--dash-text-muted)',
                        border: '1px solid var(--dash-border)', cursor: gmailCargando ? 'wait' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {gmailCargando
                        ? <span className="fp-btn__spinner" style={{ width: 13, height: 13 }} aria-hidden="true" />
                        : <span style={{
                            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                            background: gmailEstado.conectado ? 'var(--tint-green-fg)' : 'var(--dash-text-faint)',
                          }} />}
                      {gmailEstado.conectado ? `Verificación: ${enmascararEmail(gmailEstado.email)}` : 'Activar verificación'}
                    </button>
                  )}
                  <IndicadorActualizacion ultima={ultimaActualizacion} hayError={errorActualizacion} />
                </div>
              </div>

              {/* ─── Alerta: WhatsApp caído ───────────── */}
              {/* Va de primero y no se puede ocultar: mientras la sesión esté
                  caída no entra ningún comprobante, y esa falla es silenciosa
                  — el negocio se entera cuando un cliente reclama. */}
              {botEstado?.hayFallas && (
                <div className="bot-alerta">
                  <div className="bot-alerta-icono"><AlertTriangle size={20} /></div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div className="bot-alerta-titulo">
                      Hubo {botEstado.cantidad === 1 ? 'un problema' : `${botEstado.cantidad} problemas`} en los últimos minutos
                    </div>
                    <div className="bot-alerta-texto">
                      Falló {botEstado.afectado}. Puede que algún comprobante no se haya verificado —
                      revisa a mano los pagos recientes antes de entregar un pedido.
                      {/* El mensaje de error crudo solo le sirve a quien administra el servidor. */}
                      {esSuperAdmin && botEstado.ultimoDetalle && (
                        <span className="bot-alerta-detalle"> · {botEstado.ultimoDetalle}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Primeros pasos (onboarding) ─────── */}
              {esAdmin && !onboardingOculto && (() => {
                // Orden por dependencia real: no hay pago verificado sin bot,
                // Gmail y equipo — por eso ese paso va último.
                const pasos = [
                  {
                    id: 'gmail', icon: Mail, titulo: 'Activa la verificación automática',
                    desc: 'Verifica los pagos automáticamente comparando con las notificaciones de tu banco.',
                    hecho: !!gmailEstado?.conectado, accion: conectarGmail,
                  },
                  {
                    id: 'equipo', icon: Users, titulo: 'Agrega a tu equipo',
                    desc: 'Invita a tus empleados para que puedan enviar comprobantes desde su WhatsApp.',
                    hecho: usuarios.length > 1, accion: () => cambiarSeccion('usuarios'),
                  },
                  {
                    id: 'horario', icon: Settings, titulo: 'Configura tu horario',
                    desc: 'Define cuándo cierra tu negocio para los reportes y verificaciones automáticas.',
                    hecho: !!planInfo?.horario_configurado, accion: () => cambiarSeccion('configuracion'),
                  },
                  {
                    id: 'pago', icon: CreditCard, titulo: 'Recibe tu primer pago verificado',
                    desc: 'Pide a un empleado que envíe un comprobante por WhatsApp para probar el flujo.',
                    hecho: !!planInfo?.tiene_pago_verificado, accion: () => cambiarSeccion('pagos'),
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
                          {completados} de {pasos.length} completados — deja listo tu negocio en FlashPago.
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
                <div className="glow-activo-wrap" style={{ marginBottom: '1.25rem' }}>
                  <div className="glow-activo-ring" />
                  <div className="glow-activo-body" style={{
                    background: 'var(--dash-surface)', padding: '1rem 1.25rem',
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
                        Activa la verificación automática de pagos
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--dash-text-muted)', marginTop: 2 }}>
                        FlashPago necesita leer las notificaciones de tu banco para verificar comprobantes automáticamente.
                      </div>
                    </div>
                    <Button
                      onClick={conectarGmail}
                      loading={gmailCargando}
                      icon={<Mail size={15} />}
                      className={gmailCargando ? '' : 'fp-btn--shimmer'}
                    >
                      {gmailCargando ? 'Conectando...' : 'Activar verificación'}
                    </Button>
                  </div>
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

              <div className="seccion" style={{ padding: 0, overflow: 'hidden', marginTop: '1.25rem' }}>
                <button
                  onClick={() => setEstadisticasExpandido(!estadisticasExpandido)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span className="seccion-titulo" style={{ margin: 0 }}>
                    <BarChart3 size={18} /> Resumen de {mesesNombres[periodoMes - 1]}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {resumenPeriodo && (
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F57C00' }}>
                        {formatearMonto(resumenPeriodo.total)}
                      </span>
                    )}
                    {estadisticasExpandido ? <ChevronUp size={18} color="var(--dash-text-faint)" /> : <ChevronDown size={18} color="var(--dash-text-faint)" />}
                  </div>
                </button>

                {estadisticasExpandido && (
                  <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--dash-border-soft)' }}>
                    {resumenPeriodo ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingTop: '1rem' }}>
                        {[
                          { label: 'Total del mes', valor: resumenPeriodo.total, color: 'var(--dash-text)' },
                          { label: 'Pagos verificados', valor: resumenPeriodo.cantidad, color: '#1565C0', esCantidad: true },
                          { label: 'Ticket promedio', valor: resumenPeriodo.ticket_promedio, color: 'var(--dash-text)' },
                          { label: 'Pago más alto', valor: resumenPeriodo.pago_mas_alto, color: '#2E7D32' },
                        ].map((item, i) => (
                          <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.5rem 0', borderBottom: i < 3 ? '1px solid var(--dash-border-soft)' : 'none',
                          }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--dash-text-muted)' }}>{item.label}</span>
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: item.color }}>
                              {item.esCantidad ? item.valor : formatearMonto(item.valor)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: 'var(--dash-text-muted)', paddingTop: '1rem' }}>
                        Todavía no hay pagos verificados este mes.
                      </p>
                    )}
                    <button className="ver-mas-btn" style={{ marginTop: '0.75rem' }} onClick={() => cambiarSeccion('estadisticas')}>
                      Ir a Estadísticas →
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ─── PAGOS ───────────────────────────── */}
          {seccionActiva === 'pagos' && (
            <SeccionPagos
              api={api}
              periodoMes={periodoMes}
              periodoAnio={periodoAnio}
              periodoDia={periodoDia}
              onCambiarPeriodo={cambiarPeriodo}
              sumarMes={sumarMes}
              esMesActualGenerico={esMesActualGenerico}
              mesesNombres={mesesNombres}
              resumenPeriodo={resumenPeriodo}
              statsPeriodo={statsPeriodo}
              cargandoPeriodo={cargandoPeriodo}
              duplicadosPendientes={duplicadosPendientes}
              exportarPagos={exportarPagos}
              onVerFoto={setFotoActiva}
            />
          )}

          {/* ─── ESTADÍSTICAS ────────────────────── */}
          {seccionActiva === 'estadisticas' && (
            <SeccionEstadisticas
              periodoMes={periodoMes}
              periodoAnio={periodoAnio}
              periodoDia={periodoDia}
              onCambiarPeriodo={cambiarPeriodo}
              sumarMes={sumarMes}
              esMesActualGenerico={esMesActualGenerico}
              mesesNombres={mesesNombres}
              resumenPeriodo={resumenPeriodo}
              statsPeriodo={statsPeriodo}
              cargandoPeriodo={cargandoPeriodo}
            />
          )}

          {/* ─── BUSCAR ──────────────────────────── */}
          {seccionActiva === 'buscar' && <SeccionBuscar api={api} />}

          {/* ─── EXPORTAR ────────────────────────── */}
          {seccionActiva === 'exportar' && (
            <SeccionExportar
              mesesNombres={mesesNombres}
              sumarMes={sumarMes}
              esMesActualGenerico={esMesActualGenerico}
              exportarPagos={exportarPagos}
            />
          )}

          {/* ─── VENTAS (Cierre de Caja) ────────── */}
          {seccionActiva === 'ventas' && (
            <SeccionVentas
              api={api}
              esAdmin={esAdmin}
              ventasResumen={ventasResumen}
              setVentasResumen={setVentasResumen}
              cargarDatos={cargarDatos}
              pedirConfirmacion={pedirConfirmacion}
              mesesNombres={mesesNombres}
              sumarMes={sumarMes}
              esMesActualGenerico={esMesActualGenerico}
            />
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
                <div style={{ maxWidth: 520 }}>
                  <span className="skeleton-bar" style={{ width: '100%', height: '0.9rem', marginBottom: 6 }} />
                  <span className="skeleton-bar" style={{ width: '85%', height: '0.9rem', marginBottom: '1.25rem' }} />

                  <span className="skeleton-block" style={{ width: '100%', height: 46, borderRadius: 12, display: 'block', marginBottom: '1.1rem' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.5rem' }}>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <span key={i} className="skeleton-block" style={{ width: '100%', height: 48, borderRadius: 10 }} />
                    ))}
                  </div>

                  <span className="skeleton-block" style={{ width: 190, height: 40, borderRadius: 10, display: 'block' }} />
                </div>
              ) : (
                <div style={{ maxWidth: 520 }}>
                  <p style={{ color: 'var(--dash-text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                    Define qué días opera tu negocio y a qué hora cierra cada uno (puede variar, por ejemplo
                    cerrar más tarde el fin de semana). El bot usa esta información para saber cuándo hacer
                    las verificaciones nocturnas de pagos y enviar el reporte diario.
                  </p>

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0.85rem 1.1rem', borderRadius: 12, marginBottom: '1.4rem',
                    background: 'var(--tint-orange-bg)', border: '1px solid var(--tint-orange-fg)',
                  }}>
                    <Clock size={17} color="var(--tint-orange-fg)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--tint-orange-fg)' }}>
                      {resumenHorario()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--dash-text-muted)' }}>
                      Días y hora de cierre
                    </label>
                    {diasOperacion.length > 1 && (
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
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '0.6rem' }}>
                    {DIAS_SEMANA.map((d) => {
                      const activo = diasOperacion.includes(d.valor);
                      return (
                        <div
                          key={d.valor}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '0.6rem 0.9rem', borderRadius: 10,
                            background: activo ? 'var(--dash-surface)' : 'var(--dash-surface-2)',
                            border: `1px solid ${activo ? 'var(--dash-border)' : 'var(--dash-border-soft)'}`,
                            opacity: activo ? 1 : 0.62, transition: 'opacity 0.15s, background 0.15s',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => alternarDia(d.valor)}
                            aria-label={`Activar o desactivar ${d.nombre}`}
                            style={{
                              width: 34, height: 19, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
                              background: activo ? 'linear-gradient(135deg, #F57C00, #E65100)' : 'var(--dash-border)',
                              position: 'relative', padding: 0, transition: 'background 0.2s',
                            }}
                          >
                            <span style={{
                              position: 'absolute', top: 2, left: activo ? 17 : 2, width: 15, height: 15,
                              borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                            }} />
                          </button>

                          <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 600, color: 'var(--dash-text)' }}>
                            {d.nombre}
                          </span>

                          {activo ? (
                            <input
                              type="time"
                              value={horaCierre[d.valor] || '21:00'}
                              onChange={(e) => cambiarHoraCierreDia(d.valor, e.target.value)}
                              style={{
                                padding: '0.4rem 0.65rem', border: '2px solid var(--dash-border)', borderRadius: 8,
                                fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', background: 'var(--dash-surface)',
                                color: 'var(--dash-text)',
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--dash-text-faint)', fontStyle: 'italic' }}>
                              Cerrado
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--dash-text-faint)', marginBottom: '1.5rem' }}>
                    Las verificaciones se hacen a esa hora y una hora después; el reporte diario se envía junto con la segunda verificación.
                  </p>

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
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
                padding: '0.9rem 1.1rem', borderRadius: 12,
                background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <Mail size={17} color="var(--dash-text-faint)" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: gmailEstado?.conectado ? 'var(--tint-green-fg)' : 'var(--dash-text-faint)',
                      }} />
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--dash-text)' }}>
                        {gmailEstado?.conectado ? 'Verificación activa' : 'Verificación inactiva'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--dash-text-faint)' }}>
                      {gmailEstado?.conectado ? enmascararEmail(gmailEstado.email) : 'Necesaria para verificar pagos automáticamente'}
                    </div>
                  </div>
                </div>
                <button
                  className={gmailEstado?.conectado ? 'usuario-btn-cancelar' : 'usuario-btn-guardar'}
                  onClick={gmailEstado?.conectado ? desconectarGmail : conectarGmail}
                  disabled={gmailCargando}
                >
                  {gmailCargando ? 'Conectando...' : gmailEstado?.conectado ? <><X size={15} /> Desconectar</> : <><Mail size={15} /> Activar verificación</>}
                </button>
              </div>

              {gmailEstado?.conectado ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: '0.8rem' }}>
                  <Lock size={13} color="var(--dash-text-faint)" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: '0.78rem', color: 'var(--dash-text-faint)', margin: 0 }}>
                    Solo lee correos de notificación bancaria — nunca envía nada en tu nombre.
                  </p>
                </div>
              ) : (
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

            {/* ─── Avisos fuera del navegador ───────── */}
            <div className="seccion">
              <div className="seccion-header">
                <h2 className="seccion-titulo"><Bell size={18} /> Avisos de pagos</h2>
              </div>
              <p style={{ color: 'var(--dash-text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.6, maxWidth: 520 }}>
                El aviso sonoro solo funciona con el dashboard abierto y al frente. Si activas los avisos
                del sistema, te llega una notificación en la esquina de la pantalla aunque estés en otra
                pestaña o con el navegador minimizado.
              </p>
              {permisoAvisos === 'no-soportado' ? (
                <p style={{ color: 'var(--dash-text-faint)', fontSize: '0.85rem' }}>
                  Este navegador no admite notificaciones del sistema.
                </p>
              ) : permisoAvisos === 'granted' ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--tint-green-fg)', fontSize: '0.88rem', fontWeight: 600 }}>
                  <CheckCircle size={17} /> Avisos activados en este dispositivo
                </div>
              ) : permisoAvisos === 'denied' ? (
                <div style={{
                  display: 'flex', gap: 10, padding: '0.9rem 1.1rem', borderRadius: 10, maxWidth: 520,
                  background: 'var(--tint-orange-bg)', border: '1px solid var(--tint-orange-fg)',
                }}>
                  <AlertTriangle size={16} color="var(--tint-orange-fg)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: '0.83rem', color: 'var(--tint-orange-fg)', lineHeight: 1.6, margin: 0 }}>
                    Bloqueaste los avisos para este sitio. Para reactivarlos, haz clic en el candado 🔒
                    junto a la dirección web y permite las notificaciones.
                  </p>
                </div>
              ) : (
                <Button onClick={activarAvisos} icon={<Bell size={15} />}>
                  Activar avisos en este dispositivo
                </Button>
              )}
              <p style={{ fontSize: '0.78rem', color: 'var(--dash-text-faint)', marginTop: '0.8rem', maxWidth: 520 }}>
                El permiso se guarda por navegador y dispositivo: si abres el panel en otro computador
                o celular, hay que activarlo también ahí.
              </p>
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

            {/* ─── Método de pago ─────────────────────
                Conectado de verdad: la tarjeta se tokeniza en el navegador
                contra Wompi (nunca toca este servidor), y el backend guarda
                solo la referencia reutilizable. Ver routes/wompi.js y
                bot/cobros-automaticos.js. */}
            <div className="seccion">
              <div className="seccion-header">
                <h2 className="seccion-titulo"><CreditCard size={18} /> Método de pago</h2>
              </div>
              <p style={{ color: 'var(--dash-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6, maxWidth: 480 }}>
                Guarda una tarjeta para que tu plan se renueve solo, sin que tengas que entrar al dashboard cada vez que esté por vencer.
              </p>

              {cargandoMetodoPago ? (
                <div style={{ display: 'flex', gap: '1.5rem', maxWidth: 620 }}>
                  <span className="skeleton-block" style={{ width: 280, height: 168, borderRadius: 18 }} />
                  <div style={{ flex: 1 }}>
                    <span className="skeleton-block" style={{ width: '100%', height: 58, borderRadius: 12, display: 'block', marginBottom: 12 }} />
                    <span className="skeleton-block" style={{ width: 180, height: 32, borderRadius: 8, display: 'block' }} />
                  </div>
                </div>
              ) : !metodoPago ? (
                /* Sin tarjeta guardada */
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  border: '2px dashed var(--dash-border)', borderRadius: 16, padding: '2.2rem 1.5rem',
                  maxWidth: 420, textAlign: 'center',
                }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 12, background: 'var(--tint-orange-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CreditCard size={21} color="#F57C00" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dash-text)', marginBottom: 3 }}>Aún no tienes un método de pago guardado</div>
                    <div style={{ fontSize: 12.5, color: 'var(--dash-text-faint)' }}>Agrega una tarjeta para activar la renovación automática</div>
                  </div>
                  <Button variant="primary" size="sm" icon={<CreditCard size={14} />} onClick={() => setModalTarjeta(true)}>
                    Agregar tarjeta
                  </Button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start', maxWidth: 620 }}>
                  {/* Visual de la tarjeta guardada */}
                  <div style={{
                    position: 'relative', width: 280, minHeight: 168, borderRadius: 18, padding: '1.3rem 1.4rem',
                    background: `linear-gradient(135deg, #1A1A2E 0%, #2A2A4E 60%, #1A1A2E 100%)`,
                    boxShadow: '0 14px 32px rgba(26,26,46,0.28)', color: '#fff', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    flexShrink: 0,
                  }}>
                    {/* brillo diagonal, puramente decorativo */}
                    <div style={{
                      position: 'absolute', top: -40, right: -60, width: 180, height: 180, borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(245,124,0,0.35) 0%, transparent 70%)',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                      <div style={{
                        width: 38, height: 28, borderRadius: 6,
                        background: 'linear-gradient(135deg, #FFD98A, #F57C00)',
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5, color: 'rgba(255,255,255,0.85)' }}>
                        {metodoPago.marca || 'Tarjeta'}
                      </span>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 2.5, fontFamily: "'Space Grotesk',sans-serif", marginBottom: 14 }}>
                        •••• &nbsp;•••• &nbsp;•••• &nbsp;{metodoPago.ultimos4 || '••••'}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.6, marginBottom: 2 }}>VENCE</div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {metodoPago.expMes && metodoPago.expAnio ? `${metodoPago.expMes}/${metodoPago.expAnio}` : '—'}
                          </div>
                        </div>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700,
                          color: '#FFB74D', background: 'rgba(245,124,0,0.18)', padding: '3px 8px', borderRadius: 999,
                        }}>
                          <Shield size={10} /> Guardada
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Controles */}
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      padding: '0.9rem 1rem', background: 'var(--dash-surface-2)', borderRadius: 12, marginBottom: 12,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 10, background: 'var(--tint-orange-bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <RefreshCw size={16} color="#F57C00" />
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--dash-text)' }}>Renovar automáticamente</div>
                          <div style={{ fontSize: 11.5, color: 'var(--dash-text-faint)' }}>Se cobra un día antes de vencer, sin recordatorios</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={alternarRenovarAutomatico}
                        disabled={cambiandoAuto}
                        aria-label="Activar o desactivar la renovación automática"
                        style={{
                          width: 42, height: 23, borderRadius: 999, border: 'none', cursor: cambiandoAuto ? 'wait' : 'pointer', flexShrink: 0,
                          background: renovarAutomatico ? 'linear-gradient(135deg, #F57C00, #E65100)' : 'var(--dash-border)',
                          position: 'relative', padding: 0, transition: 'background 0.2s', opacity: cambiandoAuto ? 0.6 : 1,
                        }}
                      >
                        <span style={{
                          position: 'absolute', top: 2, left: renovarAutomatico ? 21 : 2, width: 19, height: 19,
                          borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                        }} />
                      </button>
                    </div>

                    {renovarAutomatico && planInfo?.trial?.plan_vence && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--dash-text-faint)',
                        marginBottom: 14, padding: '0 2px',
                      }}>
                        <Clock size={13} /> Próximo cobro automático: {new Date(planInfo.trial.plan_vence).toLocaleDateString('es-CO')}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <Button variant="secondary" size="sm" icon={<CreditCard size={14} />} onClick={() => setModalTarjeta(true)}>
                        Cambiar tarjeta
                      </Button>
                      <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={quitarTarjeta}>
                        Quitar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{
                marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'var(--dash-surface-2)', borderRadius: 50, padding: '0.55rem 1.1rem',
              }}>
                <Shield size={14} color="var(--dash-text-faint)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--dash-text-muted)' }}>
                  Pago seguro procesado por Wompi. Nunca vemos ni guardamos tu número de tarjeta.
                </span>
              </div>
            </div>

            {/* ─── Zona de peligro ────────────────── */}
            <div className="seccion" style={{ background: 'var(--tint-red-bg)', border: '1px solid var(--tint-red-fg)' }}>
              <div className="seccion-header" style={{ gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--dash-surface)',
                  }}>
                    <AlertTriangle size={18} color="var(--tint-red-fg)" />
                  </div>
                  <h2 className="seccion-titulo" style={{ color: 'var(--tint-red-fg)', margin: 0 }}>Zona de peligro</h2>
                </div>
              </div>
              <p style={{ color: 'var(--tint-red-fg)', opacity: 0.85, fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.6, maxWidth: 520 }}>
                Eliminar tu cuenta desactiva tu negocio y a todos sus usuarios de inmediato. El bot deja de verificar
                pagos y nadie podrá volver a iniciar sesión. Tu historial de pagos se conserva.
              </p>
              <button className="btn-peligro" onClick={() => setModalEliminarCuenta(true)}>
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '2rem', color: 'var(--dash-text-faint)' }}>
                    <span className="fp-btn__spinner" style={{ width: 16, height: 16, color: '#F57C00' }} aria-hidden="true" />
                    Cargando negocios...
                  </div>
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
            <img src={`/api/comprobantes/${fotoActiva}`} alt="Comprobante" />
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
                <div style={{ fontSize: 13, color: 'var(--dash-text-faint)' }}>{modalPagoPlan.precio} / {modalPagoPlan.periodo || 'mes'}</div>
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
                  tienes 30 minutos.
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

      {modalTarjeta && (
        <div onClick={() => !guardandoTarjeta && setModalTarjeta(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(20,20,40,0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--dash-surface)', borderRadius: 18, padding: '1.75rem',
            width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--dash-text)' }}>
                  Agregar tarjeta
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--dash-text-faint)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <Shield size={12} /> Va directo a Wompi, nunca por FlashPago
                </div>
              </div>
              <button
                onClick={() => !guardandoTarjeta && setModalTarjeta(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} color="var(--dash-text-faint)" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await guardarTarjeta(formTarjeta);
                if (ok) {
                  setModalTarjeta(false);
                  setFormTarjeta({ numero: '', titular: '', mes: '', anio: '', cvc: '' });
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--dash-text-muted)', marginBottom: 4 }}>
                  Número de la tarjeta
                </label>
                <input
                  type="text" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000"
                  required maxLength={19}
                  value={formTarjeta.numero}
                  onChange={(e) => {
                    const limpio = e.target.value.replace(/[^\d]/g, '').slice(0, 16);
                    const conEspacios = limpio.replace(/(.{4})/g, '$1 ').trim();
                    setFormTarjeta((f) => ({ ...f, numero: conEspacios }));
                  }}
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '2px solid var(--dash-border)', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--dash-text-muted)', marginBottom: 4 }}>
                  Nombre del titular
                </label>
                <input
                  type="text" autoComplete="cc-name" placeholder="Como aparece en la tarjeta"
                  required minLength={5}
                  value={formTarjeta.titular}
                  onChange={(e) => setFormTarjeta((f) => ({ ...f, titular: e.target.value }))}
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '2px solid var(--dash-border)', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1.4 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--dash-text-muted)', marginBottom: 4 }}>
                    Vencimiento
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text" inputMode="numeric" placeholder="MM" required maxLength={2}
                      value={formTarjeta.mes}
                      onChange={(e) => setFormTarjeta((f) => ({ ...f, mes: e.target.value.replace(/[^\d]/g, '').slice(0, 2) }))}
                      style={{ width: '100%', padding: '0.7rem 0.6rem', border: '2px solid var(--dash-border)', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', textAlign: 'center', boxSizing: 'border-box' }}
                    />
                    <input
                      type="text" inputMode="numeric" placeholder="AA" required maxLength={2}
                      value={formTarjeta.anio}
                      onChange={(e) => setFormTarjeta((f) => ({ ...f, anio: e.target.value.replace(/[^\d]/g, '').slice(0, 2) }))}
                      style={{ width: '100%', padding: '0.7rem 0.6rem', border: '2px solid var(--dash-border)', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', textAlign: 'center', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--dash-text-muted)', marginBottom: 4 }}>
                    CVC
                  </label>
                  <input
                    type="text" inputMode="numeric" autoComplete="cc-csc" placeholder="123" required maxLength={4}
                    value={formTarjeta.cvc}
                    onChange={(e) => setFormTarjeta((f) => ({ ...f, cvc: e.target.value.replace(/[^\d]/g, '').slice(0, 4) }))}
                    style={{ width: '100%', padding: '0.7rem 0.6rem', border: '2px solid var(--dash-border)', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', textAlign: 'center', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Solo se monta cuando el backend lo exige (ver useEffect de
                  Turnstile) — para una tarjeta normal, este div queda vacío. */}
              {requiereCaptcha && (
                <div ref={turnstileContenedorRef} style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }} />
              )}

              <Button
                type="submit" variant="primary" fullWidth icon={<Shield size={15} />} style={{ marginTop: 6 }}
                loading={guardandoTarjeta}
                disabled={requiereCaptcha && !captchaToken}
              >
                Guardar tarjeta
              </Button>
            </form>
          </div>
        </div>
      )}

      {modalEliminarCuenta && (
        <div onClick={() => { if (!eliminandoCuenta) { cancelarHoldEliminar(); setModalEliminarCuenta(false); } }} style={{
          position: 'fixed', inset: 0, background: 'rgba(20,20,40,0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--dash-surface)', borderRadius: 18, padding: '1.75rem',
            width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12, marginBottom: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--tint-red-bg)',
            }}>
              <AlertTriangle size={22} color="var(--tint-red-fg)" />
            </div>

            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--dash-text)', marginBottom: 8 }}>
              ¿Eliminar tu cuenta de FlashPago?
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--dash-text-muted)', lineHeight: 1.6, marginBottom: 22 }}>
              Esto desactiva tu negocio y a todos sus usuarios de inmediato — nadie podrá volver a iniciar
              sesión ni el bot seguirá verificando pagos. Tus datos históricos se conservan; contacta
              soporte si necesitas reactivarla.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="modal-btn-secundario"
                onClick={() => { cancelarHoldEliminar(); setModalEliminarCuenta(false); }}
                disabled={eliminandoCuenta}
                style={{
                  flex: 1, padding: '0.7rem', borderRadius: 10, border: '2px solid var(--dash-border)',
                  background: 'var(--dash-surface)', color: 'var(--dash-text)', fontWeight: 600, fontSize: 13.5,
                  cursor: eliminandoCuenta ? 'wait' : 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="modal-btn-eliminar-hold"
                onMouseDown={iniciarHoldEliminar}
                onMouseUp={cancelarHoldEliminar}
                onMouseLeave={cancelarHoldEliminar}
                onTouchStart={iniciarHoldEliminar}
                onTouchEnd={cancelarHoldEliminar}
                disabled={eliminandoCuenta}
                style={{
                  flex: 1, height: 44, borderRadius: 10, border: 'none',
                  background: '#e62222', display: 'flex', alignItems: 'center',
                  cursor: eliminandoCuenta ? 'wait' : 'pointer', opacity: eliminandoCuenta ? 0.7 : 1,
                }}
              >
                <span className="modal-btn-eliminar-hold__fill" style={{
                  width: `${holdEliminarProgreso}%`,
                  transition: holdEliminarProgreso === 0 ? 'width 0.2s ease-out' : 'none',
                }} />
                <span className="modal-btn-eliminar-hold__text" style={{ color: '#fff', fontWeight: 700, fontSize: 13.5 }}>
                  {eliminandoCuenta ? 'Eliminando...' : holdEliminarProgreso > 0 ? 'Mantén presionado...' : 'Mantén para eliminar'}
                </span>
                <span className="modal-btn-eliminar-hold__icon">
                  <Trash2 size={15} color="#eee" />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalConfirmacion
        abierto={!!confirmacion}
        titulo={confirmacion?.titulo}
        descripcion={confirmacion?.descripcion}
        textoConfirmar={confirmacion?.textoConfirmar}
        peligro={confirmacion?.peligro}
        cargando={confirmando}
        onConfirmar={ejecutarConfirmacion}
        onCancelar={() => !confirmando && setConfirmacion(null)}
      />

      <ModalConfirmarWhatsapp
        abierto={confirmacionWpp.abierto}
        waLink={confirmacionWpp.waLink}
        confirmado={confirmacionWpp.confirmado}
        onCerrar={() => setConfirmacionWpp({ abierto: false, waLink: '', confirmado: false })}
      />
    </div>
  );
}

export default Dashboard;