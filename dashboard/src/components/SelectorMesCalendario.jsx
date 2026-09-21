import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const DIAS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

// Días del mes en filas de 7 (Lun-Dom), con huecos antes/después.
function diasDelMesEnGrilla(mes, anio) {
  const primerDiaSemana = (new Date(anio, mes - 1, 1).getDay() + 6) % 7; // 0=Lun
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const celdas = [...Array(primerDiaSemana).fill(null), ...Array.from({ length: ultimoDia }, (_, i) => i + 1)];
  while (celdas.length % 7 !== 0) celdas.push(null);
  const filas = [];
  for (let i = 0; i < celdas.length; i += 7) filas.push(celdas.slice(i, i + 7));
  return filas;
}

// Selector tipo calendario: popover con navegación mes a mes, elegir un
// día puntual (click en el número) o quedarse con el mes completo.
// `dia` es null cuando se ve el mes completo; onCambiar(mes, anio, dia)
// se llama siempre con los tres, dia en null si no se eligió ninguno.
export default function SelectorMesCalendario({ mes, anio, dia, onCambiar, sumarMes, esMesActualGenerico, mesesNombres }) {
  const [abierto, setAbierto] = useState(false);
  const [vistaMes, setVistaMes] = useState(mes);
  const [vistaAnio, setVistaAnio] = useState(anio);
  const [vistaDia, setVistaDia] = useState(dia || null);

  const abrir = () => {
    setVistaMes(mes);
    setVistaAnio(anio);
    setVistaDia(dia || null);
    setAbierto(true);
  };

  const navegarVista = (direccion) => {
    const { mes: m, anio: a } = sumarMes(vistaMes, vistaAnio, direccion);
    setVistaMes(m);
    setVistaAnio(a);
    setVistaDia(null); // cambiar de mes sin día elegido todavía tiene más sentido que arrastrar un número que puede no existir
  };

  const aplicar = () => {
    onCambiar(vistaMes, vistaAnio, vistaDia);
    setAbierto(false);
  };

  const vistaEsMesActual = esMesActualGenerico(vistaMes, vistaAnio);
  const hoy = new Date();
  const esHoy = (d) => vistaEsMesActual && d === hoy.getDate();

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
        {dia ? `${dia} de ${mesesNombres[mes - 1]} ${anio}` : `${mesesNombres[mes - 1]} ${anio}`}
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
                {fila.map((d, j) => {
                  const seleccionado = d && vistaDia === d;
                  return (
                    <button
                      key={j}
                      type="button"
                      disabled={!d}
                      onClick={() => setVistaDia(d)}
                      style={{
                        textAlign: 'center', fontSize: 12.5, padding: '5px 0', borderRadius: 7,
                        border: esHoy(d) && !seleccionado ? '1.5px solid #F57C00' : 'none',
                        background: seleccionado ? '#F57C00' : 'transparent',
                        color: !d ? 'transparent' : seleccionado ? '#fff' : 'var(--dash-text)',
                        fontWeight: seleccionado ? 700 : 500,
                        cursor: d ? 'pointer' : 'default',
                        fontFamily: 'inherit',
                      }}
                    >
                      {d || '·'}
                    </button>
                  );
                })}
              </div>
            ))}

            {vistaDia && (
              <button
                type="button"
                onClick={() => setVistaDia(null)}
                style={{
                  display: 'block', margin: '0.6rem auto 0', background: 'none', border: 'none',
                  color: '#F57C00', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0,
                }}
              >
                Ver todo el mes
              </button>
            )}

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
