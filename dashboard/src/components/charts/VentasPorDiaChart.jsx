import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatearMonto } from '../../utils/formato';

// Tooltip propio en vez del generico de recharts — ese trae fondo blanco fijo,
// que en modo oscuro se veia como una caja rota flotando sobre el panel.
// Con tokens de color (var(--dash-*)) se adapta solo a ambos temas.
function TooltipVentas({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--dash-surface)', border: '1px solid var(--dash-border)',
      borderRadius: 10, padding: '0.55rem 0.8rem', boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dash-text-faint)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--dash-text)' }}>
        {formatearMonto(payload[0].value * 1000)}
      </div>
    </div>
  );
}

// `data` llega ya mapeada con { fecha, totalK } — el total viene en miles
// para que el eje Y se lea "$60k" en vez de "$60.000".
export default function VentasPorDiaChart({ data, height = 300 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <defs>
          <linearGradient id="ventasBarraDegradado" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--naranja)" />
            <stop offset="100%" stopColor="var(--naranja-fuerte)" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border-soft)" vertical={false} />
        <XAxis
          dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--dash-text-faint)' }}
          axisLine={{ stroke: 'var(--dash-border)' }} tickLine={{ stroke: 'var(--dash-border)' }}
        />
        <YAxis
          tickFormatter={(v) => `$${v}k`} tick={{ fontSize: 11, fill: 'var(--dash-text-faint)' }}
          axisLine={{ stroke: 'var(--dash-border)' }} tickLine={{ stroke: 'var(--dash-border)' }}
        />
        <Tooltip content={<TooltipVentas />} cursor={{ fill: 'var(--tint-orange-bg)' }} />
        <Bar
          dataKey="totalK" fill="url(#ventasBarraDegradado)" radius={[6, 6, 0, 0]}
          activeBar={{ fill: 'var(--naranja-fuerte)' }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
