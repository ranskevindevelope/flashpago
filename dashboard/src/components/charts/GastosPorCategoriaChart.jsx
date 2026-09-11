import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatearMonto } from '../../utils/formato';

export default function GastosPorCategoriaChart({ categorias, getColor, getLabel }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={categorias}
          dataKey="total"
          nameKey="categoria"
          innerRadius={58}
          outerRadius={85}
          paddingAngle={2}
          startAngle={90}
          endAngle={-270}
          stroke="none"
        >
          {categorias.map((cat) => (
            <Cell key={cat.categoria} fill={getColor(cat.categoria)} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, _name, props) => [formatearMonto(value), getLabel(props.payload.categoria)]}
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
