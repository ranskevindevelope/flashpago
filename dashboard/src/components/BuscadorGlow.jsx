import { Search } from 'lucide-react';

// Buscador con borde animado — inspirado en el "glow border" de Uiverse.io
// (Lakshay-art), pero adaptado a la tarjeta blanca del dashboard en vez de
// flotar sobre fondo negro: mismo truco de gradiente cónico girando, contenido
// en un anillo delgado de 2px (con overflow:hidden) en vez de un halo grande
// difuminado, y con los colores/superficie del tema (incluye modo oscuro).
export default function BuscadorGlow({ value, onChange, onBuscar, placeholder = 'Buscar...' }) {
  return (
    <div className="bglow-wrap">
      <div className="bglow-ring" />
      <div className="bglow-body">
        <Search size={16} className="bglow-icono" />
        <input
          className="bglow-input"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onBuscar()}
        />
        <button type="button" className="bglow-boton" onClick={onBuscar} aria-label="Buscar" title="Buscar">
          <Search size={15} />
        </button>
      </div>

      <style>{`
        .bglow-wrap {
          position: relative; width: 320px; max-width: 100%; border-radius: 13px;
          padding: 2px; overflow: hidden; isolation: isolate; margin-bottom: 1rem;
        }
        .bglow-ring {
          position: absolute; inset: -60%; z-index: 0;
          background: conic-gradient(from 0deg,
            transparent 0%, var(--naranja) 12%, transparent 28%,
            transparent 72%, var(--naranja-suave) 88%, transparent 100%);
          animation: bglow-spin 3.5s linear infinite;
          animation-play-state: paused;
          opacity: 0.35;
          transition: opacity 0.3s;
        }
        .bglow-wrap:hover .bglow-ring, .bglow-wrap:focus-within .bglow-ring {
          animation-play-state: running;
          opacity: 1;
        }
        @keyframes bglow-spin { to { transform: rotate(360deg); } }

        .bglow-body {
          position: relative; z-index: 1; display: flex; align-items: center;
          background: var(--dash-surface); border-radius: 11px; height: 46px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          transition: box-shadow 0.3s;
        }
        .bglow-wrap:focus-within .bglow-body { box-shadow: 0 0 0 4px var(--tint-orange-bg); }

        .bglow-icono { color: var(--dash-text-faint); margin-left: 14px; flex-shrink: 0; }

        .bglow-input {
          flex: 1; min-width: 0; height: 100%; padding: 0 10px;
          border: none; background: transparent; color: var(--dash-text);
          font-size: 0.9rem; outline: none;
        }
        .bglow-input::placeholder { color: var(--dash-text-faint); }

        .bglow-boton {
          flex-shrink: 0; display: flex; align-items: center; justify-content: center;
          width: 38px; height: 38px; margin-right: 4px; border: none; border-radius: 9px;
          background: var(--naranja); color: #fff; cursor: pointer; transition: background 0.2s;
        }
        .bglow-boton:hover { background: var(--naranja-fuerte); }
      `}</style>
    </div>
  );
}
