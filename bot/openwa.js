const fetch = require('node-fetch');
const fs = require('fs');
const config = require('../config');

const OPENWA_URL = config.OPENWA_URL;
const OPENWA_KEY = config.OPENWA_KEY;
const OPENWA_SESSION = config.OPENWA_SESSION;

function normalizarNumero(to) {
  return to.replace('@lid', '').replace('@c.us', '');
}

// Revisa de verdad si el envío salió. Antes se registraba "Mensaje enviado"
// pasara lo que pasara, así que un rechazo del proveedor (token vencido,
// sesión caída, o la ventana de 24 h de Meta) quedaba invisible: el bot se
// veía sano mientras nadie recibía nada.
//
// No lanza excepción a propósito: un aviso que no sale no debe tumbar el
// procesamiento del pago, que es lo importante. Pero sí queda en el log
// como error, no como éxito.
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
  return false;
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
    console.error('[Bot] Error enviando mensaje:', err.message);
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
    return false;
  }
}

// ─── Proveedor: API oficial de Meta (respaldo) ────────────
// Usa el fetch global de Node (18+), no node-fetch, porque necesita
// FormData/Blob nativos para subir imágenes sin agregar dependencias.
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
    // Error 131047: fuera de la ventana de 24 h. Meta solo deja mandar texto
    // libre a quien te escribió en las últimas 24 horas; para el resto exige
    // una plantilla aprobada. Afecta a los mensajes proactivos (reporte
    // diario, verificaciones nocturnas), no a las respuestas.
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

// ─── Switch de proveedor ───────────────────────────────────
async function enviarMensaje(to, body) {
  if (config.WA_PROVIDER === 'meta') return enviarMensajeMeta(to, body);
  return enviarMensajeOpenwa(to, body);
}

async function enviarImagen(to, rutaFoto, caption) {
  if (config.WA_PROVIDER === 'meta') return enviarImagenMeta(to, rutaFoto, caption);
  return enviarImagenOpenwa(to, rutaFoto, caption);
}

// ─── Estado de la sesión de WhatsApp ───────────────────────
// Si la sesión se cae, el bot deja de recibir comprobantes sin avisar y el
// negocio se entera cuando un cliente reclama. Esto permite mostrarlo.
//
// Solo aplica al proveedor open-wa: la API de Meta no tiene "sesión" que se
// caiga. Ante cualquier duda devuelve 'desconocido' en vez de 'desconectado',
// para no alarmar por un problema de red o una API distinta a la esperada.
async function estadoSesionWhatsapp() {
  if (config.WA_PROVIDER === 'meta') {
    return { estado: 'oficial', detalle: 'Usando la API oficial de Meta' };
  }

  try {
    const controlador = new AbortController();
    const corte = setTimeout(() => controlador.abort(), 4000);
    const res = await fetch(`${OPENWA_URL}/api/sessions/${OPENWA_SESSION}`, {
      headers: { 'X-API-Key': OPENWA_KEY },
      signal: controlador.signal,
    });
    clearTimeout(corte);

    if (!res.ok) {
      return { estado: 'desconocido', detalle: `El servidor respondió ${res.status}` };
    }

    const data = await res.json();
    const crudo = typeof data?.status === 'string' ? data.status.toUpperCase() : null;
    if (!crudo) return { estado: 'desconocido', detalle: 'La respuesta no trae estado' };

    if (crudo === 'WORKING') return { estado: 'conectado', detalle: 'El bot está recibiendo mensajes', crudo };
    if (crudo === 'SCAN_QR_CODE') return { estado: 'desconectado', detalle: 'Falta escanear el código QR', crudo };
    if (crudo === 'STARTING') return { estado: 'iniciando', detalle: 'La sesión está arrancando', crudo };
    return { estado: 'desconectado', detalle: `La sesión está en estado ${crudo}`, crudo };
  } catch (err) {
    const corto = err.name === 'AbortError';
    return {
      estado: 'desconocido',
      detalle: corto ? 'El servidor de WhatsApp no respondió a tiempo' : 'No se pudo consultar el servidor de WhatsApp',
    };
  }
}

module.exports = { enviarMensaje, enviarImagen, descargarMediaMeta, estadoSesionWhatsapp };
