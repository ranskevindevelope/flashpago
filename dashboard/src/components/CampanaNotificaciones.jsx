import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

// Igual que NotificacionesEnVivo.jsx: un color/ícono por tipo de aviso.
function estiloTipo(tipo) {
  if (tipo === 'real') return { color: 'var(--tint-green-fg)', Icono: CheckCircle };
  if (tipo === 'no-encontrado') return { color: 'var(--tint-orange-fg)', Icono: AlertTriangle };
  return { color: 'var(--tint-red-fg)', Icono: XCircle };
}

function tiempoRelativo(fecha) {
  const segundos = Math.floor((Date.now() - new Date(fecha).getTime()) / 1000);
  if (segundos < 60) return 'ahora';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} d`;
}

// Campana de notificaciones del header — historial de los últimos avisos
// (pagos verificados, pendientes, duplicados) que antes se perdían al
// desaparecer el toast de NotificacionesEnVivo.jsx a los 5s. Inspirada en el
// Notification Bell de RareUI (rareui.com), pero con CSS puro en vez de
// `motion`: este componente vive en el header del Dashboard, que carga
// siempre, así que no vale la pena meterle esa librería solo por acá (ver
// components/CodigoOTP.jsx, que sí la usa porque Registro.jsx carga aparte).
export default function CampanaNotificaciones({ notificaciones = [], onAbrir }) {
  const [abierto, setAbierto] = useState(false);
  const [sonando, setSonando] = useState(false);
  const noLeidas = notificaciones.filter((n) => !n.leida).length;
  const noLeidasPrevias = useRef(noLeidas);

  // Rebote breve cuando sube el conteo de no leídas (llegó algo nuevo).
  useEffect(() => {
    if (noLeidas > noLeidasPrevias.current) {
      setSonando(true);
      const t = setTimeout(() => setSonando(false), 500);
      noLeidasPrevias.current = noLeidas;
      return () => clearTimeout(t);
    }
    noLeidasPrevias.current = noLeidas;
  }, [noLeidas]);

  const alternar = () => {
    const siguiente = !abierto;
    setAbierto(siguiente);
    if (siguiente) onAbrir?.();
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={alternar}
        aria-label={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'}
        title="Notificaciones"
        className={sonando ? 'campana-notif__rebote' : undefined}
        style={{
          position: 'relative', width: 38, height: 38, borderRadius: '50%',
          border: 'none', background: 'var(--dash-surface-2)', color: 'var(--dash-text-muted)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Bell size={17} />
        {noLeidas > 0 && (
          <span className="campana-notif__badge">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <>
          <div onClick={() => setAbierto(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 1000,
            width: 320, maxHeight: 380, overflowY: 'auto',
            background: 'var(--dash-surface)', border: '1px solid var(--dash-border)', borderRadius: 14,
            boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
          }}>
            <div style={{
              padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--dash-text)',
              borderBottom: '1px solid var(--dash-border-soft)', position: 'sticky', top: 0, background: 'var(--dash-surface)',
            }}>
              Notificaciones
            </div>

            {notificaciones.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--dash-text-faint)' }}>
                No hay notificaciones todavía
              </div>
            ) : (
              notificaciones.map((n) => {
                const { color, Icono } = estiloTipo(n.tipo);
                return (
                  <div key={n.id} style={{
                    display: 'flex', gap: 10, padding: '0.75rem 1rem',
                    background: n.leida ? 'transparent' : 'var(--tint-orange-bg)',
                    borderBottom: '1px solid var(--dash-border-soft)',
                  }}>
                    <Icono size={16} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--dash-text)' }}>{n.titulo}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--dash-text-muted)', marginTop: 2, wordBreak: 'break-word' }}>{n.detalle}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--dash-text-faint)', marginTop: 3 }}>{tiempoRelativo(n.fecha)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
