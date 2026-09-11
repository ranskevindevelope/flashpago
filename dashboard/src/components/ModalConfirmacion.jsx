import { AlertTriangle } from 'lucide-react';

// Reemplaza window.confirm() en toda la app: ese dialogo nativo del navegador
// (icono de globo, botones sin estilo) rompe la identidad visual del panel.
// `peligro` cambia el acento de naranja a rojo para acciones destructivas.
export default function ModalConfirmacion({
  abierto, titulo, descripcion, textoConfirmar = 'Confirmar', peligro = false,
  cargando = false, onConfirmar, onCancelar,
}) {
  if (!abierto) return null;
  const acento = peligro ? 'var(--tint-red-fg)' : 'var(--tint-orange-fg)';
  const fondoAcento = peligro ? 'var(--tint-red-bg)' : 'var(--tint-orange-bg)';
  const colorBoton = peligro ? '#E53935' : '#F57C00';

  return (
    <div onClick={() => !cargando && onCancelar()} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,20,40,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--dash-surface)', borderRadius: 18, padding: '1.75rem',
        width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, marginBottom: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', background: fondoAcento,
        }}>
          <AlertTriangle size={20} color={acento} />
        </div>

        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 17, color: 'var(--dash-text)', marginBottom: descripcion ? 8 : 20 }}>
          {titulo}
        </div>
        {descripcion && (
          <p style={{ fontSize: 13.5, color: 'var(--dash-text-muted)', lineHeight: 1.6, marginBottom: 22 }}>
            {descripcion}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="modal-btn-secundario"
            onClick={onCancelar}
            disabled={cargando}
            style={{
              flex: 1, padding: '0.65rem', borderRadius: 10, border: '2px solid var(--dash-border)',
              background: 'var(--dash-surface)', color: 'var(--dash-text)', fontWeight: 600, fontSize: 13.5,
              cursor: cargando ? 'wait' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="modal-btn-confirmar"
            onClick={onConfirmar}
            disabled={cargando}
            style={{
              flex: 1, padding: '0.65rem', borderRadius: 10, border: 'none',
              background: colorBoton, color: '#fff', fontWeight: 600, fontSize: 13.5,
              cursor: cargando ? 'wait' : 'pointer', opacity: cargando ? 0.7 : 1,
            }}
          >
            {cargando ? 'Un momento...' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
