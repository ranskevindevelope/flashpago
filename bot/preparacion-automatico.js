// preparacion-automatico.js — Comprobaciones antes de activar el registro automático.
// Cada paso es real: conexión con Gmail, avisos del banco, velocidad, plan y pagos pendientes.
const {
  obtenerNegocio, verificarTrialActivo, contarComprobantesDelMes, topeConMargen, pagosEsperandoCorreo,
} = require('../db');
const { probarGmailAutomatico } = require('../gmail');
const { PLAZO_CORREO_MIN } = require('./pendientes');

const UMBRAL_LENTO_MS = 4000;

function textoErrorGmail(err) {
  const texto = `${(err && err.message) || ''} ${(err && err.code) || ''}`;
  if (/invalid_grant|invalid_token|unauthorized|revoked|\b401\b/i.test(texto)) {
    return 'El permiso de tu cuenta venció o se revocó. Desconecta la verificación en la tarjeta de arriba y vuelve a conectarla.';
  }
  if (/timeout|timed out|ETIMEDOUT|ECONNRESET|ENOTFOUND/i.test(texto)) {
    return 'No hubo respuesta a tiempo. Intenta de nuevo en un momento.';
  }
  return 'No se pudieron consultar tus avisos del banco. Intenta de nuevo; si sigue, reconecta la verificación.';
}

function listaDeBancos(bancos) {
  if (bancos.length <= 1) return bancos[0] || '';
  return `${bancos.slice(0, -1).join(', ')} y ${bancos[bancos.length - 1]}`;
}

function tiempoLegible(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1).replace('.', ',')} s` : `${ms} ms`;
}

// Devuelve { listo, hayAvisos, pasos }. Cada paso: { clave, estado: ok | aviso | error | omitido, detalle }.
// "error" bloquea la activación; "aviso" deja decidir al cliente.
async function verificarPreparacion(negocio_id, { umbralLentoMs = UMBRAL_LENTO_MS } = {}) {
  const pasos = [];
  const paso = (clave, estado, detalle) => pasos.push({ clave, estado, detalle });

  // 1-3. Gmail: conexión, avisos del banco y velocidad.
  let gmail = null;
  let fallo = null;
  try {
    gmail = await probarGmailAutomatico(negocio_id);
  } catch (err) {
    fallo = err;
  }
  if (fallo || !gmail) {
    paso('conexion', 'error', fallo ? textoErrorGmail(fallo) : 'La verificación de tus avisos del banco no está conectada. Actívala en la tarjeta de arriba.');
    paso('notificaciones', 'omitido', 'Primero hace falta la conexión.');
    paso('velocidad', 'omitido', 'Primero hace falta la conexión.');
  } else {
    paso('conexion', 'ok', 'Conexión con tus avisos del banco lista.');
    if (gmail.bancos.length) {
      paso('notificaciones', 'ok', `Encontré avisos de ${listaDeBancos(gmail.bancos)} en los últimos 30 días.`);
    } else {
      paso('notificaciones', 'aviso', 'No encontré avisos de Nequi, Bancolombia ni BBVA en los últimos 30 días. ¿Conectaste la cuenta que recibe los avisos de tu banco?');
    }
    if (gmail.ms >= umbralLentoMs) {
      paso('velocidad', 'aviso', `La lectura de tus avisos es lenta (${tiempoLegible(gmail.ms)}). Funcionará, pero los pagos pueden tardar más en aparecer.`);
    } else {
      paso('velocidad', 'ok', `Tus avisos del banco se leen en ${tiempoLegible(gmail.ms)}.`);
    }
  }

  // 4. Plan vigente y con cupo.
  const negocio = await obtenerNegocio(negocio_id);
  const vigencia = negocio ? await verificarTrialActivo(negocio_id).catch(() => ({ activo: true })) : { activo: false };
  if (!negocio) {
    paso('plan', 'error', 'No encontré el negocio.');
  } else if (!vigencia.activo) {
    paso('plan', 'error', vigencia.razon === 'plan_vencido'
      ? 'Tu plan venció. Renuévalo para activar el registro automático.'
      : 'Tu prueba terminó. Elige un plan para activar el registro automático.');
  } else if (negocio.plan_ilimitado) {
    paso('plan', 'ok', 'Plan vigente.');
  } else {
    const usados = await contarComprobantesDelMes(negocio_id);
    const limite = negocio.limite_comprobantes;
    if (usados >= topeConMargen(limite)) {
      paso('plan', 'error', 'Llegaste al límite de comprobantes de este mes. Mejora tu plan para seguir.');
    } else if (usados >= limite) {
      paso('plan', 'aviso', 'Ya pasaste el límite de tu plan y estás usando el margen de cortesía.');
    } else {
      paso('plan', 'ok', 'Plan vigente.');
    }
  }

  // 5. Pantallazos que todavía esperan su correo: si se activa ahora, podrían salir como "no encontrado".
  const pendientes = await pagosEsperandoCorreo({ negocio_id, minutos: PLAZO_CORREO_MIN });
  if (pendientes.length) {
    paso('pendientes', 'aviso', `Hay ${pendientes.length} pantallazo(s) esperando su correo del banco. Espera unos minutos a que terminen, o actívalo igual.`);
  } else {
    paso('pendientes', 'ok', 'No hay pantallazos pendientes.');
  }

  return {
    listo: !pasos.some((p) => p.estado === 'error'),
    hayAvisos: pasos.some((p) => p.estado === 'aviso'),
    pasos,
  };
}

module.exports = { verificarPreparacion };
