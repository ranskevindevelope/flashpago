// pendientes.js — Pagos "no encontrado": el correo del banco a veces llega tarde
// (hasta ~10 min), así que se sigue buscando durante 15 minutos.
const { obtenerNegocio, pagosEsperandoCorreo, confirmarPagoTardio, marcarSinCorreo } = require('../db');
const { verificarPorGmail } = require('../gmail');
const { enviarMensaje, enviarPlantilla } = require('./openwa');
const { obtenerAdminsNegocio } = require('./reportes');
const eventos = require('../eventos');

const PLAZO_CORREO_MIN = 15;     // demora máxima del banco (~10 min) más un margen
const MARGEN_ANTES_S = 60;       // el correo pudo llegar mientras se guardaba el pago
const AVISO_MAX_ATRASO_MIN = 60; // más viejos (ej. servidor caído) se resuelven en el cierre

let revisando = false;

// Corre cada 2 minutos (index.js). Con negocio_id revisa solo ese negocio.
// Devuelve { confirmados, esperando, sinCorreo }, o null si ya había otra revisión en curso.
async function revisarPendientes({ negocio_id } = {}) {
  if (revisando) return null;
  revisando = true;
  const resumen = { confirmados: 0, esperando: 0, sinCorreo: 0 };
  try {
    const pagos = await pagosEsperandoCorreo({ negocio_id, minutos: AVISO_MAX_ATRASO_MIN });
    for (const pago of pagos) {
      if (await buscarYConfirmar(pago)) {
        resumen.confirmados++;
      } else if (Date.now() / 1000 < vencimiento(pago)) {
        resumen.esperando++;
      } else if (await marcarSinCorreo(pago.id)) {
        resumen.sinCorreo++;
        await avisarSinCorreo(pago);
      }
    }
  } catch (err) {
    console.error('[Pendientes] Error revisando pagos pendientes:', err.message);
  } finally {
    revisando = false;
  }
  return resumen;
}

// Cierre de turno: último intento para los pendientes del día cuyo plazo ya venció
// (ej. si el servidor estuvo caído). Lo que no aparezca va al reporte, sin aviso aparte.
async function cerrarPendientes(negocio_id) {
  const pagos = await pagosEsperandoCorreo({ negocio_id, soloHoy: true });
  for (const pago of pagos) {
    if (Date.now() / 1000 < vencimiento(pago)) continue; // aún en plazo: sigue en revisarPendientes
    if (!(await buscarYConfirmar(pago))) await marcarSinCorreo(pago.id);
  }
}

function vencimiento(pago) {
  return pago.creado_epoch + PLAZO_CORREO_MIN * 60;
}

// Busca el correo del pago dentro de su plazo y, si aparece, lo confirma.
async function buscarYConfirmar(pago) {
  const correo = await verificarPorGmail(pago.monto, pago.negocio_id, {
    intentos: 1,
    esperaMs: 0,
    desde: pago.creado_epoch - MARGEN_ANTES_S,
    hasta: vencimiento(pago),
  });
  if (!correo) return false;

  try {
    const cambios = await confirmarPagoTardio(pago.id, { gmail_id: correo.gmail_id, nombre_cliente: correo.nombre });
    if (!cambios) return false; // otro proceso ya lo resolvió
  } catch (err) {
    // Ej. otro comprobante se quedó con ese mismo correo: este sigue pendiente.
    console.error(`[Pendientes] No se pudo confirmar el pago ${pago.id}:`, err.message);
    return false;
  }

  console.log(`[Pendientes] ✅ Llegó tarde el correo del pago ${pago.id} ($${pago.monto}, negocio ${pago.negocio_id})`);
  eventos.emitir(pago.negocio_id, 'pago', {
    id: pago.id,
    monto: pago.monto,
    banco: pago.banco || null,
    nombre_cliente: correo.nombre || null,
  });
  if (pago.verificado_por) {
    await enviarMensaje(pago.verificado_por, mensajeLlegoTarde(pago, correo.nombre));
  }
  return true;
}

// Mismo estilo que un pago confirmado normal, con lo necesario para saber de
// cuál pedido es: quien pagó (sale del correo del banco) y la hora del comprobante.
function mensajeLlegoTarde(pago, nombre) {
  const lineas = [`✅ PAGO CONFIRMADO (llegó tarde): $${pago.monto.toLocaleString('es-CO')}${nombre ? ` de ${nombre}` : ''}`];
  const hora = pago.hora ? horaCorta(pago.hora) : '';
  if (pago.referencia) lineas.push(`🔑 Referencia: ${pago.referencia}${hora ? ` — comprobante de las ${hora}` : ''}`);
  else if (hora) lineas.push(`🕐 Comprobante de las ${hora}`);
  lineas.push('', '✅ Puedes finalizar el pedido.');
  return lineas.join('\n');
}

// "8:10:05 p. m." -> "8:10 p. m."
function horaCorta(hora) {
  return String(hora).replace(/^(\d{1,2}:\d{2}):\d{2}/, '$1');
}

// No acusa: puede ser un pago real cuyo correo no llegó. Por eso pide revisar la app del banco.
async function avisarSinCorreo(pago) {
  let negocioNombre = 'FlashPago';
  try {
    const neg = await obtenerNegocio(pago.negocio_id);
    if (neg) negocioNombre = neg.nombre;
  } catch (_) {}

  const monto = `$${pago.monto.toLocaleString('es-CO')}`;
  const empleado = (pago.verificado_por || '').replace(/@.*$/, '');

  if (pago.verificado_por) {
    await enviarMensaje(pago.verificado_por,
      `⚠️ Pasaron ${PLAZO_CORREO_MIN} minutos y no llegó la notificación del banco del pago de ${monto}${referencia(pago)}. Quedó como no confirmado.`
    );
  }

  const mensaje =
    `⚠️ *${negocioNombre} — Pago sin confirmar*\n\n` +
    `Pasaron ${PLAZO_CORREO_MIN} minutos y no llegó la notificación del banco de este pago:\n\n` +
    `💵 ${monto}${referencia(pago)} — ${pago.hora || ''}\n` +
    (empleado ? `👤 Lo envió: ${empleado}\n` : '') +
    `\nRevísalo en la app del banco antes de darlo por pagado.`;
  for (const numero of await obtenerAdminsNegocio(pago.negocio_id)) {
    await enviarPlantilla(numero, 'pagos_no_confirmados', [negocioNombre, '1'], { textoOpenwa: mensaje });
  }
}

function referencia(pago) {
  return pago.referencia ? ` (Ref: ${pago.referencia})` : '';
}

module.exports = { revisarPendientes, cerrarPendientes, PLAZO_CORREO_MIN };
