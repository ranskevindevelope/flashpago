// gmail-push.js — Aviso inmediato: Gmail avisa por Pub/Sub cuando llega un correo a una cuenta con
// el aviso activado, y ese negocio se revisa al instante. La revisión periódica queda de respaldo.
// Hace falta GMAIL_PUSH_TOPIC (projects/<proyecto>/topics/<tema>) y GMAIL_PUSH_SECRET; sin ellos
// no hace nada y todo sigue con la revisión periódica.
const crypto = require('crypto');
const { listarNegocios, negociosPorCorreoGmail } = require('../db');
const { activarAvisoGmail, detenerAvisoGmail } = require('../gmail');
const { revisarNegocioYa, marcarAvisoInmediato, quitarAvisoInmediato, vencimientoDelAviso } = require('./auto-registro');
const salud = require('../salud');

const RENOVAR_ANTES_MS = 36 * 60 * 60 * 1000; // el aviso dura 7 días; se renueva con margen

const habilitado = () => Boolean(process.env.GMAIL_PUSH_TOPIC && process.env.GMAIL_PUSH_SECRET);

// Se comparan los hashes para que el tiempo de respuesta no delate cuántos caracteres coinciden.
function secretoValido(recibido) {
  const esperado = process.env.GMAIL_PUSH_SECRET || '';
  if (!esperado || typeof recibido !== 'string') return false;
  const hash = (texto) => crypto.createHash('sha256').update(texto).digest();
  return crypto.timingSafeEqual(hash(recibido), hash(esperado));
}

// El cuerpo de Pub/Sub trae message.data en base64, con { emailAddress, historyId }.
function correoDeNotificacion(cuerpo) {
  try {
    const datos = JSON.parse(Buffer.from(cuerpo.message.data, 'base64').toString('utf8'));
    return typeof datos.emailAddress === 'string' ? datos.emailAddress.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

// Devuelve los negocios cuya revisión se puso en marcha. No espera a que termine.
async function procesarNotificacion(cuerpo) {
  const correo = correoDeNotificacion(cuerpo);
  if (!correo) return [];
  const disparados = [];
  for (const id of await negociosPorCorreoGmail(correo)) {
    if (await revisarNegocioYa(id)) disparados.push(id);
  }
  return disparados;
}

async function activarAvisoNegocio(negocio_id) {
  if (!habilitado()) return false;
  try {
    const resultado = await activarAvisoGmail(negocio_id, process.env.GMAIL_PUSH_TOPIC);
    if (!resultado || !resultado.expira) return false;
    marcarAvisoInmediato(negocio_id, resultado.expira);
    return true;
  } catch (err) {
    quitarAvisoInmediato(negocio_id);
    console.error(`[GmailPush] No se pudo activar el aviso inmediato (negocio ${negocio_id}):`, err.message);
    salud.registrar('registro_auto', 'No se pudo activar el aviso inmediato; se revisa cada pocos segundos', negocio_id);
    return false;
  }
}

async function desactivarAvisoNegocio(negocio_id) {
  quitarAvisoInmediato(negocio_id);
  if (!habilitado()) return;
  // Sin Gmail o sin permiso ya no hay nada que detener.
  await detenerAvisoGmail(negocio_id).catch(() => {});
}

// Cada hora activa o renueva el aviso de los negocios automáticos; al reiniciar el servidor vuelve a activarlos todos.
async function renovarAvisos() {
  if (!habilitado()) return;
  const automaticos = (await listarNegocios()).filter((n) => n.modo_registro === 'automatico');
  for (const negocio of automaticos) {
    if (vencimientoDelAviso(negocio.id) - Date.now() > RENOVAR_ANTES_MS) continue;
    await activarAvisoNegocio(negocio.id);
  }
}

module.exports = {
  habilitado, secretoValido, correoDeNotificacion, procesarNotificacion,
  activarAvisoNegocio, desactivarAvisoNegocio, renovarAvisos,
};
