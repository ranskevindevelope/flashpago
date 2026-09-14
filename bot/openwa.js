const fetch = require('node-fetch');
const fs = require('fs');
const config = require('../config');
const salud = require('../salud');
const plantillas = require('./plantillas');

const OPENWA_URL = config.OPENWA_URL;
const OPENWA_KEY = config.OPENWA_KEY;
const OPENWA_SESSION = config.OPENWA_SESSION;

function normalizarNumero(to) {
  return to.replace('@lid', '').replace('@c.us', '');
}

// Revisa si el envío salió de verdad (antes se registraba "enviado" pasara
// lo que pasara). No lanza excepción: un aviso fallido no debe tumbar el
// procesamiento del pago, pero sí queda logueado como error.
function revisarEnvio(etiqueta, destino, res, data) {
  const errorApi = data?.error || data?.message || data?.err;
  if (res.ok && !errorApi) {
    console.log(`${etiqueta} Enviado a ${destino}`);
    return true;
  }
  const motivo = errorApi
    ? (typeof errorApi === 'string' ? errorApi : JSON.stringify(errorApi))
    : `HTTP ${res.status}`;
  console.error(`${etiqueta} FALLÓ el envío a ${destino}: ${motivo}`);
  // Motivo de sesión/QR se clasifica aparte: WhatsApp desvinculado, no un
  // simple mensaje fallido.
  salud.registrar(esProblemaDeSesion(motivo) ? 'sesion' : 'envio', motivo);
  return false;
}

function esProblemaDeSesion(motivo) {
  return /session|qr|not connected|unpaired|logged out|disconnect/i.test(motivo || '');
}

// ─── Proveedor: open-wa (no oficial) ──────────────────────
async function enviarMensajeOpenwa(to, body) {
  try {
    const chatId = `${normalizarNumero(to)}@c.us`;

    const res = await fetch(
      `${OPENWA_URL}/api/sessions/${OPENWA_SESSION}/messages/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': OPENWA_KEY,
        },
        body: JSON.stringify({ chatId, text: body }),
      }
    );
    const data = await res.json().catch(() => ({}));
    return revisarEnvio('[Bot]', chatId, res, data);
  } catch (err) {
    // El servidor de open-wa no respondió: apagado, puerto cerrado o timeout.
    console.error('[Bot] Error enviando mensaje:', err.message);
    salud.registrar('conexion', err.message);
    return false;
  }
}

async function enviarImagenOpenwa(to, rutaFoto, caption) {
  try {
    const chatId = `${normalizarNumero(to)}@c.us`;

    const imagenBuffer = fs.readFileSync(rutaFoto);
    const imagenBase64 = imagenBuffer.toString('base64');

    const res = await fetch(
      `${OPENWA_URL}/api/sessions/${OPENWA_SESSION}/messages/send-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': OPENWA_KEY,
        },
        body: JSON.stringify({
          chatId,
          base64: imagenBase64,
          mimetype: 'image/jpeg',
          caption: caption || '',
        }),
      }
    );
    const data = await res.json().catch(() => ({}));
    return revisarEnvio('[Bot] (imagen)', chatId, res, data);
  } catch (err) {
    console.error('[Bot] Error enviando imagen:', err.message);
    salud.registrar('conexion', err.message);
    return false;
  }
}

// Resuelve un @lid (id de privacidad de WhatsApp) al numero real, best-effort.
// Devuelve null si WhatsApp todavia no le reveló el numero a esta cuenta.
async function resolverLid(lid) {
  try {
    const res = await fetch(
      `${OPENWA_URL}/api/sessions/${OPENWA_SESSION}/contacts/${encodeURIComponent(lid)}/phone`,
      { headers: { 'X-API-Key': OPENWA_KEY } }
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.phone || null;
  } catch (err) {
    console.error('[Bot] Error resolviendo LID:', err.message);
    return null;
  }
}

// ─── Proveedor: API oficial de Meta (respaldo) ────────────
// Fetch global de Node (18+), no node-fetch: necesita FormData/Blob nativos.
function metaHeaders(extra) {
  return { Authorization: `Bearer ${config.META_ACCESS_TOKEN}`, ...extra };
}

async function enviarMensajeMeta(to, body) {
  try {
    const numero = normalizarNumero(to);
    const url = `https://graph.facebook.com/${config.META_API_VERSION}/${config.META_PHONE_NUMBER_ID}/messages`;
    const res = await globalThis.fetch(url, {
      method: 'POST',
      headers: metaHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: numero,
        type: 'text',
        text: { body, preview_url: false },
      }),
    });
    const data = await res.json().catch(() => ({}));
    const ok = revisarEnvio('[Bot][Meta]', numero, res, data);
    // 131047: fuera de la ventana de 24h de Meta, exige plantilla aprobada.
    // Afecta mensajes proactivos (reporte diario, verificaciones), no respuestas.
    if (!ok && String(data?.error?.code) === '131047') {
      console.error('[Bot][Meta] Fuera de la ventana de 24 h: este mensaje necesita una plantilla aprobada por Meta.');
    }
    return ok;
  } catch (err) {
    console.error('[Bot][Meta] Error enviando mensaje:', err.message);
    return false;
  }
}

async function enviarImagenMeta(to, rutaFoto, caption) {
  try {
    const numero = normalizarNumero(to);
    const mimetype = 'image/jpeg';
    const buffer = fs.readFileSync(rutaFoto);

    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', mimetype);
    form.append('file', new Blob([buffer], { type: mimetype }), 'comprobante.jpg');

    const uploadRes = await globalThis.fetch(
      `https://graph.facebook.com/${config.META_API_VERSION}/${config.META_PHONE_NUMBER_ID}/media`,
      { method: 'POST', headers: metaHeaders(), body: form }
    );
    const uploadData = await uploadRes.json();
    if (!uploadData.id) {
      console.error('[Bot][Meta] Error subiendo imagen:', JSON.stringify(uploadData));
      return;
    }

    const res = await globalThis.fetch(
      `https://graph.facebook.com/${config.META_API_VERSION}/${config.META_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: metaHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: numero,
          type: 'image',
          image: { id: uploadData.id, caption: caption || '' },
        }),
      }
    );
    const data = await res.json().catch(() => ({}));
    return revisarEnvio('[Bot][Meta] (imagen)', numero, res, data);
  } catch (err) {
    console.error('[Bot][Meta] Error enviando imagen:', err.message);
    return false;
  }
}

// Resuelve un media id de un mensaje entrante de Meta a base64.
// La usa routes/webhook.js cuando WA_PROVIDER=meta y llega una imagen.
async function descargarMediaMeta(mediaId) {
  const metaRes = await globalThis.fetch(
    `https://graph.facebook.com/${config.META_API_VERSION}/${mediaId}`,
    { headers: metaHeaders() }
  );
  const metaData = await metaRes.json();
  if (!metaData.url) throw new Error('No se pudo resolver la URL del medio: ' + JSON.stringify(metaData));

  const fileRes = await globalThis.fetch(metaData.url, { headers: metaHeaders() });
  const arrayBuffer = await fileRes.arrayBuffer();
  return { base64: Buffer.from(arrayBuffer).toString('base64'), mimetype: metaData.mime_type };
}

// ─── Plantillas (mensajes proactivos) ─────────────────────
// Fuera de la ventana de 24h, Meta solo acepta plantillas aprobadas; openwa
// no distingue, recibe el texto ya sustituido.
async function enviarPlantillaMeta(to, clave, variables) {
  try {
    const numero = normalizarNumero(to);
    const url = `https://graph.facebook.com/${config.META_API_VERSION}/${config.META_PHONE_NUMBER_ID}/messages`;
    const res = await globalThis.fetch(url, {
      method: 'POST',
      headers: metaHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(plantillas.cargaMeta(clave, variables, numero)),
    });
    const data = await res.json().catch(() => ({}));
    const ok = revisarEnvio(`[Bot][Meta][${clave}]`, numero, res, data);
    // 132001: la plantilla no existe o no esta aprobada en la cuenta de Meta.
    // Es un fallo de configuracion, no del mensaje: conviene que se distinga.
    if (!ok && String(data?.error?.code) === '132001') {
      console.error(`[Bot][Meta] La plantilla "${clave}" no esta aprobada en tu cuenta de WhatsApp Business.`);
    }
    return ok;
  } catch (err) {
    console.error('[Bot][Meta] Error enviando plantilla:', err.message);
    return false;
  }
}

// ─── Switch de proveedor ───────────────────────────────────
async function enviarMensaje(to, body) {
  if (config.WA_PROVIDER === 'meta') return enviarMensajeMeta(to, body);
  return enviarMensajeOpenwa(to, body);
}

async function enviarImagen(to, rutaFoto, caption) {
  if (config.WA_PROVIDER === 'meta') return enviarImagenMeta(to, rutaFoto, caption);
  return enviarImagenOpenwa(to, rutaFoto, caption);
}

// Migrar a Meta es cambiar WA_PROVIDER, quien llama a esto no se entera.
// `opciones.textoOpenwa`: las variables de plantilla de Meta no admiten
// saltos de línea (va resumida); openwa manda el mensaje completo.
async function enviarPlantilla(to, clave, variables = [], opciones = {}) {
  if (config.WA_PROVIDER === 'meta') return enviarPlantillaMeta(to, clave, variables);
  try {
    const texto = opciones.textoOpenwa || plantillas.renderizar(clave, variables);
    return enviarMensajeOpenwa(to, texto);
  } catch (err) {
    // Variables mal pasadas: mejor no enviar nada que mandarle un "{{2}}" al cliente.
    console.error(`[Bot] Plantilla "${clave}" mal usada:`, err.message);
    return false;
  }
}

module.exports = { enviarMensaje, enviarImagen, enviarPlantilla, descargarMediaMeta, resolverLid };
