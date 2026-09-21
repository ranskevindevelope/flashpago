import { useState, useEffect, Suspense, lazy } from 'react';
import {
  Receipt, Calendar, MinusCircle, ArrowDownUp, Wallet, ShoppingBag,
  PlusCircle, Trash2, BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatearMonto, formatearMiles, soloDigitos } from '../utils/formato';
import { TarjetaSkeleton, FilaSkeleton } from '../components/ui/Skeleton';
import EstadoVacio from '../components/ui/EstadoVacio';
import GraficaCargando from '../components/GraficaCargando';
import CierreCaja from './CierreCaja';

const VentasVsEfectivoChart = lazy(() => import('../components/charts/VentasVsEfectivoChart'));
const GastosPorCategoriaChart = lazy(() => import('../components/charts/GastosPorCategoriaChart'));

const CATEGORIA_COLORES = {
  general: '#6B7280', insumos: '#F59E0B', nomina: '#3B82F6',
  servicios: '#8B5CF6', arriendo: '#EF4444', transporte: '#10B981', otro: '#9CA3AF',
};
const CATEGORIA_LABELS = {
  general: 'General', insumos: 'Insumos', nomina: 'Nómina',
  servicios: 'Servicios', arriendo: 'Arriendo', transporte: 'Transporte', otro: 'Otro',
};
const getCategoriaColor = (cat) => CATEGORIA_COLORES[cat] || CATEGORIA_COLORES.general;
const getCategoriaLabel = (cat) => CATEGORIA_LABELS[cat] || cat;

/**
 * Sección Ventas: tabs Hoy / Historial / Gastos. `ventasResumen` viene del
 * padre (Dashboard.jsx) porque Panel también lo muestra (tarjeta de cierre
 * de caja) — lo carga cargarDatos() ahí y esta sección lo refresca con su
 * propio cargarVentas() interno tras cada cambio (cierre, gasto agregado).
 */
export default function SeccionVentas({
  api, esAdmin, ventasResumen, setVentasResumen, cargarDatos, pedirConfirmacion,
  mesesNombres, sumarMes, esMesActualGenerico,
}) {
  const [ventasCierres, setVentasCierres] = useState([]);
  const [ventasSemanal, setVentasSemanal] = useState(null);
  const [ventasGastosCategorias, setVentasGastosCategorias] = useState([]);
  const [gastoMonto, setGastoMonto] = useState('');
  const [gastoCategoria, setGastoCategoria] = useState('general');
  const [gastoDescripcion, setGastoDescripcion] = useState('');
  const [gastoMetodo, setGastoMetodo] = useState('efectivo');
  const [guardandoGasto, setGuardandoGasto] = useState(false);
  const [ventasTab, setVentasTab] = useState('hoy');
  const [gastosMes, setGastosMes] = useState(new Date().getMonth() + 1);
  const [gastosAnio, setGastosAnio] = useState(new Date().getFullYear());
  const [historialMes, setHistorialMes] = useState(new Date().getMonth() + 1);
  const [historialAnio, setHistorialAnio] = useState(new Date().getFullYear());

  const cargarVentas = async () => {
    try {
      const [resResumen, resCierres, resSemanal, resCategorias] = await Promise.all([
        api.request('/api/ventas/resumen'),
        api.request(`/api/ventas/cierres?mes=${historialMes}&anio=${historialAnio}`),
        api.request(`/api/ventas/semanal?mes=${historialMes}&anio=${historialAnio}`),
        api.request(`/api/ventas/gastos/categorias?mes=${gastosMes}&anio=${gastosAnio}`),
      ]);
      if (resResumen?.ok) setVentasResumen(resResumen);
      if (resCierres?.ok) setVentasCierres(resCierres.cierres || []);
      if (resSemanal?.ok) setVentasSemanal(resSemanal);
      if (resCategorias?.ok) setVentasGastosCategorias(resCategorias.categorias || []);
    } catch (err) {
      console.error('Error cargando ventas:', err);
    }
  };

  useEffect(() => {
    cargarVentas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastosMes, gastosAnio, historialMes, historialAnio]);

  const cambiarGastosMes = (direccion) => {
    const { mes, anio } = sumarMes(gastosMes, gastosAnio, direccion);
    setGastosMes(mes);
    setGastosAnio(anio);
  };

  const cambiarHistorialMes = (direccion) => {
    const { mes, anio } = sumarMes(historialMes, historialAnio, direccion);
    setHistorialMes(mes);
    setHistorialAnio(anio);
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

  const eliminarGastoConfirmado = async (id) => {
    try {
      const data = await api.request(`/api/ventas/gasto/${id}`, { method: 'DELETE' });
      if (data.ok) cargarVentas();
    } catch (err) {
      console.error('Error eliminando gasto:', err);
    }
  };

  const eliminarGastoHandler = (id) => {
    pedirConfirmacion({
      titulo: '¿Eliminar este gasto?',
      textoConfirmar: 'Eliminar',
      peligro: true,
      accion: () => eliminarGastoConfirmado(id),
    });
  };

  return (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <button onClick={() => cambiarHistorialMes(-1)} style={{
              width: 34, height: 34, borderRadius: 9, border: '2px solid var(--dash-border)',
              background: 'var(--dash-surface)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '1rem' }}>‹</span>
            </button>
            <div style={{
              padding: '0.4rem 1rem', borderRadius: 9, background: '#F57C00',
              color: '#fff', fontWeight: 700, fontSize: '0.85rem', minWidth: 140, textAlign: 'center',
            }}>
              {mesesNombres[historialMes - 1]} {historialAnio}
            </div>
            <button onClick={() => cambiarHistorialMes(1)} disabled={esMesActualGenerico(historialMes, historialAnio)} style={{
              width: 34, height: 34, borderRadius: 9, border: '2px solid var(--dash-border)',
              background: esMesActualGenerico(historialMes, historialAnio) ? 'var(--dash-surface-2)' : 'var(--dash-surface)',
              cursor: esMesActualGenerico(historialMes, historialAnio) ? 'default' : 'pointer',
              opacity: esMesActualGenerico(historialMes, historialAnio) ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '1rem' }}>›</span>
            </button>
          </div>

          {/* Resumen del mes seleccionado */}
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
                  <span className="tarjeta-label">Ventas — {mesesNombres[historialMes - 1]}</span>
                  <span className="tarjeta-valor">{formatearMonto(ventasSemanal.totales?.ventas || 0)}</span>
                  <span className="tarjeta-sub">{ventasSemanal.dias?.length || 0} cierres</span>
                </div>
              </div>
              <div className="tarjeta">
                <div className="tarjeta-icon-box tarjeta-icon-azul"><ArrowDownUp size={22} /></div>
                <div className="tarjeta-info">
                  <span className="tarjeta-label">Transferencias</span>
                  <span className="tarjeta-valor">{formatearMonto(ventasSemanal.totales?.transferencias || 0)}</span>
                  <span className="tarjeta-sub">Verificadas en el mes</span>
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
                  <span className="tarjeta-sub">En el mes</span>
                </div>
              </div>
            </div>
          )}

          {/* Gráfica semanal */}
          {ventasSemanal?.dias?.length > 0 && (
            <div className="seccion" style={{ marginBottom: '1.25rem' }}>
              <h2 className="seccion-titulo"><BarChart3 size={18} /> Ventas vs Efectivo — {mesesNombres[historialMes - 1]}</h2>
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
              <EstadoVacio
                icono={<Receipt size={20} color="#F57C00" />}
                titulo={`No hay cierres registrados en ${mesesNombres[historialMes - 1]}`}
                subtitulo={esMesActualGenerico(historialMes, historialAnio) ? 'Cuando cierres caja por primera vez, aparece aquí' : undefined}
              />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <button onClick={() => cambiarGastosMes(-1)} style={{
              width: 34, height: 34, borderRadius: 9, border: '2px solid var(--dash-border)',
              background: 'var(--dash-surface)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '1rem' }}>‹</span>
            </button>
            <div style={{
              padding: '0.4rem 1rem', borderRadius: 9, background: '#F57C00',
              color: '#fff', fontWeight: 700, fontSize: '0.85rem', minWidth: 140, textAlign: 'center',
            }}>
              {mesesNombres[gastosMes - 1]} {gastosAnio}
            </div>
            <button onClick={() => cambiarGastosMes(1)} disabled={esMesActualGenerico(gastosMes, gastosAnio)} style={{
              width: 34, height: 34, borderRadius: 9, border: '2px solid var(--dash-border)',
              background: esMesActualGenerico(gastosMes, gastosAnio) ? 'var(--dash-surface-2)' : 'var(--dash-surface)',
              cursor: esMesActualGenerico(gastosMes, gastosAnio) ? 'default' : 'pointer',
              opacity: esMesActualGenerico(gastosMes, gastosAnio) ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '1rem' }}>›</span>
            </button>
          </div>

          {/* Gastos por categoría */}
          {ventasGastosCategorias.length > 0 && (
            <>
              <div className="tarjetas-grid" style={{ gridTemplateColumns: 'minmax(0, 320px)' }}>
                <div className="tarjeta tarjeta-accent">
                  <div className="tarjeta-icon-box tarjeta-icon-rojo"><MinusCircle size={22} /></div>
                  <div className="tarjeta-info">
                    <span className="tarjeta-label">Total gastos — {mesesNombres[gastosMes - 1]}</span>
                    <span className="tarjeta-valor" style={{ color: '#E53935' }}>
                      {formatearMonto(ventasGastosCategorias.reduce((s, c) => s + c.total, 0))}
                    </span>
                    <span className="tarjeta-sub">{ventasGastosCategorias.reduce((s, c) => s + c.cantidad, 0)} gastos</span>
                  </div>
                </div>
              </div>

              <div className="seccion">
                <h2 className="seccion-titulo"><BarChart3 size={18} /> Gastos por categoría — {mesesNombres[gastosMes - 1]} {gastosAnio}</h2>
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
              <EstadoVacio
                icono={<Wallet size={20} color="#F57C00" />}
                titulo={`No hay gastos registrados en ${mesesNombres[gastosMes - 1]}`}
              />
            </div>
          )}
        </>
      )}
    </>
  );
}
