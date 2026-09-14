// Último paso del onboarding: confirma por WhatsApp para capturar el
// identificador EXACTO (número real o @lid) que WhatsApp va a seguir usando,
// sin depender de resolverlo después (ver bot/openwa.js resolverLid).
// El código no lleva negocio_id: solo correlaciona el mensaje "confirmar
// <codigo>" con su negocio. Vive en memoria — si el proceso se reinicia, el
// usuario solo tiene que pedir el código de nuevo desde el dashboard.
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

// Busca el código entre los pendientes de cualquier negocio, sin importar
// de qué identificador venga el mensaje.
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

// ─── Mismo mecanismo para confirmar el WhatsApp de un empleado (no el
// admin) al agregarlo en "Usuarios". Map aparte para no chocar con los
// códigos de negocio (ambos IDs son enteros independientes).
const pendientesUsuario = new Map();

function prepararConfirmacionUsuario(usuario_id) {
  const codigo = crypto.randomBytes(3).toString('hex');
  pendientesUsuario.set(usuario_id, { codigo, expira: Date.now() + EXPIRACION_MS, confirmado: false, identificador: null });
  return codigo;
}

function estadoConfirmacionUsuario(usuario_id) {
  const p = pendientesUsuario.get(usuario_id);
  return { confirmado: !!p?.confirmado };
}

function buscarPorCodigoUsuario(codigo) {
  const codigoNorm = (codigo || '').trim().toLowerCase();
  const ahora = Date.now();
  for (const [usuario_id, datos] of pendientesUsuario) {
    if (datos.codigo === codigoNorm && !datos.confirmado && ahora <= datos.expira) {
      return usuario_id;
    }
  }
  return null;
}

function marcarConfirmadoUsuario(usuario_id, identificador) {
  const p = pendientesUsuario.get(usuario_id);
  if (!p) return;
  p.confirmado = true;
  p.identificador = identificador;
}

setInterval(() => {
  const ahora = Date.now();
  for (const [usuario_id, datos] of pendientesUsuario) {
    if (ahora > datos.expira) pendientesUsuario.delete(usuario_id);
  }
}, 5 * 60 * 1000).unref();

module.exports = {
  prepararConfirmacion, estadoConfirmacion, buscarPorCodigo, marcarConfirmado,
  prepararConfirmacionUsuario, estadoConfirmacionUsuario, buscarPorCodigoUsuario, marcarConfirmadoUsuario,
};
