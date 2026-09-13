// Último paso del onboarding: tras conectar Gmail (obligatorio para
// verificar pagos), el negocio confirma por WhatsApp para que el bot
// capture el identificador EXACTO (número real o @lid) con el que WhatsApp
// lo va a seguir presentando siempre — así no dependemos de resolver un
// @lid después, cosa que no siempre es posible (ver bot/openwa.js
// resolverLid: WhatsApp no siempre revela el número real).
//
// El código de confirmación no lleva negocio_id ni ningún dato del negocio:
// solo sirve para que, cuando llegue el mensaje "confirmar <codigo>" desde
// un identificador cualquiera, se pueda saber a qué negocio pertenece sin
// tener que adivinar por número. Vive en memoria — se pierde si el proceso
// se reinicia, pero es aceptable porque el usuario solo tiene que darle de
// nuevo al botón "Confirmar por WhatsApp" en el dashboard.
const crypto = require('crypto');

const EXPIRACION_MS = 15 * 60 * 1000; // 15 minutos

// negocio_id -> { codigo, expira, confirmado, identificador }
const pendientes = new Map();

function prepararConfirmacion(negocio_id) {
  const codigo = crypto.randomBytes(3).toString('hex'); // 6 caracteres hex
  pendientes.set(negocio_id, { codigo, expira: Date.now() + EXPIRACION_MS, confirmado: false, identificador: null });
  return codigo;
}

function estadoConfirmacion(negocio_id) {
  const p = pendientes.get(negocio_id);
  return { confirmado: !!p?.confirmado };
}

// Busca, entre los códigos pendientes de cualquier negocio, cuál coincide
// (y no ha expirado ni fue usado ya). No importa de qué identificador venga
// el mensaje — el código es lo único que correlaciona.
function buscarPorCodigo(codigo) {
  const codigoNorm = (codigo || '').trim().toLowerCase();
  const ahora = Date.now();
  for (const [negocio_id, datos] of pendientes) {
    if (datos.codigo === codigoNorm && !datos.confirmado && ahora <= datos.expira) {
      return negocio_id;
    }
  }
  return null;
}

function marcarConfirmado(negocio_id, identificador) {
  const p = pendientes.get(negocio_id);
  if (!p) return;
  p.confirmado = true;
  p.identificador = identificador;
}

// Limpieza periódica de códigos vencidos para no acumular memoria.
// .unref(): que no mantenga vivo el proceso solo por este timer.
setInterval(() => {
  const ahora = Date.now();
  for (const [negocio_id, datos] of pendientes) {
    if (ahora > datos.expira) pendientes.delete(negocio_id);
  }
}, 5 * 60 * 1000).unref();

module.exports = { prepararConfirmacion, estadoConfirmacion, buscarPorCodigo, marcarConfirmado };
