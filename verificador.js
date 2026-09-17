// verificador.js — Respaldo cuando Gmail no logra confirmar el pago
function verificarPago({ monto }) {
  if (!monto) {
    return {
      estado: 'INCOMPLETO',
      mensaje: '⚠️ No pude leer bien el comprobante. Pide al cliente otro pantallazo más claro.',
    };
  }

  return {
    estado: 'NO_ENCONTRADO',
    mensaje: '⚠️ ADVERTENCIA: No encontré esta transacción. intenta de nuevo.',
  };
}

module.exports = { verificarPago };
