import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const DIAS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

// Días del mes acomodados en filas de 7 (Lun a Dom), como un calendario real
// — con huecos antes del día 1 y después del último día. Solo para mostrar;
// acá no se elige un día individual, se elige el mes completo (ver Aplicar).
function diasDelMesEnGrilla(mes, anio) {
  const primerDiaSemana = (new Date(anio, mes - 1, 1).getDay() + 6) % 7; // 0=Lun
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const celdas = [...Array(primerDiaSemana).fill(null), ...Array.from({ length: ultimoDia }, (_, i) => i + 1)];
  while (celdas.length % 7 !== 0) celdas.push(null);
  const filas = [];
  for (let i = 0; i < celdas.length; i += 7) filas.push(celdas.slice(i, i + 7));
  return filas;
}

// Reemplaza los botones ‹ › sueltos por un selector tipo calendario: se abre
// un popover con navegación mes a mes y un botón "Aplicar" que confirma el
// mes mostrado. No permite elegir días individuales ni rangos — Estadísticas
// sigue trabajando por mes calendario completo, esto es solo la UI de cómo
// se elige ese mes.
export default function SelectorMesCalendario({ mes, anio, onCambiar, sumarMes, esMesActualGenerico, mesesNombres }) {
  const [abierto, setAbierto] = useState(false);
  const [vistaMes, setVistaMes] = useState(mes);
  const [vistaAnio, setVistaAnio] = useState(anio);

  const abrir = () => {
    setVistaMes(mes);
    setVistaAnio(anio);
    setAbierto(true);
  };

  const navegarVista = (direccion) => {
    const { mes: m, anio: a } = sumarMes(vistaMes, vistaAnio, direccion);
    setVistaMes(m);
    setVistaAnio(a);
  };

  const aplicar = () => {
    onCambiar(vistaMes, vistaAnio);
    setAbierto(false);
  };

  const vistaEsMesActual = esMesActualGenerico(vistaMes, vistaAnio);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={abierto ? () => setAbierto(false) : abrir}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0.5rem 1.1rem', borderRadius: 10, background: '#F57C00', border: 'none',
          color: '#fff', fontWeight: 700, fontSize: '0.95rem', minWidth: 160, justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {mesesNombres[mes - 1]} {anio}
        <ChevronDown size={16} style={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {abierto && (
        <>
          {/* Capa invisible: cerrar al hacer clic afuera del popover */}
          <div onClick={() => setAbierto(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />

          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 1000,
            background: 'var(--dash-surface)', border: '1px solid var(--dash-border)', borderRadius: 14,
            boxShadow: '0 20px 50px rgba(0,0,0,0.18)', padding: '1rem', width: 300,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
              <button type="button" onClick={() => navegarVista(-1)} style={{
                width: 30, height: 30, borderRadius: 8, border: '1px solid var(--dash-border)',
                background: 'var(--dash-surface-2)', color: 'var(--dash-text)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
              }}>‹</button>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--dash-text)' }}>
                {mesesNombres[vistaMes - 1]} {vistaAnio}
              </span>
              <button
                type="button" onClick={() => navegarVista(1)} disabled={vistaEsMesActual}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: '1px solid var(--dash-border)',
                  background: 'var(--dash-surface-2)', color: 'var(--dash-text)',
                  cursor: vistaEsMesActual ? 'default' : 'pointer', opacity: vistaEsMesActual ? 0.35 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                }}
              >›</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
              {DIAS.map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--dash-text-faint)', padding: '2px 0' }}>
                  {d}
                </div>
              ))}
            </div>
            {diasDelMesEnGrilla(vistaMes, vistaAnio).map((fila, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 2 }}>
                {fila.map((dia, j) => (
                  <div key={j} style={{
                    textAlign: 'center', fontSize: 12.5, padding: '5px 0', borderRadius: 7,
                    color: dia ? 'var(--dash-text)' : 'transparent',
                  }}>
                    {dia || '·'}
                  </div>
                ))}
              </div>
            ))}

            <button
              type="button" onClick={aplicar}
              style={{
                width: '100%', marginTop: '0.75rem', padding: '0.6rem', borderRadius: 9, border: 'none',
                background: '#F57C00', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              Aplicar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
