// wompi.js — Pasarela de pagos para la suscripción de FlashPago
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const config = require('../config');
const { verificarToken, soloAdmin, limitarLogin } = require('../auth');
const {
  db,
  crearPagoPlataforma,
  obtenerPagoPlataforma,
  actualizarPagoPlataforma,
  marcarNegocioPagado,
  obtenerAdminDeNegocio,
  obtenerNegocio,
  PRECIOS_CENTAVOS,
  planBase,
  guardarMetodoPago,
  obtenerMetodoPago,
  eliminarMetodoPago,
  actualizarRenovarAutomatico,
} = require('../db');
const { enviarGraciasPago, enviarAvisoCobroFallido } = require('../mailer');

// ─── Configuración pública para el widget ──────────────────
router.get('/config', verificarToken, soloAdmin, (req, res) => {
  if (!config.WOMPI_PUBLIC_KEY) {
    return res.status(503).json({ ok: false, error: 'Wompi no está configurado todavía' });
  }
  // apiUrl: para que el navegador tokenice la tarjeta hablando directo con
  // Wompi (nunca por este servidor) sepa a qué URL pegarle, sin duplicar la
  // lógica sandbox/producción que ya vive en config.WOMPI_API_URL.
  res.json({ ok: true, publicKey: config.WOMPI_PUBLIC_KEY, ambiente: config.WOMPI_AMBIENTE, apiUrl: config.WOMPI_API_URL });
});

// ─── Generar referencia + firma de integridad para abrir el widget ──
router.post('/iniciar', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PRECIOS_CENTAVOS[plan]) {
      return res.status(400).json({ ok: false, error: 'Plan no válido' });
    }
    if (!config.WOMPI_PUBLIC_KEY || !config.WOMPI_INTEGRITY_SECRET) {
      return res.status(503).json({ ok: false, error: 'Wompi no está configurado todavía' });
    }

    const negocio_id = req.user.negocio_id;
    const monto = PRECIOS_CENTAVOS[plan]; // en centavos, el monto lo decide el servidor, nunca el cliente
    const referencia = `FP-${negocio_id}-${Date.now()}`;
    const currency = 'COP';

    const cadena = `${referencia}${monto}${currency}${config.WOMPI_INTEGRITY_SECRET}`;
    const signature = crypto.createHash('sha256').update(cadena).digest('hex');

    await crearPagoPlataforma({ negocio_id, referencia, plan, monto });

    res.json({
      ok: true,
      referencia,
      amountInCents: monto,
      currency,
      signature,
      publicKey: config.WOMPI_PUBLIC_KEY,
    });
  } catch (err) {
    console.error('[Wompi] Error iniciando pago:', err.message);
    res.status(500).json({ ok: false, error: 'Error iniciando el pago' });
  }
});

// ─── Transferencia bancaria manual (alternativa a Wompi) ────
// Guarda en memoria qué ADMIN (por su WhatsApp, no todo el negocio) está
// esperando mandar un comprobante de pago de suscripción, para que el
// webhook de WhatsApp sepa distinguirlo de un comprobante normal de
// cliente. Acotado a la persona (no al negocio) para que un empleado
// mandando un comprobante real de cliente en esa misma ventana no se
// confunda con el pago de plataforma. Expira a los 30 minutos.
const transferenciasEsperadas = new Map(); // whatsapp del admin -> { negocio_id, referencia, plan, montoPesos, expira }

function obtenerTransferenciaEsperada(whatsappRemitente) {
  const t = transferenciasEsperadas.get(whatsappRemitente);
  if (!t) return null;
  if (Date.now() > t.expira) {
    transferenciasEsperadas.delete(whatsappRemitente);
    return null;
  }
  return t;
}

function limpiarTransferenciaEsperada(whatsappRemitente) {
  transferenciasEsperadas.delete(whatsappRemitente);
}

router.post('/transferencia/iniciar', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PRECIOS_CENTAVOS[plan]) {
      return res.status(400).json({ ok: false, error: 'Plan no válido' });
    }
    if (!config.CUENTA_NUMERO) {
      return res.status(503).json({ ok: false, error: 'La transferencia bancaria no está configurada todavía' });
    }

    const negocio_id = req.user.negocio_id;

    const usuario = await new Promise((resolve, reject) => {
      db.get('SELECT whatsapp FROM usuarios WHERE id = ?', [req.user.id], (err, row) => {
        if (err) reject(err); else resolve(row);
      });
    });
    if (!usuario?.whatsapp) {
      return res.status(400).json({ ok: false, error: 'Tu usuario no tiene un WhatsApp registrado. Contacta soporte para activarlo manualmente.' });
    }
    const whatsappAdmin = usuario.whatsapp.includes('@') ? usuario.whatsapp : `${usuario.whatsapp}@c.us`;

    const monto = PRECIOS_CENTAVOS[plan]; // en centavos, igual que en Wompi
    const montoPesos = Math.round(monto / 100);
    const referencia = `FP-${negocio_id}-${Date.now()}`;

    await crearPagoPlataforma({ negocio_id, referencia, plan, monto });

    transferenciasEsperadas.set(whatsappAdmin, {
      negocio_id,
      referencia,
      plan,
      montoPesos,
      expira: Date.now() + 30 * 60 * 1000, // 30 minutos para mandar el comprobante
    });

    res.json({
      ok: true,
      referencia,
      montoPesos,
      whatsapp: config.FLASHPAGO_WHATSAPP,
      cuenta: {
        banco: config.CUENTA_BANCO,
        tipo: config.CUENTA_TIPO,
        numero: config.CUENTA_NUMERO,
        titular: config.CUENTA_TITULAR,
        nit: config.CUENTA_NIT,
      },
    });
  } catch (err) {
    console.error('[Transferencia] Error iniciando:', err.message);
    res.status(500).json({ ok: false, error: 'Error iniciando la transferencia' });
  }
});

// ─── Consultar el estado de un pago (para el frontend, tras cerrar el widget) ──
router.get('/estado/:referencia', verificarToken, async (req, res) => {
  try {
    const pago = await obtenerPagoPlataforma(req.params.referencia);
    if (!pago || pago.negocio_id !== req.user.negocio_id) {
      return res.status(404).json({ ok: false, error: 'Pago no encontrado' });
    }
    res.json({ ok: true, estado: pago.estado, plan: pago.plan });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Método de pago guardado (renovación automática) ───────
// La tarjeta se tokeniza en el navegador, directo contra la API de Wompi
// (POST /v1/tokens/cards) con la clave PÚBLICA — el número y el CVV nunca
// llegan a este servidor, solo el token que Wompi devuelve. Esta ruta recibe
// ese token (nunca la tarjeta) y con la clave PRIVADA crea la fuente de pago
// reutilizable en Wompi. Lo único que se guarda en la BD es esa referencia.

// Capa extra sobre limitarLogin: ese limita ráfagas (5/min), pero no a alguien
// probando una tarjeta cada 20 segundos para quedar bajo el radar. A partir
// de UMBRAL_CAPTCHA fallos, hay que resolver un Turnstile antes de reintentar.
// En memoria y por negocio (no por IP) — como loginIntentos, se resetea con
// un reinicio del proceso; aceptable para una capa de defensa adicional.
const UMBRAL_CAPTCHA = 3;
const fallosTarjeta = new Map(); // negocio_id -> { fallos }

function requiereCaptchaTarjeta(negocio_id) {
  return (fallosTarjeta.get(negocio_id)?.fallos || 0) >= UMBRAL_CAPTCHA;
}
function registrarFalloTarjeta(negocio_id) {
  const datos = fallosTarjeta.get(negocio_id) || { fallos: 0 };
  datos.fallos += 1;
  fallosTarjeta.set(negocio_id, datos);
}
function limpiarFallosTarjeta(negocio_id) {
  fallosTarjeta.delete(negocio_id);
}

// Sin TURNSTILE_SECRET_KEY configurada, esta capa no se activa (devuelve
// válido siempre) — el límite de intentos por IP sigue protegiendo igual.
async function verificarCaptcha(token, ip) {
  if (!config.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: config.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
    });
    const body = await r.json().catch(() => ({}));
    return Boolean(body.success);
  } catch (err) {
    console.error('[Turnstile] Error de red verificando:', err.message);
    return false;
  }
}

router.get('/metodo-pago', verificarToken, soloAdmin, async (req, res) => {
  try {
    const [metodo, negocio] = await Promise.all([
      obtenerMetodoPago(req.user.negocio_id),
      new Promise((resolve, reject) => {
        db.get('SELECT renovar_automatico FROM negocios WHERE id = ?', [req.user.negocio_id], (err, row) => (err ? reject(err) : resolve(row)));
      }),
    ]);
    res.json({
      ok: true,
      metodo: metodo ? { marca: metodo.marca, ultimos4: metodo.ultimos4, expMes: metodo.exp_mes, expAnio: metodo.exp_anio } : null,
      renovarAutomatico: Boolean(negocio?.renovar_automatico),
      requiereCaptcha: requiereCaptchaTarjeta(req.user.negocio_id) && Boolean(config.TURNSTILE_SITE_KEY),
      turnstileSiteKey: config.TURNSTILE_SITE_KEY || null,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Tokens que Wompi exige aceptar antes de tokenizar/guardar una tarjeta
// (términos de uso + autorización de datos personales). El navegador los
// pide con la clave pública; esta ruta solo evita que el frontend tenga que
// conocer la URL base de Wompi y maneje el caso de "no configurado".
router.get('/aceptacion', verificarToken, soloAdmin, async (req, res) => {
  try {
    if (!config.WOMPI_PUBLIC_KEY) {
      return res.status(503).json({ ok: false, error: 'Wompi no está configurado todavía' });
    }
    const r = await fetch(`${config.WOMPI_API_URL}/merchants/${config.WOMPI_PUBLIC_KEY}`);
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('[Wompi] Error consultando tokens de aceptación:', JSON.stringify(body));
      return res.status(502).json({ ok: false, error: 'No se pudo contactar a Wompi' });
    }
    res.json({
      ok: true,
      acceptanceToken: body?.data?.presigned_acceptance?.acceptance_token || null,
      personalAuthToken: body?.data?.presigned_personal_data_auth?.acceptance_token || null,
    });
  } catch (err) {
    console.error('[Wompi] Error de red pidiendo tokens de aceptación:', err.message);
    res.status(502).json({ ok: false, error: 'No se pudo contactar a Wompi' });
  }
});

// limitarLogin (5 intentos/min por IP) aquí también: sin esto, una sesión de
// admin — propia o robada — podría probar muchas tarjetas ajenas contra este
// endpoint para ver cuáles son válidas ("card testing"), a costa de nuestra
// clave privada de Wompi.
router.post('/metodo-pago', verificarToken, soloAdmin, limitarLogin, async (req, res) => {
  try {
    const { token, acceptanceToken, personalAuthToken, marca, ultimos4, expMes, expAnio, captchaToken } = req.body || {};
    if (!token || !acceptanceToken || !personalAuthToken) {
      return res.status(400).json({ ok: false, error: 'Faltan datos de la tokenización' });
    }
    if (!config.WOMPI_PRIVATE_KEY) {
      return res.status(503).json({ ok: false, error: 'Wompi no está configurado todavía' });
    }

    const negocio_id = req.user.negocio_id;

    if (requiereCaptchaTarjeta(negocio_id) && config.TURNSTILE_SECRET_KEY) {
      const captchaOk = await verificarCaptcha(captchaToken, req.ip);
      if (!captchaOk) {
        return res.status(400).json({ ok: false, error: 'Verificación de seguridad fallida. Resuelve el captcha e intenta de nuevo.' });
      }
    }
    const usuario = await new Promise((resolve, reject) => {
      db.get('SELECT email FROM usuarios WHERE id = ?', [req.user.id], (err, row) => (err ? reject(err) : resolve(row)));
    });
    if (!usuario?.email) {
      return res.status(400).json({ ok: false, error: 'Tu usuario no tiene un correo registrado' });
    }

    const r = await fetch(`${config.WOMPI_API_URL}/payment_sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.WOMPI_PRIVATE_KEY}` },
      body: JSON.stringify({
        type: 'CARD',
        token,
        customer_email: usuario.email,
        acceptance_token: acceptanceToken,
        accept_personal_auth: personalAuthToken,
      }),
    });
    const body = await r.json().catch(() => ({}));
    const fuenteId = body?.data?.id;
    if (!r.ok || !fuenteId) {
      console.error('[Wompi] Error creando fuente de pago:', JSON.stringify(body));
      registrarFalloTarjeta(negocio_id);
      return res.status(400).json({ ok: false, error: body?.error?.reason || 'No se pudo guardar la tarjeta' });
    }

    await guardarMetodoPago({
      negocio_id, wompi_payment_source_id: String(fuenteId),
      marca: marca || null, ultimos4: ultimos4 || null, exp_mes: expMes || null, exp_anio: expAnio || null,
    });
    limpiarFallosTarjeta(negocio_id);

    console.log(`[Wompi] Método de pago guardado: negocio ${negocio_id}, fuente ${fuenteId}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Wompi] Error guardando método de pago:', err.message);
    res.status(500).json({ ok: false, error: 'Error guardando el método de pago' });
  }
});

router.delete('/metodo-pago', verificarToken, soloAdmin, async (req, res) => {
  try {
    await eliminarMetodoPago(req.user.negocio_id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.patch('/metodo-pago/auto', verificarToken, soloAdmin, async (req, res) => {
  try {
    await actualizarRenovarAutomatico(req.user.negocio_id, Boolean(req.body?.activo));
    res.json({ ok: true });
  } catch (err) {
    // El único error esperado aquí es "no hay tarjeta guardada" — 400, no 500.
    res.status(400).json({ ok: false, error: err.message });
  }
});

// ─── Webhook de Wompi (público, verificado por checksum) ───
router.post('/webhook', async (req, res) => {
  try {
    const { event, data, signature, timestamp } = req.body || {};
    if (!event || !data || !signature || !timestamp) {
      return res.status(400).json({ ok: false, error: 'Payload inválido' });
    }
    if (!config.WOMPI_EVENTS_SECRET) {
      console.error('[Wompi] Webhook recibido pero WOMPI_EVENTS_SECRET no está configurado');
      return res.status(503).json({ ok: false, error: 'No configurado' });
    }

    // Verificar checksum: valores de las propiedades indicadas + timestamp + secreto de eventos
    const valores = (signature.properties || [])
      .map((ruta) => ruta.split('.').reduce((obj, key) => (obj ? obj[key] : undefined), data))
      .join('');
    const cadena = `${valores}${timestamp}${config.WOMPI_EVENTS_SECRET}`;
    const checksumCalculado = crypto.createHash('sha256').update(cadena).digest('hex').toUpperCase();

    if (checksumCalculado !== String(signature.checksum || '').toUpperCase()) {
      console.error('[Wompi] Checksum inválido en webhook — evento ignorado');
      return res.status(400).json({ ok: false, error: 'Firma inválida' });
    }

    if (event === 'transaction.updated' && data.transaction) {
      const { status, reference, id: wompiId } = data.transaction;
      const pago = await obtenerPagoPlataforma(reference);

      if (!pago) {
        console.error(`[Wompi] Webhook: referencia desconocida ${reference}`);
        return res.sendStatus(200);
      }

      if (status === 'APPROVED') {
        await actualizarPagoPlataforma(reference, { estado: 'APROBADO', wompi_transaction_id: wompiId });
        await marcarNegocioPagado(pago.negocio_id, pago.plan);
        console.log(`[Wompi] Pago aprobado: negocio ${pago.negocio_id}, plan ${pago.plan}, ref ${reference}`);

        try {
          const admin = await obtenerAdminDeNegocio(pago.negocio_id);
          if (admin) {
            // pago.plan puede traer sufijo '_anual' (p.ej. 'premium_anual'); el
            // correo busca el nombre en NOMBRE_PLAN, que solo conoce los 4 planes
            // base, así que hay que resolverlo antes o el nombre sale en blanco.
            await enviarGraciasPago(admin.email, admin.nombre, planBase(pago.plan), pago.monto);
          }
        } catch (e) {
          console.error('[Wompi] Error enviando correo de agradecimiento:', e.message);
        }
      } else if (['DECLINED', 'ERROR', 'VOIDED'].includes(status)) {
        await actualizarPagoPlataforma(reference, { estado: status === 'DECLINED' ? 'RECHAZADO' : 'ERROR', wompi_transaction_id: wompiId });
        console.log(`[Wompi] Pago ${status}: negocio ${pago.negocio_id}, ref ${reference}`);

        // Solo para renovación automática (bot/cobros-automaticos.js, referencia
        // FP-AUTO-...): un cobro manual fallido ya lo ve el cliente al instante
        // en el widget, pero uno automático es invisible si no se lo avisamos.
        if (reference.startsWith('FP-AUTO-')) {
          try {
            const [admin, negocio] = await Promise.all([
              obtenerAdminDeNegocio(pago.negocio_id),
              obtenerNegocio(pago.negocio_id),
            ]);
            if (admin?.email && negocio?.plan_vence) {
              await enviarAvisoCobroFallido(admin.email, admin.nombre, planBase(pago.plan), negocio.plan_vence);
            }
          } catch (e) {
            console.error('[Wompi] Error enviando aviso de cobro automático fallido:', e.message);
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[Wompi] Error procesando webhook:', err.message);
    res.sendStatus(200); // se responde 200 igual para que Wompi no reintente en bucle por un error nuestro
  }
});

module.exports = router;
module.exports.obtenerTransferenciaEsperada = obtenerTransferenciaEsperada;
module.exports.limpiarTransferenciaEsperada = limpiarTransferenciaEsperada;
// Para test/captcha-tarjeta.test.js — probar el contador sin montar un servidor HTTP.
module.exports.requiereCaptchaTarjeta = requiereCaptchaTarjeta;
module.exports.registrarFalloTarjeta = registrarFalloTarjeta;
module.exports.limpiarFallosTarjeta = limpiarFallosTarjeta;
module.exports.UMBRAL_CAPTCHA = UMBRAL_CAPTCHA;
