import { useEffect, useState } from 'react';
import { Trash2, Check, X } from 'lucide-react';

const ESPERA = { confirmado: 1400, cancelado: 600 };

// Confirmación inline (sin modal aparte): se ensancha y muestra confirmar/
// cancelar. CSS puro en vez de `motion` (reservado para Registro.jsx, que
// carga aparte) porque este botón vive en listas que cargan siempre.
export default function BotonEliminar({ onConfirmar, deshabilitado = false, etiqueta = 'Eliminar' }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState('idle'); // idle | confirmado | cancelado

  useEffect(() => {
    if (estado === 'idle') return undefined;
    const t = setTimeout(() => setEstado('idle'), ESPERA[estado]);
    return () => clearTimeout(t);
  }, [estado]);

  const confirmar = () => {
    setAbierto(false);
    setEstado('confirmado');
    onConfirmar?.();
  };

  const cancelar = () => {
    setAbierto(false);
    setEstado('cancelado');
  };

  return (
    <div
      onKeyDown={(e) => { if (e.key === 'Escape' && abierto) cancelar(); }}
      className="boton-eliminar"
      style={{ width: abierto ? 108 : 34 }}
    >
      <button
        type="button"
        aria-label={etiqueta}
        title={etiqueta}
        disabled={deshabilitado}
        onClick={() => {
          if (abierto) { cancelar(); return; }
          setEstado('idle');
          setAbierto(true);
        }}
        className="boton-eliminar__disparador"
      >
        <span key={estado} className={estado === 'cancelado' ? 'boton-eliminar__rebote' : undefined}>
          {estado === 'confirmado'
            ? <Check size={16} className="boton-eliminar__check" style={{ color: 'var(--tint-red-fg)' }} />
            : <Trash2 size={15} />}
        </span>
      </button>

      {abierto && (
        <div className="boton-eliminar__panel">
          <button type="button" aria-label="Confirmar" onClick={confirmar} className="boton-eliminar__accion boton-eliminar__accion--confirmar">
            <Check size={13} strokeWidth={3} />
          </button>
          <button type="button" aria-label="Cancelar" onClick={cancelar} className="boton-eliminar__accion boton-eliminar__accion--cancelar">
            <X size={13} strokeWidth={3} />
          </button>
        </div>
      )}
    </div>
  );
}
