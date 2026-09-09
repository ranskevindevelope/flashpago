// mailer.js — Envío de correos con Nodemailer
const nodemailer = require('nodemailer');
const path = require('path');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.porkbun.com',
  port: Number(process.env.MAIL_PORT) || 587,
  secure: false, // STARTTLS en el puerto 587
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Remitente. Con Resend el usuario SMTP es literalmente "resend", asi que el
// from ya no puede salir de MAIL_USER como antes: hay que declararlo aparte y
// que sea un dominio verificado en Resend. El fallback deja el comportamiento
// viejo intacto si MAIL_FROM no esta definido.
const REMITENTE = process.env.MAIL_FROM || `"FlashPago" <${process.env.MAIL_USER}>`;

// El logo viaja incrustado en el correo (CID) en vez de por URL. Asi no depende
// de dashboard/build, que ya falto una vez en produccion, ni de que el cliente
// acepte imagenes externas: Gmail muestra los adjuntos CID sin pedir permiso.
const LOGO_CID = 'logo-flashpago';
const ADJUNTOS = [{
  filename: 'logo-flashpago.png',
  path: path.join(__dirname, 'assets', 'logo-email.png'),
  cid: LOGO_CID,
}];

// El From es impersonal para que la bandeja se vea limpia, pero nadie lee un
// no-reply: las respuestas van a contacto@, que es el buzon real declarado en la
// politica de privacidad. Sin esto, el "responde este correo" de gracias-por-pago
// rebotaria.
const RESPUESTA_A = process.env.MAIL_REPLY_TO || 'FlashPago <contacto@flashpago.co>';

// Los pasos de la bienvenida viven aqui para que la version HTML y la de texto
// plano no se separen con el tiempo.
const PASOS_INICIO = [
  'Conecta tu Gmail desde el dashboard',
  'Agrega tus empleados con su WhatsApp',
  'Dales el número del bot y listo',
];

const PIE_TEXTO = `

--
FlashPago — Verificación de pagos con IA
Este es un correo transaccional relacionado con tu cuenta.`;

const COLOR_ACCENT = '#F57C00';
const COLOR_DARK = '#1A1A2E';
const DASHBOARD_URL = 'https://flashpago.co/panel';
const NOMBRE_PLAN = { basico: 'Básico', premium: 'Premium', premium_plus: 'Premium Plus', empresarial: 'Empresarial' };

function boton(texto, url) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
      <tr>
        <td style="border-radius: 10px; background: ${COLOR_ACCENT};">
          <a href="${url}" style="display: inline-block; padding: 13px 30px; color: #fff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            ${texto}
          </a>
        </td>
      </tr>
    </table>
  `;
}

function plantilla({ preheader = '', contenido, ctaTexto, ctaUrl }) {
  return `
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F0F1F7; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(26,26,46,0.08);">
            <tr>
              <td style="background-color: ${COLOR_DARK}; background: linear-gradient(135deg, ${COLOR_DARK}, #2A2A4E); padding: 22px 32px; text-align: center; border-bottom: 3px solid ${COLOR_ACCENT};">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                  <tr>
                    <td style="vertical-align: middle;">
                      <img src="cid:${LOGO_CID}" width="52" height="52" alt="FlashPago"
                           style="display: block; width: 52px; height: 52px; border: 0; border-radius: 12px;" />
                    </td>
                    <td style="padding-left: 12px; color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: -0.3px; vertical-align: middle;">
                      <span translate="no" class="notranslate">FlashPago</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 36px 32px 8px;">
                ${contenido}
                ${ctaTexto ? boton(ctaTexto, ctaUrl) : ''}
              </td>
            </tr>
            <tr>
              <td style="padding: 28px 32px 26px;">
                <hr style="border: none; border-top: 1px solid #EFEFF4; margin: 0 0 18px;" />
                <p style="margin: 0; color: #8A8AA0; font-size: 12px; text-align: center; line-height: 1.6;">
                  <span translate="no" class="notranslate">FlashPago</span> — Verificación de pagos con IA<br />
                  Este es un correo transaccional relacionado con tu cuenta.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function bloqueCodigo(codigo) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #FAFAFC; border: 1px solid #EEEEF3; border-radius: 12px; margin: 20px 0;">
      <tr>
        <td style="padding: 22px; text-align: center;">
          <span style="font-size: 34px; font-weight: 800; letter-spacing: 10px; color: ${COLOR_DARK};">${codigo}</span>
        </td>
      </tr>
    </table>
  `;
}

async function enviarCodigoVerificacion(email, codigo, nombreNegocio) {
  const contenido = `
    <h1 style="margin: 0 0 10px; color: ${COLOR_DARK}; font-size: 20px;">Tu código de verificación</h1>
    <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
      Hola, usa este código para verificar tu cuenta de <strong>${nombreNegocio}</strong> en FlashPago:
    </p>
    ${bloqueCodigo(codigo)}
    <p style="margin: 0; color: #999; font-size: 12px; line-height: 1.5;">
      Expira en 10 minutos. Si no solicitaste esta verificación, ignora este correo.
    </p>
  `;

  await transporter.sendMail({
    from: REMITENTE,
    replyTo: RESPUESTA_A,
    to: email,
    subject: `${codigo} — Tu código de verificación de FlashPago`,
    html: plantilla({ preheader: `Tu código es ${codigo}`, contenido }),
    text: `Tu código de verificación

Hola, usa este código para verificar tu cuenta de ${nombreNegocio} en FlashPago:

    ${codigo}

Expira en 10 minutos. Si no solicitaste esta verificación, ignora este correo.${PIE_TEXTO}`,
    attachments: ADJUNTOS,
  });

  console.log(`[Mailer] Código enviado a ${email}`);
}

async function enviarBienvenida(email, nombre, usuario, plan, trialFin) {
  const bloqueTrial = trialFin
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #FFF6EC; border-left: 3px solid ${COLOR_ACCENT}; border-radius: 8px; margin: 18px 0;">
        <tr>
          <td style="padding: 14px 16px;">
            <p style="margin: 0; font-size: 13px; color: #7A4A00; line-height: 1.6;">
              Estás en tu <strong>prueba gratis del plan ${NOMBRE_PLAN[plan] || plan || 'Básico'}</strong>.
              Termina el <strong>${new Date(trialFin).toLocaleDateString('es-CO')}</strong> — todas las funciones están activas hasta esa fecha.
            </p>
          </td>
        </tr>
      </table>
    `
    : '';

  const pasos = PASOS_INICIO
    .map(
      (texto, i) => `
      <tr>
        <td style="width: 26px; vertical-align: top; padding: 6px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="width: 20px; height: 20px; background: ${COLOR_DARK}; border-radius: 50%; text-align: center; color: #fff; font-size: 11px; font-weight: 700; line-height: 20px;">${i + 1}</td></tr></table>
        </td>
        <td style="padding: 6px 0 6px 10px; font-size: 13px; color: #333; line-height: 1.5;">${texto}</td>
      </tr>
    `
    )
    .join('');

  const contenido = `
    <h1 style="margin: 0 0 10px; color: ${COLOR_DARK}; font-size: 20px;">¡Bienvenido, ${nombre}! 🎉</h1>
    <p style="margin: 0 0 16px; color: #666; font-size: 14px; line-height: 1.6;">
      Tu cuenta está lista. Para empezar a verificar comprobantes:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F8F8FB; border-radius: 12px; padding: 4px 14px;">
      ${pasos}
    </table>
    ${bloqueTrial}
    <p style="margin: 18px 0 0; color: #666; font-size: 13px;">
      Tu usuario: <strong>${usuario}</strong>
    </p>
  `;

  await transporter.sendMail({
    from: REMITENTE,
    replyTo: RESPUESTA_A,
    to: email,
    subject: `¡Bienvenido a FlashPago, ${nombre}!`,
    html: plantilla({
      preheader: 'Tu cuenta ya está lista para verificar comprobantes',
      contenido,
      ctaTexto: 'Ir al dashboard',
      ctaUrl: DASHBOARD_URL,
    }),
    text: `¡Bienvenido, ${nombre}!

Tu cuenta está lista. Para empezar a verificar comprobantes:

${PASOS_INICIO.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}
${trialFin ? `
Estás en tu prueba gratis del plan ${NOMBRE_PLAN[plan] || plan || 'Básico'}. Termina el ${new Date(trialFin).toLocaleDateString('es-CO')} — todas las funciones están activas hasta esa fecha.
` : ''}
Tu usuario: ${usuario}

Ir al dashboard: ${DASHBOARD_URL}${PIE_TEXTO}`,
    attachments: ADJUNTOS,
  });

  console.log(`[Mailer] Bienvenida enviada a ${email}`);
}

async function enviarGraciasPago(email, nombre, plan, montoCentavos) {
  const nombrePlan = NOMBRE_PLAN[plan] || plan || '';
  const monto = Math.round((montoCentavos || 0) / 100).toLocaleString('es-CO');

  const contenido = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px;">
      <tr>
        <td style="width: 52px; height: 52px; background: #FFF6EC; border-radius: 50%; text-align: center; vertical-align: middle;">
          <span style="color: ${COLOR_ACCENT}; font-size: 26px; font-weight: 800; line-height: 52px;">&#10003;</span>
        </td>
      </tr>
    </table>
    <h1 style="margin: 0 0 10px; color: ${COLOR_DARK}; font-size: 20px; text-align: center;">¡Gracias por tu pago, ${nombre}!</h1>
    <p style="margin: 0 0 20px; color: #666; font-size: 14px; line-height: 1.6; text-align: center;">
      Tu cuenta ya quedó activa con todos los beneficios del plan, sin límite de prueba.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #FAFAFC; border: 1px solid #EEEEF3; border-radius: 12px;">
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #EEEEF3;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size: 13px; color: #999;">Plan</td>
              <td style="font-size: 13px; color: ${COLOR_DARK}; font-weight: 700; text-align: right;">${nombrePlan}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size: 13px; color: #999;">Monto pagado</td>
              <td style="font-size: 13px; color: ${COLOR_DARK}; font-weight: 700; text-align: right;">$${monto} COP</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin: 20px 0 0; color: #999; font-size: 12px; line-height: 1.6; text-align: center;">
      Cualquier duda sobre tu suscripción, responde este correo y te ayudamos.
    </p>
  `;

  await transporter.sendMail({
    from: REMITENTE,
    replyTo: RESPUESTA_A,
    to: email,
    subject: `¡Gracias por tu pago, ${nombre}! Tu plan ${nombrePlan} está activo`,
    html: plantilla({
      preheader: `Confirmamos tu pago del plan ${nombrePlan}`,
      contenido,
      ctaTexto: 'Ver mi dashboard',
      ctaUrl: DASHBOARD_URL,
    }),
    text: `¡Gracias por tu pago, ${nombre}!

Tu cuenta ya quedó activa con todos los beneficios del plan, sin límite de prueba.

Plan:         ${nombrePlan}
Monto pagado: $${monto} COP

Ver mi dashboard: ${DASHBOARD_URL}

Cualquier duda sobre tu suscripción, responde este correo y te ayudamos.${PIE_TEXTO}`,
    attachments: ADJUNTOS,
  });

  console.log(`[Mailer] Correo de agradecimiento de pago enviado a ${email}`);
}

async function enviarCodigoRecuperacion(email, codigo, nombre) {
  const contenido = `
    <h1 style="margin: 0 0 10px; color: ${COLOR_DARK}; font-size: 20px;">Recupera tu contraseña</h1>
    <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
      Hola${nombre ? ` ${nombre}` : ''}, usa este código para crear una nueva contraseña en FlashPago:
    </p>
    ${bloqueCodigo(codigo)}
    <p style="margin: 0; color: #999; font-size: 12px; line-height: 1.5;">
      Expira en 10 minutos. Si no solicitaste este cambio, ignora este correo y tu contraseña seguirá igual.
    </p>
  `;

  await transporter.sendMail({
    from: REMITENTE,
    replyTo: RESPUESTA_A,
    to: email,
    subject: `${codigo} — Recupera tu contraseña de FlashPago`,
    html: plantilla({ preheader: `Tu código es ${codigo}`, contenido }),
    text: `Recupera tu contraseña

Hola${nombre ? ` ${nombre}` : ''}, usa este código para crear una nueva contraseña en FlashPago:

    ${codigo}

Expira en 10 minutos. Si no solicitaste este cambio, ignora este correo y tu contraseña seguirá igual.${PIE_TEXTO}`,
    attachments: ADJUNTOS,
  });

  console.log(`[Mailer] Código de recuperación enviado a ${email}`);
}

module.exports = { enviarCodigoVerificacion, enviarBienvenida, enviarCodigoRecuperacion, enviarGraciasPago };
