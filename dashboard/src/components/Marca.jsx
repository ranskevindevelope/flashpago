import React from 'react';

// El nombre de la marca: logo + "FlashPago" en una sola pieza, para que no se parta ni cambie de una pantalla a otra.
// `pago` es el color de "Pago": blanco sobre fondo oscuro, tinta sobre fondo claro.
export default function Marca({ tam = 24, pago = '#ffffff', logo = true, style }) {
  const lado = Math.round(tam * 1.25);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: Math.round(tam * 0.4), color: '#F57C00', whiteSpace: 'nowrap',
      fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: tam, lineHeight: 1, letterSpacing: '-0.02em', ...style,
    }}>
      {logo && <img src="/logo-96.webp" alt="" width={lado} height={lado} style={{ display: 'block', flex: 'none', borderRadius: '22%' }} />}
      <span>Flash<span style={{ color: pago }}>Pago</span></span>
    </span>
  );
}
