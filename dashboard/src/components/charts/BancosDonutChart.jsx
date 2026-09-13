import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatearMonto } from '../../utils/formato';

// Donut (cutout ~62%) con la distribución del monto por banco — mismos
// colores que las barras horizontales de "Bancos más usados", para que se
// lean como el mismo dato en dos formas distintas.
export default function BancosDonutChart({ data, getColor }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="nombre"
          innerRadius="62%"
          outerRadius="100%"
          paddingAngle={2}
          startAngle={90}
          endAngle={-270}
          stroke="none"
        >
          {data.map((d) => <Cell key={d.nombre} fill={getColor(d.nombre)} />)}
        </Pie>
        <Tooltip
          formatter={(value, name) => [formatearMonto(value), name]}
          contentStyle={{
            borderRadius: 8, border: '1px solid var(--dash-border)', fontSize: '0.8rem',
            background: 'var(--dash-surface)', boxShadow: '0 8px 20px rgba(25,31,62,0.12)',
          }}
          labelStyle={{ color: 'var(--dash-text-faint)' }}
          itemStyle={{ color: 'var(--dash-text)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
