import { useState, useEffect, Suspense, lazy } from 'react';
import {
  DollarSign, CreditCard, Shield, AlertTriangle, BarChart3, Download,
  ArrowUp, ArrowDown, Moon, Mail, Eye,
} from 'lucide-react';
import { formatearMonto } from '../utils/formato';
import { getBancoBadge } from '../utils/bancos';
import { FilaSkeleton, TarjetaSkeleton } from '../components/ui/Skeleton';
import GraficaCargando from '../components/GraficaCargando';
import SelectorMesCalendario from '../components/SelectorMesCalendario';

const VentasPorDiaChart = lazy(() => import('../components/charts/VentasPorDiaChart'));

const PAGOS_POR_PAGINA = 20;

/**
 * Sección de Pagos: métricas del mes (o día, si se elige uno puntual en el
 * calendario), mini gráfico, tabla paginada/ordenable con selección
 * múltiple y exportación. Usa su propio endpoint (/dashboard/pagos-lista)
 * y estado propios — separado a propósito de /dashboard/pagos, que usa
 * NotificacionesEnVivo.jsx para el canal en vivo.
 *
 * periodoMes/periodoAnio/periodoDia/mesesNombres, resumenPeriodo/
 * statsPeriodo/cargandoPeriodo y duplicadosPendientes se comparten con
 * Panel/Estadísticas y vienen del padre (Dashboard.jsx) para no duplicar
 * esas cargas ni desincronizar el selector de periodo entre secciones.
 */
export default function SeccionPagos({
  api, periodoMes, periodoAnio, periodoDia, onCambiarPeriodo, sumarMes, esMesActualGenerico, mesesNombres,
  resumenPeriodo, statsPeriodo, cargandoPeriodo, duplicadosPendientes,
  exportarPagos, onVerFoto,
}) {
  const [pagosTabla, setPagosTabla] = useState([]);
  const [pagosTablaTotal, setPagosTablaTotal] = useState(0);
  const [paginaPagos, setPaginaPagos] = useState(1);
  const [ordenPagos, setOrdenPagos] = useState('fecha');
  const [direccionPagos, setDireccionPagos] = useState('desc');
  const [cargandoTablaPagos, setCargandoTablaPagos] = useState(false);
  const [seleccionPagos, setSeleccionPagos] = useState(() => new Set());

  const cargarPagosTabla = async () => {
    setCargandoTablaPagos(true);
    const m = String(periodoMes).padStart(2, '0');
    try {
      const params = new URLSearchParams({
        mes: m, anio: periodoAnio, pagina: paginaPagos, porPagina: PAGOS_POR_PAGINA,
        orden: ordenPagos, direccion: direccionPagos,
      });
      if (periodoDia) params.set('dia', String(periodoDia).padStart(2, '0'));
      const res = await api.request(`/api/dashboard/pagos-lista?${params}`);
      setPagosTabla(Array.isArray(res?.filas) ? res.filas : []);
      setPagosTablaTotal(res?.total || 0);
    } catch (err) {
      console.error('Error cargando tabla de pagos:', err);
    }
    setCargandoTablaPagos(false);
  };

  useEffect(() => {
    cargarPagosTabla();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoMes, periodoAnio, periodoDia, paginaPagos, ordenPagos, direccionPagos]);

  // Cambiar de periodo o de orden vuelve a la página 1 (evita quedar en
  // una página que ya no existe para el nuevo periodo/orden).
  useEffect(() => {
    setPaginaPagos(1);
  }, [periodoMes, periodoAnio, periodoDia, ordenPagos, direccionPagos]);

  // La selección es solo de la página visible: se limpia al cambiar de
  // página/periodo/orden para no "perder" filas seleccionadas que ya no
  // están en pagosTabla (evita exportar de menos sin avisar).
  useEffect(() => {
    setSeleccionPagos(new Set());
  }, [paginaPagos, periodoMes, periodoAnio, periodoDia, ordenPagos, direccionPagos]);

  const alternarOrdenPagos = (campo) => {
    if (ordenPagos === campo) {
      setDireccionPagos((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrdenPagos(campo);
      setDireccionPagos('desc');
    }
  };

  const alternarSeleccionPago = (id) => {
    setSeleccionPagos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id); else siguiente.add(id);
      return siguiente;
    });
  };

  const alternarSeleccionTodosPagos = () => {
    setSeleccionPagos((prev) => {
      const todosSeleccionados = pagosTabla.length > 0 && pagosTabla.every((p) => prev.has(p.id));
      return todosSeleccionados ? new Set() : new Set(pagosTabla.map((p) => p.id));
    });
  };

  // CSV armado en el navegador a partir de las filas ya cargadas — no
  // necesita golpear el backend, ya tenemos los datos de la página actual.
  const exportarPagosSeleccionados = () => {
    const filas = pagosTabla.filter((p) => seleccionPagos.has(p.id));
    if (filas.length === 0) return;
    const encabezado = ['Cliente', 'Monto', 'Banco', 'Fecha', 'Hora', 'Fuente'];
    const cuerpo = filas.map((p) => [
      p.nombre_cliente || 'Sin nombre',
      p.monto,
      getBancoBadge(p.banco).nombre,
      p.fecha || '',
      p.hora || '',
      p.fuente === 'gmail_nocturna' ? 'asincronica' : 'Gmail',
    ]);
    const csv = [encabezado, ...cuerpo]
      .map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `pagos-seleccionados-${Date.now()}.csv`;
    enlace.click();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
  };

  return (
    <>
      {/* Métricas del mes */}
      <div className="tarjetas-grid" style={{ marginBottom: '1.25rem' }}>
        {cargandoPeriodo ? (
          <>
            <TarjetaSkeleton /><TarjetaSkeleton /><TarjetaSkeleton /><TarjetaSkeleton />
          </>
        ) : (
          <>
            <div className="tarjeta tarjeta-accent">
              <div className="tarjeta-icon-box tarjeta-icon-naranja"><DollarSign size={22} /></div>
              <div className="tarjeta-info">
                <span className="tarjeta-label">Total {periodoDia ? `${periodoDia} de ${mesesNombres[periodoMes - 1]}` : mesesNombres[periodoMes - 1]}</span>
                <span className="tarjeta-valor">{formatearMonto(resumenPeriodo?.total || 0)}</span>
              </div>
            </div>
            <div className="tarjeta">
              <div className="tarjeta-icon-box tarjeta-icon-azul"><CreditCard size={22} /></div>
              <div className="tarjeta-info">
                <span className="tarjeta-label">Cantidad</span>
                <span className="tarjeta-valor">{resumenPeriodo?.cantidad || 0}</span>
                <span className="tarjeta-sub">pagos verificados</span>
              </div>
            </div>
            <div className="tarjeta">
              <div className="tarjeta-icon-box tarjeta-icon-morado"><Shield size={22} /></div>
              <div className="tarjeta-info">
                <span className="tarjeta-label">Ticket promedio</span>
                <span className="tarjeta-valor">{formatearMonto(resumenPeriodo?.ticket_promedio || 0)}</span>
              </div>
            </div>
            <div className="tarjeta">
              <div className="tarjeta-icon-box tarjeta-icon-rojo"><AlertTriangle size={22} /></div>
              <div className="tarjeta-info">
                <span className="tarjeta-label">Duplicados</span>
                <span className="tarjeta-valor">{duplicadosPendientes.length}</span>
                <span className="tarjeta-sub">por revisar</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mini gráfico de pagos por día */}
      <div className="seccion" style={{ marginBottom: '1.25rem' }}>
        <div className="seccion-header">
          <h2 className="seccion-titulo"><BarChart3 size={18} /> Pagos por día — {periodoDia ? `${periodoDia} de ${mesesNombres[periodoMes - 1]}` : mesesNombres[periodoMes - 1]}</h2>
        </div>
        <div className="grafica-container">
          <Suspense fallback={<GraficaCargando alto={160} />}>
            <VentasPorDiaChart
              height={160}
              data={statsPeriodo.map((s) => ({
                ...s,
                fecha: s.fecha ? s.fecha.slice(8, 10) + '/' + s.fecha.slice(5, 7) : (s.fecha || '').slice(0, 5),
                totalK: Math.round(s.total / 1000),
              }))}
            />
          </Suspense>
        </div>
      </div>

      {/* Selector de mes o día puntual */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <SelectorMesCalendario
          mes={periodoMes}
          anio={periodoAnio}
          dia={periodoDia}
          onCambiar={onCambiarPeriodo}
          sumarMes={sumarMes}
          esMesActualGenerico={esMesActualGenerico}
          mesesNombres={mesesNombres}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--dash-text-muted)', fontWeight: 500 }}>
            {pagosTablaTotal} pagos
          </span>
          {seleccionPagos.size > 0 && (
            <button className="exportar-btn" onClick={exportarPagosSeleccionados}>
              <Download size={14} /> Seleccionados ({seleccionPagos.size})
            </button>
          )}
          <button className="exportar-btn" onClick={() => exportarPagos(periodoMes, periodoAnio)}>
            <Download size={14} /> Exportar mes
          </button>
        </div>
      </div>
      <div className="seccion">
        <div className="tabla-container">
          <table className="tabla-pagos">
            <thead>
              <tr>
                <th className="th-checkbox">
                  <input
                    type="checkbox"
                    checked={pagosTabla.length > 0 && pagosTabla.every((p) => seleccionPagos.has(p.id))}
                    onChange={alternarSeleccionTodosPagos}
                    aria-label="Seleccionar todos"
                  />
                </th>
                <th className="th-ordenable" onClick={() => alternarOrdenPagos('cliente')}>
                  Cliente {ordenPagos === 'cliente' && (direccionPagos === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                </th>
                <th className="th-ordenable" onClick={() => alternarOrdenPagos('monto')}>
                  Monto {ordenPagos === 'monto' && (direccionPagos === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                </th>
                <th className="th-ordenable" onClick={() => alternarOrdenPagos('banco')}>
                  Banco {ordenPagos === 'banco' && (direccionPagos === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                </th>
                <th className="th-ordenable" onClick={() => alternarOrdenPagos('fecha')}>
                  Fecha {ordenPagos === 'fecha' && (direccionPagos === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                </th>
                <th>Hora</th>
                <th>Fuente</th>
                <th>Foto</th>
              </tr>
            </thead>
            <tbody>
              {cargandoTablaPagos ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <FilaSkeleton key={`skeleton-${i}`} columnas={[20, '75%', '55%', 60, 55, 40, 65, 30]} />
                ))
              ) : pagosTabla.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--dash-text-faint)' }}>No hay pagos {periodoDia ? `el ${periodoDia} de ${mesesNombres[periodoMes - 1]}` : `en ${mesesNombres[periodoMes - 1]} ${periodoAnio}`}</td></tr>
              ) : (
                pagosTabla.map((pago) => {
                  const banco = getBancoBadge(pago.banco);
                  const esDuplicado = !!pago.revision_duplicado;
                  return (
                    <tr key={pago.id}>
                      <td className="td-checkbox">
                        <input
                          type="checkbox"
                          checked={seleccionPagos.has(pago.id)}
                          onChange={() => alternarSeleccionPago(pago.id)}
                          aria-label={`Seleccionar pago de ${pago.nombre_cliente || 'cliente'}`}
                        />
                      </td>
                      <td className="td-cliente">
                        {pago.nombre_cliente || 'Sin nombre'}
                        {esDuplicado && (
                          <span className="badge-duplicado" title={`Revisión: ${pago.revision_duplicado}`}>
                            <AlertTriangle size={10} /> Duplicado
                          </span>
                        )}
                      </td>
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
                          <button className="ver-foto-btn" onClick={() => onVerFoto(pago.foto)}><Eye size={13} /> Ver</button>
                        ) : (<span className="sin-foto">—</span>)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {pagosTablaTotal > PAGOS_POR_PAGINA && (
          <div className="paginacion-pagos">
            <button onClick={() => setPaginaPagos((p) => Math.max(1, p - 1))} disabled={paginaPagos === 1}>‹</button>
            <span>Página {paginaPagos} de {Math.max(1, Math.ceil(pagosTablaTotal / PAGOS_POR_PAGINA))}</span>
            <button
              onClick={() => setPaginaPagos((p) => p + 1)}
              disabled={paginaPagos >= Math.ceil(pagosTablaTotal / PAGOS_POR_PAGINA)}
            >›</button>
          </div>
        )}
      </div>
    </>
  );
}
