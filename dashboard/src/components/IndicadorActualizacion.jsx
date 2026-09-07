import { useState, useEffect } from 'react';
import { Activity, AlertTriangle } from 'lucide-react';

// Se considera desactualizado si pasó más de este tiempo sin un refresco
// exitoso: el ciclo corre cada 30 s, así que 90 s son tres fallos seguidos.
const LIMITE_DESACTUALIZADO = 90000;

function textoRelativo(ms) {
  const segundos = Math.floor(ms / 1000);
  if (segundos < 10) return 'ahora mismo';
  if (segundos < 60) return `hace ${segundos} s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `hace ${horas} h`;
}

export default function IndicadorActualizacion({ ultima, hayError }) {
  // Un contador propio para que el "hace X" avance solo, sin depender de
  // que el dashboard se vuelva a renderizar por otra razón.
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  if (!ultima) {
    return (
      <div className="dashboard-live"><Activity size={15} /> Actualizando…</div>
    );
  }

  const transcurrido = Date.now() - ultima;
  const desactualizado = hayError && transcurrido > LIMITE_DESACTUALIZADO;

  return (
    <div
      className={`dashboard-live ${desactualizado ? 'dashboard-live--alerta' : ''}`}
      title={`Última actualización: ${new Date(ultima).toLocaleTimeString('es-CO')}`}
    >
      {desactualizado ? <AlertTriangle size={15} /> : <Activity size={15} />}
      {desactualizado ? `Sin actualizar ${textoRelativo(transcurrido)}` : `Actualizado ${textoRelativo(transcurrido)}`}
    </div>
  );
}
