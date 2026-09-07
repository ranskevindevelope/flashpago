import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatearMonto } from '../../utils/formato';

// `data` llega ya mapeada con { fecha, totalK } — el total viene en miles
// para que el eje Y se lea "$60k" en vez de "$60.000".
export default function VentasPorDiaChart({ data, height = 300 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `$${v}k`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value) => [formatearMonto(value * 1000), 'Total']} />
        <Bar dataKey="totalK" fill="#F57C00" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
