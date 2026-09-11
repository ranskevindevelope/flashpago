// Estado vacío con ícono, en vez de una línea de texto gris perdida en medio
// de una tarjeta grande — mismo patrón que ya usaba "Método de pago".
export default function EstadoVacio({ icono, titulo, subtitulo, children }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      padding: '2.4rem 1.5rem', textAlign: 'center',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: 'var(--tint-orange-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icono}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dash-text)', marginBottom: subtitulo ? 3 : 0 }}>
          {titulo}
        </div>
        {subtitulo && (
          <div style={{ fontSize: 12.5, color: 'var(--dash-text-faint)' }}>{subtitulo}</div>
        )}
      </div>
      {children}
    </div>
  );
}
