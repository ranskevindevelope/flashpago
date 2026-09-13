import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { formatearMonto } from '../../utils/formato';

// Mismo criterio que VentasPorDiaChart: tooltip propio con tokens de color
// en vez del generico de recharts, para que se adapte solo a modo oscuro.
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

// Punto azul con borde blanco/superficie, como pide el diseño, en vez del
// punto por defecto de recharts.
function PuntoVentas({ cx, cy }) {
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={3.5} fill="#1565C0" stroke="var(--dash-surface)" strokeWidth={1.5} />;
}

// `data` llega con { fecha, totalK } (mismo formato que VentasPorDiaChart —
// el total en miles para que el eje Y se lea "$60k"). `promedioK` es el
// promedio diario del periodo, tambien en miles, para la linea de referencia.
export default function VentasAreaChart({ data, promedioK, height = 300 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ventasAreaDegradado" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1565C0" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#1565C0" stopOpacity={0} />
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
        <Tooltip content={<TooltipVentas />} cursor={{ stroke: 'var(--dash-border)', strokeWidth: 1 }} />
        {promedioK > 0 && (
          <ReferenceLine y={promedioK} stroke="#F57C00" strokeDasharray="5 4" strokeWidth={1.5} />
        )}
        <Area
          type="monotone" dataKey="totalK" stroke="#1565C0" strokeWidth={2}
          fill="url(#ventasAreaDegradado)"
          dot={<PuntoVentas />}
          activeDot={{ r: 5, fill: '#1565C0', stroke: 'var(--dash-surface)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
