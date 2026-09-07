import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { formatearMonto } from '../../utils/formato';

export default function VentasVsEfectivoChart({ dias }) {
  const data = dias.map((d) => ({
    fecha: (d.fecha || '').split('/').slice(0, 2).join('/'),
    ventas: Math.round(d.total_ventas / 1000),
    efectivo: Math.round(d.total_efectivo / 1000),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
        <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--dash-text-faint)' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => `$${v}k`} tick={{ fontSize: 11, fill: 'var(--dash-text-faint)' }} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          formatter={(value, name) => [formatearMonto(value * 1000), name === 'ventas' ? 'Ventas' : 'Efectivo']}
          contentStyle={{ borderRadius: 10, border: '1px solid var(--dash-border)', fontSize: '0.8rem', boxShadow: '0 8px 20px rgba(25,31,62,0.12)' }}
        />
        <Legend
          formatter={(value) => (value === 'ventas' ? 'Ventas' : 'Efectivo')}
          wrapperStyle={{ fontSize: '0.8rem' }}
        />
        <Line type="monotone" dataKey="ventas" name="ventas" stroke="#F57C00" strokeWidth={2.5} dot={{ r: 4, fill: '#F57C00', strokeWidth: 0 }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="efectivo" name="efectivo" stroke="#43A047" strokeWidth={2.5} dot={{ r: 4, fill: '#43A047', strokeWidth: 0 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
