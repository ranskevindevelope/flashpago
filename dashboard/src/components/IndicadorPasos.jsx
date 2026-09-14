import { Fragment } from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';

const POP_SPRING = { type: 'spring', stiffness: 500, damping: 12 };

// Indicador de pasos del registro: el paso activo "salta" con un resorte
// y la línea se rellena de verde al completar pasos. Sin timer ni `flubber`
// (esto avanza al llenar el formulario, no por tiempo).
export default function IndicadorPasos({ pasos, pasoActual, onIrAPaso }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '1.5rem' }}>
      {pasos.map((st, i) => {
        const activo = pasoActual === st.n;
        const hecho = pasoActual > st.n;
        const puedeVolver = hecho && !!onIrAPaso;
        return (
          <Fragment key={st.n}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
              color: hecho ? '#43A047' : activo ? '#F57C00' : '#999', fontWeight: activo ? 600 : 400,
            }}>
              <motion.div
                onClick={() => puedeVolver && onIrAPaso(st.n)}
                animate={{
                  scale: activo ? 1.15 : 1,
                  background: hecho ? '#E8F5E9' : activo ? '#F57C00' : 'rgba(0,0,0,0)',
                  color: hecho ? '#2E7D32' : activo ? '#fff' : '#999',
                }}
                transition={POP_SPRING}
                style={{
                  width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600, flexShrink: 0,
                  border: hecho ? '2px solid #A5D6A7' : activo ? 'none' : '2px solid #ddd',
                  cursor: puedeVolver ? 'pointer' : 'default',
                }}
              >
                {hecho ? <Check size={14} /> : st.n}
              </motion.div>
              {st.label}
            </div>
            {i < pasos.length - 1 && (
              <motion.div
                animate={{ background: hecho ? '#A5D6A7' : '#e0e0e0' }}
                transition={{ duration: 0.35 }}
                style={{ width: 32, height: 2, margin: '0 6px' }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
