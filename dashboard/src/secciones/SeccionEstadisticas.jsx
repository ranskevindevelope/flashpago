import { useMemo, Suspense, lazy } from 'react';
import { DollarSign, BarChart3, Trophy, Shield, TrendingUp, CreditCard, Package, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { formatearMonto } from '../utils/formato';
import { agruparBancosParaEstadisticas, COLOR_BANCO_ESTADISTICAS } from '../utils/bancos';
import { TarjetaSkeleton } from '../components/ui/Skeleton';
import EstadoVacio from '../components/ui/EstadoVacio';
import EstadisticasHeatmap from '../components/EstadisticasHeatmap';
import SelectorMesCalendario from '../components/SelectorMesCalendario';
import GraficaCargando from '../components/GraficaCargando';

const VentasAreaChart = lazy(() => import('../components/charts/VentasAreaChart'));
const BancosDonutChart = lazy(() => import('../components/charts/BancosDonutChart'));

/**
 * Sección de Estadísticas: no tiene fetch propio — lee periodoMes/periodoAnio/
 * periodoDia, resumenPeriodo, statsPeriodo y cargandoPeriodo del padre
 * (Dashboard.jsx), cargados por su cargarPeriodo() compartido con Panel y
 * Pagos. periodoDia es null cuando se ve el mes completo.
 */
export default function SeccionEstadisticas({
  periodoMes, periodoAnio, periodoDia, onCambiarPeriodo, sumarMes, esMesActualGenerico,
  mesesNombres, resumenPeriodo, statsPeriodo, cargandoPeriodo,
}) {
  const bancosAgrupados = useMemo(() => agruparBancosParaEstadisticas(resumenPeriodo?.bancos), [resumenPeriodo]);
  const etiquetaPeriodo = periodoDia ? `${periodoDia} de ${mesesNombres[periodoMes - 1]}` : mesesNombres[periodoMes - 1];

  return (
    <>
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
                <span className="tarjeta-label">Total {etiquetaPeriodo}</span>
                <span className="tarjeta-valor">{formatearMonto(resumenPeriodo?.total || 0)}</span>
                {typeof resumenPeriodo?.delta_vs_anterior === 'number' ? (
                  <span className="tarjeta-sub" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    color: resumenPeriodo.delta_vs_anterior >= 0 ? 'var(--tint-green-fg)' : 'var(--tint-red-fg)',
                  }}>
                    {resumenPeriodo.delta_vs_anterior >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                    {Math.abs(resumenPeriodo.delta_vs_anterior)}% vs {periodoDia ? 'día anterior' : 'mes anterior'}
                  </span>
                ) : (
                  <span className="tarjeta-sub">{resumenPeriodo?.cantidad || 0} transacciones</span>
                )}
              </div>
            </div>
            <div className="tarjeta">
              <div className="tarjeta-icon-box tarjeta-icon-azul"><BarChart3 size={22} /></div>
              <div className="tarjeta-info">
                <span className="tarjeta-label">Promedio diario</span>
                <span className="tarjeta-valor">
                  {formatearMonto(resumenPeriodo?.promedio_diario || 0)}
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

      {/* Ventas por día — area chart con línea de promedio */}
      <div className="seccion" style={{ marginBottom: '1.25rem' }}>
        <div className="seccion-header">
          <h2 className="seccion-titulo"><TrendingUp size={18} /> Ventas por día — {etiquetaPeriodo} {periodoAnio}</h2>
        </div>
        {cargandoPeriodo ? (
          <div className="grafica-container">
            <div className="skeleton-block" style={{ width: '100%', height: '100%' }} />
          </div>
        ) : statsPeriodo.length === 0 ? (
          <EstadoVacio
            icono={<TrendingUp size={20} color="#F57C00" />}
            titulo={`No hay ventas registradas ${periodoDia ? 'ese día' : 'en este mes'}`}
            subtitulo="En cuanto el bot verifique un pago, aparece aquí"
          />
        ) : (
          <>
            <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#1565C0', display: 'inline-block' }} />
                <span style={{ fontSize: 12.5, color: 'var(--dash-text-muted)' }}>Ventas diarias</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 16, borderTop: '2px dashed #F57C00', display: 'inline-block' }} />
                <span style={{ fontSize: 12.5, color: 'var(--dash-text-muted)' }}>
                  Promedio {formatearMonto(resumenPeriodo?.promedio_diario || 0)}
                </span>
              </div>
            </div>
            <div className="grafica-container">
              <Suspense fallback={<GraficaCargando alto={300} />}>
                <VentasAreaChart
                  height={300}
                  promedioK={Math.round((resumenPeriodo?.promedio_diario || 0) / 1000)}
                  data={statsPeriodo.map(s => ({
                    ...s,
                    fecha: s.fecha ? s.fecha.slice(8, 10) + '/' + s.fecha.slice(5, 7) : '',
                    totalK: Math.round(s.total / 1000),
                  }))}
                />
              </Suspense>
            </div>
          </>
        )}
      </div>

      {/* Bancos más usados + distribución (donut) */}
      <div className="estadisticas-bancos-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="seccion" style={{ marginBottom: 0 }}>
          <h2 className="seccion-titulo"><CreditCard size={18} /> Bancos más usados</h2>
          {bancosAgrupados.length === 0 ? (
            <EstadoVacio
              icono={<CreditCard size={20} color="#F57C00" />}
              titulo={`Sin pagos ${periodoDia ? 'ese día' : 'este mes'}`}
              subtitulo="En cuanto el bot verifique un pago, aparece aquí"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginTop: '0.75rem' }}>
              {bancosAgrupados.map((b) => {
                const max = Math.max(...bancosAgrupados.map(x => x.total));
                const pct = max > 0 ? Math.round((b.total / max) * 100) : 0;
                const color = COLOR_BANCO_ESTADISTICAS[b.nombre] || COLOR_BANCO_ESTADISTICAS.Otro;
                return (
                  <div key={b.nombre}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--dash-text)' }}>{b.nombre}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--dash-text-muted)' }}>
                        {b.pagos} pagos / {formatearMonto(b.total)}
                      </span>
                    </div>
                    <div style={{ height: 8, background: 'var(--dash-surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', background: color,
                        borderRadius: 4, transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="seccion" style={{ marginBottom: 0 }}>
          <h2 className="seccion-titulo"><Package size={18} /> Distribución por banco</h2>
          {bancosAgrupados.length === 0 ? (
            <EstadoVacio icono={<Package size={20} color="#F57C00" />} titulo="Sin datos" subtitulo="" />
          ) : (
            <>
              <div style={{ height: 190, marginTop: '0.5rem' }}>
                <Suspense fallback={<GraficaCargando alto={190} />}>
                  <BancosDonutChart
                    data={bancosAgrupados}
                    getColor={(n) => COLOR_BANCO_ESTADISTICAS[n] || COLOR_BANCO_ESTADISTICAS.Otro}
                  />
                </Suspense>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '1rem' }}>
                {bancosAgrupados.map((b) => {
                  const totalGeneral = bancosAgrupados.reduce((s, x) => s + x.total, 0);
                  const pct = totalGeneral > 0 ? Math.round((b.total / totalGeneral) * 100) : 0;
                  const color = COLOR_BANCO_ESTADISTICAS[b.nombre] || COLOR_BANCO_ESTADISTICAS.Otro;
                  return (
                    <div key={b.nombre} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                      <span style={{ color: 'var(--dash-text)', fontWeight: 500 }}>{b.nombre}</span>
                      <span style={{ color: 'var(--dash-text-faint)', marginLeft: 'auto' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Heatmap de actividad semanal */}
      {resumenPeriodo?.heatmap_semanal?.length > 0 && (
        <div className="seccion">
          <h2 className="seccion-titulo"><Activity size={18} /> Actividad semanal</h2>
          <div style={{ marginTop: '0.75rem' }}>
            <EstadisticasHeatmap matriz={resumenPeriodo.heatmap_semanal} />
          </div>
        </div>
      )}
    </>
  );
}
