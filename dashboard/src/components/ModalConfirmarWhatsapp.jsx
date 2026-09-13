import { MessageCircle, CheckCircle2 } from 'lucide-react';

// Último paso del onboarding, obligatorio: sin esto el bot no puede
// reconocer los mensajes de este negocio de forma confiable (WhatsApp a
// veces esconde el número real detrás de un identificador de privacidad —
// ver bot/confirmacionWhatsapp.js en el backend). El botón abre WhatsApp con
// el mensaje ya escrito; la confirmación llega sola cuando el negocio le da
// enviar, sin que tenga que escribir nada a mano.
export default function ModalConfirmarWhatsapp({ abierto, waLink, confirmado, onCerrar }) {
  if (!abierto) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(20,20,40,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: 'var(--dash-surface)', borderRadius: 18, padding: '1.75rem',
        width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: confirmado ? 'var(--tint-green-bg)' : 'var(--tint-orange-bg)',
          transition: 'background 0.3s',
        }}>
          {confirmado
            ? <CheckCircle2 size={26} color="var(--tint-green-fg)" />
            : <MessageCircle size={26} color="var(--tint-orange-fg)" />}
        </div>

        {confirmado ? (
          <>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--dash-text)', marginBottom: 8 }}>
              ¡Listo! Cuenta configurada
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--dash-text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
              Ya tu bot puede recibir transferencias por WhatsApp.
            </p>
            <button
              type="button"
              onClick={onCerrar}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: 10, border: 'none',
                background: '#F57C00', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >
              Empezar
            </button>
          </>
        ) : (
          <>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--dash-text)', marginBottom: 8 }}>
              Ya casi — un último paso
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--dash-text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
              Confirma por WhatsApp para que el bot quede activado. Es un solo toque: se abre WhatsApp con el mensaje ya escrito, solo dale enviar.
            </p>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '0.75rem', borderRadius: 10, border: 'none',
                background: '#25D366', color: '#fff', fontWeight: 600, fontSize: 14,
                textDecoration: 'none', boxSizing: 'border-box',
              }}
            >
              <MessageCircle size={17} /> Confirmar por WhatsApp
            </a>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <span className="fp-btn__spinner" style={{ width: 13, height: 13 }} aria-hidden="true" />
              <span style={{ fontSize: 12.5, color: 'var(--dash-text-faint)' }}>Esperando tu confirmación...</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
