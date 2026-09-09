// gmail.js — Verificación de pagos vía correos de Bancolombia, Nequi y BBVA (multi-negocio)
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { obtenerTokenGmail, guardarTokenGmail } = require('./db');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

// Remitentes de notificación de cada banco soportado
const REMITENTES_BANCOS = ['notificacionesbancolombia.com', 'notificaciones@nequi.com.co', 'notificacionesBreB@bbva.com'];
const QUERY_REMITENTES = `{${REMITENTES_BANCOS.map((r) => `from:${r}`).join(' ')}}`;

// BBVA escribe los decimales con coma al estilo colombiano: "$1.000,00" son mil
// pesos, no cien mil. La limpieza de los otros bancos solo reconoce decimales con
// punto, asi que sin esto un pago de $50.000 se leeria como 5.000.000 y no
// coincidiria nunca. Se deja aparte para no alterar el parseo de Bancolombia ni
// el de Nequi, que llevan tiempo funcionando.
function montoColombianoAEntero(texto) {
  let limpio = String(texto).trim();
  if (/,\d{2}$/.test(limpio)) limpio = limpio.slice(0, -3);
  const n = parseInt(limpio.replace(/[.,]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
}

// Extrae { monto, nombre } de un correo, según el banco remitente.
// Cada banco redacta distinto: Bancolombia usa "$60.800" y "pago de X por",
// Nequi usa "Recibiste 554 de X el" (sin signo $), y BBVA (Bre-B) pone el importe
// en una tabla de detalles bajo "Valor recibido".
//
// `cuerpo` es opcional y solo lo usa BBVA: su correo empieza con un parrafo largo
// y el importe queda fuera de los ~200 caracteres del snippet de Gmail. Los demas
// bancos siguen leyendo solo el snippet, igual que siempre.
function extraerMontoYNombre(snippet, remitente, cuerpo) {
  if (/bbva\.com/i.test(remitente || '')) {
    const texto = `${snippet || ''} ${cuerpo || ''}`.replace(/\s+/g, ' ');
    const mMonto = texto.match(/Valor\s+recibido\s*:?\s*\$?\s*([\d.,]+)/i);
    if (!mMonto) return null;
    const monto = montoColombianoAEntero(mMonto[1]);
    if (monto === null) return null;
    const mNombre = texto.match(/Persona\s+que\s+env[ií]a\s*:?\s*(.+?)\s*(?:Tipo\s+de\s+llave|Cuenta\s+destino|C[óo]digo\s+de\s+operaci[óo]n|$)/i);
    return { monto, nombre: mNombre ? mNombre[1].trim() : null };
  }

  if (/nequi\.com\.co/i.test(remitente || '')) {
    const match = snippet.match(/Recibiste\s+\$?\s?([\d.,]+)\s+de\s+(.+?)\s+el\s/i);
    if (!match) return null;
    let montoTexto = match[1];
    if (/\.\d{2}$/.test(montoTexto)) montoTexto = montoTexto.slice(0, -3);
    const monto = parseInt(montoTexto.replace(/[.,]/g, ''));
    if (isNaN(monto)) return null;
    return { monto, nombre: match[2].trim() };
  }

  // Bancolombia (por defecto)
  const match = snippet.match(/\$\s?([\d.,]+)/);
  if (!match) return null;
  let montoTexto = match[1];
  if (/\.\d{2}$/.test(montoTexto)) montoTexto = montoTexto.slice(0, -3);
  const monto = parseInt(montoTexto.replace(/[.,]/g, ''));
  if (isNaN(monto)) return null;
  const matchNombre = snippet.match(/pago de (.+?) por/i);
  return { monto, nombre: matchNombre ? matchNombre[1].trim() : null };
}

// Texto plano del cuerpo del mensaje. Solo se usa para BBVA; pedirlo para todos
// gastaria memoria sin ganar nada, porque el resto cabe en el snippet.
function textoDelCuerpo(payload) {
  let salida = '';
  const visitar = (parte) => {
    if (!parte) return;
    const datos = parte.body && parte.body.data;
    if (datos && (parte.mimeType === 'text/plain' || parte.mimeType === 'text/html')) {
      salida += ' ' + Buffer.from(datos, 'base64').toString('utf8');
    }
    (parte.parts || []).forEach(visitar);
  };
  visitar(payload);
  return salida.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ');
}

// Devuelve el texto sobre el que analizar el correo: el snippet basta para
// Bancolombia y Nequi; BBVA necesita ademas el cuerpo.
function cuerpoSiHaceFalta(detalle, remitente) {
  if (!/bbva\.com/i.test(remitente || '')) return undefined;
  return textoDelCuerpo(detalle && detalle.data && detalle.data.payload);
}

function obtenerRemitente(mensajeDetalle) {
  const headers = mensajeDetalle?.data?.payload?.headers || [];
  const from = headers.find((h) => h.name === 'From');
  return from ? from.value : '';
}

// Fallback: token.json del archivo para negocio 1 (retrocompatibilidad)
const TOKEN_PATH = path.join(__dirname, 'token.json');

let credentialsCache = null;

function getCredentials() {
  if (!credentialsCache) {
    credentialsCache = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  }
  return credentialsCache;
}

// ─── Obtener auth OAuth2 por negocio ────────────────────
async function getAuth(negocio_id) {
  const credentials = getCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris?.[0]);

  // Intentar token de BD para este negocio
  const tokenDB = await obtenerTokenGmail(negocio_id);

  if (tokenDB) {
    oAuth2Client.setCredentials({
      access_token: tokenDB.access_token,
      refresh_token: tokenDB.refresh_token,
      expiry_date: tokenDB.expiry_date,
    });

    // Listener: si Google refresca el token, guardarlo en BD
    oAuth2Client.on('tokens', async (newTokens) => {
      try {
        await guardarTokenGmail(negocio_id, {
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expiry_date: newTokens.expiry_date,
          email: tokenDB.email,
        });
        console.log(`[Gmail] Token refrescado para negocio ${negocio_id}`);
      } catch (e) {
        console.error(`[Gmail] Error guardando token refrescado:`, e.message);
      }
    });

    console.log(`[Gmail] Usando token de BD para negocio ${negocio_id} (${tokenDB.email})`);
    return oAuth2Client;
  }

  // Fallback: token.json del archivo solo para negocio 1
  if (negocio_id === 1 && fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    console.log('[Gmail] Usando token.json (fallback negocio 1)');
    return oAuth2Client;
  }

  return null;
}

// ─── Función principal con reintentos ─────────────────────
async function verificarPorGmail(montoEsperado, negocio_id = 1, opciones = {}) {
  const maxIntentos = opciones.intentos || 4;
  const esperaMs = opciones.esperaMs || 10000;

  const auth = await getAuth(negocio_id);
  if (!auth) {
    console.log(`[Gmail] Negocio ${negocio_id} no tiene Gmail conectado`);
    return null;
  }

  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      const resultado = await buscarEnGmail(auth, montoEsperado);

      if (resultado) {
        console.log(`[Gmail] ✅ Pago encontrado al intento ${intento} (negocio ${negocio_id})`);
        return resultado;
      }

      if (intento < maxIntentos) {
        console.log(`[Gmail] Intento ${intento}/${maxIntentos} sin resultado. Reintentando en ${esperaMs / 1000}s...`);
        await new Promise(r => setTimeout(r, esperaMs));
      }
    } catch (err) {
      console.error(`[Gmail] Error intento ${intento}:`, err.message);
      if (intento === maxIntentos) return null;
    }
  }

  console.log(`[Gmail] No se encontró el pago después de todos los intentos (negocio ${negocio_id})`);
  return null;
}

// ─── Función interna que hace la búsqueda real ────────────
async function buscarEnGmail(auth, montoEsperado) {
  try {
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.messages.list({
      userId: 'me',
      q: `${QUERY_REMITENTES} is:unread newer_than:1d`,
      maxResults: 10,
    });

    if (!res.data.messages || res.data.messages.length === 0) {
      console.log('[Gmail] No hay correos nuevos de bancos soportados');
      return null;
    }

    const montoBuscado = parseInt(montoEsperado);

    for (const msg of res.data.messages) {
      const detalle = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const snippet = detalle.data.snippet || '';
      const remitente = obtenerRemitente(detalle);
      console.log('[Gmail] Revisando correo:', snippet);

      const cuerpo = cuerpoSiHaceFalta(detalle, remitente);
      const extraido = extraerMontoYNombre(snippet, remitente, cuerpo);
      if (!extraido) continue;
      const { monto: montoCorreo, nombre: nombreCliente } = extraido;

      if (montoCorreo === montoBuscado) {
        console.log(`[Gmail] ✅ Pago encontrado: $${montoCorreo}`);
        if (nombreCliente) console.log('[Gmail] Cliente:', nombreCliente);

        // Marcar como leído es solo limpieza (evita reprocesar el mismo correo);
        // si falla (ej. el token no tiene el scope gmail.modify) no debe tumbar
        // un pago que ya se encontró y verificó correctamente.
        try {
          await gmail.users.messages.modify({
            userId: 'me',
            id: msg.id,
            requestBody: { removeLabelIds: ['UNREAD'] },
          });
        } catch (errModify) {
          console.error('[Gmail] No se pudo marcar el correo como leído (no afecta la verificación):', errModify.message);
        }

        return { monto: montoCorreo, fuente: 'Gmail', nombre: nombreCliente };
      }
    }

    console.log('[Gmail] No se encontró coincidencia de monto');
    return null;

  } catch (err) {
    console.error('[Gmail] Error:', err.message);
    return null;
  }
}

// ─── Listar ingresos (transferencias recibidas) del día ───────
//  No filtra por un monto específico: devuelve TODOS los ingresos detectados
//  en notificaciones de bancos soportados de las últimas 24h para un negocio.
async function listarIngresosDelDia(negocio_id = 1) {
  const auth = await getAuth(negocio_id);
  if (!auth) {
    console.log(`[Gmail] Negocio ${negocio_id} no tiene Gmail conectado`);
    return [];
  }

  try {
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.messages.list({
      userId: 'me',
      q: `${QUERY_REMITENTES} newer_than:1d is:unread`,
      maxResults: 20,
    });

    if (!res.data.messages || res.data.messages.length === 0) {
      console.log('[Gmail] No hay correos de bancos soportados del día');
      return [];
    }

    const ingresos = [];

    for (const msg of res.data.messages) {
      const detalle = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const snippet = detalle.data.snippet || '';
      const remitente = obtenerRemitente(detalle);
      const cuerpo = cuerpoSiHaceFalta(detalle, remitente);

      // Los filtros miran el mismo texto que el parser. Para Bancolombia y Nequi
      // `cuerpo` es undefined, asi que esto es exactamente el snippet de siempre;
      // BBVA necesita el cuerpo porque su snippet no dice "recibido" por ningun lado.
      const textoFiltros = cuerpo ? `${snippet} ${cuerpo}` : snippet;

      // ❌ Excluir retiros / salidas de dinero (evitar falsos "ingresos")
      if (/retiraste|retiró|retiro|debitaste|pagaste|descont|cajero|de tu t\.deb|de tu t deb|de su t\.deb|compra|compraste|folios?|avance|retiro en/i.test(textoFiltros)) {
        continue;
      }

      // ✅ Requerir señales claras de INGRESO (transferencias recibidas)
      if (!/recibiste|recibido|recibida|recibimos|consignaci|abono|un pago de|una transferencia|transferencia de|te hicieron|te realizaron|a tu cuenta|a su cuenta|ingresó|ingreso de|depósito|deposito/i.test(textoFiltros)) {
        continue;
      }

      const extraido = extraerMontoYNombre(snippet, remitente, cuerpo);
      if (!extraido) continue;

      ingresos.push({ monto: extraido.monto, nombre: extraido.nombre, snippet });
    }

    console.log(`[Gmail] Ingresos detectados del día (negocio ${negocio_id}): ${ingresos.length}`);
    return ingresos;

  } catch (err) {
    console.error('[Gmail] Error listando ingresos:', err.message);
    return [];
  }
}

module.exports = { verificarPorGmail, listarIngresosDelDia, extraerMontoYNombre };