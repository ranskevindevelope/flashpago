import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatearMonto } from '../../utils/formato';

export default function VentasPorHoraChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ventasHoraFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F57C00" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#F57C00" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border-soft)" vertical={false} />
        <XAxis dataKey="etiqueta" tick={{ fontSize: 10, fill: 'var(--dash-text-faint)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis
          tickFormatter={(v) => v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`}
          tick={{ fontSize: 10, fill: 'var(--dash-text-faint)' }} axisLine={false} tickLine={false} width={44}
        />
        <Tooltip
          formatter={(value) => [formatearMonto(value), 'Ventas']}
          labelFormatter={(label) => `Hora ${label}`}
          cursor={{ stroke: '#F57C00', strokeWidth: 1, strokeDasharray: '4 4' }}
          contentStyle={{
            borderRadius: 10, border: '1px solid var(--dash-border)', fontSize: '0.8rem',
            boxShadow: '0 8px 20px rgba(25,31,62,0.12)', background: 'var(--dash-surface)',
          }}
          labelStyle={{ color: 'var(--dash-text-faint)' }}
          itemStyle={{ color: 'var(--dash-text)' }}
        />
        <Area
          type="monotone" dataKey="total" stroke="#F57C00" strokeWidth={2.5}
          fill="url(#ventasHoraFill)"
          activeDot={{ r: 5, fill: '#F57C00', stroke: 'var(--dash-surface)', strokeWidth: 2 }}
          dot={(dotProps) => {
            const { cx, cy, index } = dotProps;
            // Solo se marca el último punto: es "la venta más reciente".
            if (index !== data.length - 1) return null;
            return <circle key={`vh-dot-${index}`} cx={cx} cy={cy} r={4} fill="#F57C00" stroke="var(--dash-surface)" strokeWidth={2} />;
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
