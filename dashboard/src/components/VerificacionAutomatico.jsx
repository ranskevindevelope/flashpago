import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertTriangle, X, Circle, RefreshCw } from 'lucide-react';
import Button from './ui/Button';
import './VerificacionAutomatico.css';

// Pantalla completa que se muestra al activar el registro automático: el rayo se dibuja y
// brilla mientras corren las comprobaciones reales del servidor (bot/preparacion-automatico.js).
const RAYO = 'M13 2 3 14h9l-1 8 10-12h-9l1-8z';

const FASES = {
  corriendo: { sub: 'Estamos comprobando que tu negocio esté listo para registrar los pagos solo.' },
  listo: {
    titulo: '¡Todo listo!',
    sub: 'Tus pagos se registrarán solos y los verás aparecer en este dashboard apenas llegue el aviso de tu banco.',
  },
  aviso: { titulo: 'Casi listo', sub: 'Revisa estos avisos antes de activarlo.' },
  error: { titulo: 'No se pudo activar', sub: 'Esto fue lo que encontramos.' },
};

function IconoPaso({ estado }) {
  if (estado === 'ok') return <CheckCircle size={17} color="var(--tint-green-fg)" />;
  if (estado === 'aviso') return <AlertTriangle size={17} color="var(--tint-orange-fg)" />;
  if (estado === 'error') return <X size={17} color="var(--tint-red-fg)" />;
  if (estado === 'corriendo') return <RefreshCw size={17} color="#F57C00" className="verif-giro" />;
  return <Circle size={17} color="var(--dash-text-faint)" />;
}

// Mientras corre, el título grande es el de la comprobación en curso.
function tituloGrande(fase, pasos, progreso) {
  if (fase !== 'corriendo') return FASES[fase].titulo;
  if (progreso <= 5) return 'Realizando ajustes…';
  return pasos.find((p) => p.estado === 'corriendo')?.titulo || 'Terminando…';
}

export function PantallaVerificacion({ fase, pasos, progreso, mensaje, onActivar, onCancelar, onReintentar }) {
  const corriendo = fase === 'corriendo';
  const titulo = tituloGrande(fase, pasos, progreso);

  // Bloquea el scroll de la página de fondo mientras la pantalla está abierta.
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previo; };
  }, []);

  // El dashboard se vuelve a dibujar seguido: la función se guarda en una referencia para que
  // eso no reinicie el temporizador del cierre.
  const cancelar = useRef(onCancelar);
  cancelar.current = onCancelar;

  // Escape cierra cuando ya no hay nada corriendo; al terminar bien se cierra sola.
  useEffect(() => {
    if (corriendo) return undefined;
    const alTeclear = (e) => { if (e.key === 'Escape') cancelar.current(); };
    window.addEventListener('keydown', alTeclear);
    const cierre = fase === 'listo' ? setTimeout(() => cancelar.current(), 4500) : null;
    return () => {
      window.removeEventListener('keydown', alTeclear);
      if (cierre) clearTimeout(cierre);
    };
  }, [corriendo, fase]);

  return (
    <div className={`verif-pantalla verif-pantalla--${fase}`} role="dialog" aria-modal="true" aria-label="Activando el registro automático" aria-live="polite">
      <div className="verif-pantalla__centro">
        <svg className="verif-rayo-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path className="verif-rayo-relleno" d={RAYO} />
          <path className="verif-rayo-trazo" d={RAYO} pathLength="100" />
        </svg>

        <h2 key={titulo} className="verif-pantalla__titulo verif-aparece">{titulo}</h2>
        <p className="verif-pantalla__sub">{FASES[fase].sub}</p>

        <div className="verif-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progreso}>
          <div className="verif-barra__relleno" style={{ width: `${progreso}%` }} />
        </div>

        <ul className="verif-pasos">
          {pasos.map((p) => (
            <li key={p.clave} className={`verif-paso verif-paso--${p.estado}`}>
              <IconoPaso estado={p.estado} />
              <span>{p.estado === 'pendiente' || p.estado === 'corriendo' ? p.titulo : p.detalle}</span>
            </li>
          ))}
        </ul>

        {mensaje && <p className="verif-pantalla__mensaje">{mensaje}</p>}

        <div className="verif-pantalla__acciones">
          {fase === 'aviso' && (
            <>
              <Button onClick={onActivar}>Activar de todos modos</Button>
              <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>
            </>
          )}
          {fase === 'error' && (
            <>
              <Button onClick={onReintentar} icon={<RefreshCw size={15} />}>Reintentar</Button>
              <Button variant="secondary" onClick={onCancelar}>Cerrar</Button>
            </>
          )}
          {fase === 'listo' && <Button onClick={onCancelar}>Continuar</Button>}
        </div>
      </div>
    </div>
  );
}

// Va en el body para que ocupe toda la pantalla aunque algún contenedor tenga transformaciones.
export default function VerificacionAutomatico(props) {
  return createPortal(<PantallaVerificacion {...props} />, document.body);
}
