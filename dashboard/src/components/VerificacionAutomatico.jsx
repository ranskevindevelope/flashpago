import { Zap, CheckCircle, AlertTriangle, X, Circle, RefreshCw } from 'lucide-react';
import Button from './ui/Button';
import './VerificacionAutomatico.css';

// Panel con el rayo que se muestra al activar el registro automático: cada paso es una
// comprobación real que hace el servidor (ver bot/preparacion-automatico.js).
const TITULOS = {
  corriendo: 'Realizando ajustes…',
  listo: '¡Todo listo!',
  aviso: 'Casi listo: revisa estos avisos',
  error: 'No se pudo activar',
};

function IconoPaso({ estado }) {
  if (estado === 'ok') return <CheckCircle size={17} color="var(--tint-green-fg)" />;
  if (estado === 'aviso') return <AlertTriangle size={17} color="var(--tint-orange-fg)" />;
  if (estado === 'error') return <X size={17} color="var(--tint-red-fg)" />;
  if (estado === 'corriendo') return <RefreshCw size={17} color="#F57C00" className="verif-giro" />;
  return <Circle size={17} color="var(--dash-text-faint)" />;
}

export default function VerificacionAutomatico({ fase, pasos, progreso, mensaje, onActivar, onCancelar, onReintentar }) {
  const corriendo = fase === 'corriendo';
  return (
    <div className={`verif-auto verif-auto--${fase}`} role="status" aria-live="polite">
      <div className="verif-auto__titulo">
        <Zap size={18} color="#F57C00" fill="#FFD180" className={corriendo ? 'verif-rayo' : ''} />
        <strong>{TITULOS[fase]}</strong>
      </div>

      <div className="verif-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progreso}>
        <div className="verif-barra__relleno" style={{ width: `${progreso}%` }} />
        <Zap
          size={16}
          color="#F57C00"
          fill="#FFD180"
          className={`verif-barra__rayo${corriendo ? ' verif-brillo' : ''}`}
          style={{ left: `${progreso}%` }}
        />
      </div>

      <ul className="verif-pasos">
        {pasos.map((p) => (
          <li key={p.clave} className={`verif-paso verif-paso--${p.estado}`}>
            <IconoPaso estado={p.estado} />
            <span>{p.estado === 'pendiente' || p.estado === 'corriendo' ? p.titulo : p.detalle}</span>
          </li>
        ))}
      </ul>

      {fase === 'listo' && (
        <p className="verif-auto__nota">
          Tus pagos se registrarán solos y los verás aparecer en este dashboard. Revisamos tu correo cada 30 segundos.
        </p>
      )}
      {mensaje && <p className="verif-auto__nota verif-auto__nota--error">{mensaje}</p>}

      <div className="verif-auto__acciones">
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
        {fase === 'listo' && <Button variant="secondary" onClick={onCancelar}>Cerrar</Button>}
      </div>
    </div>
  );
}
