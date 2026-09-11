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
// El mismo logo hace de marca pequeña en la cabecera y de icono grande en el
// cuerpo — una sola imagen, dos tamaños, para no sumar otro adjunto por correo.
const LOGO_CID = 'logo-flashpago';
const ADJUNTOS = [{
  filename: 'logo-flashpago.png',
  path: path.join(__dirname, 'assets', 'logo-email.png'),
  cid: LOGO_CID,
}];

// El From es impersonal para que la bandeja se vea limpia, pero nadie lee un
// no-reply: las respuestas van a contacto@, que es el buzon real declarado en la
// politica de privacidad. Por eso el pie de pagina dice "correo transaccional"
// y no "no respondas" — sí queremos que respondan si tienen dudas.
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
const COLOR_BANDA = '#F6F6F9'; // gris muy claro de las bandas de cabecera/pie
const DASHBOARD_URL = 'https://flashpago.co/panel';
// Las fechas de la BD llegan como 'YYYY-MM-DD'. new Date('2026-09-16') las lee
// como medianoche UTC, y al formatear en hora de Colombia (UTC-5) retrocede un
// dia: al cliente se le decia que su prueba terminaba el 15 cuando terminaba el
// 16. Para ese formato hay que construir la fecha en hora local.
function formatearFecha(valor) {
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor || '').trim());
  const fecha = soloFecha
    ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
    : new Date(valor);
  return fecha.toLocaleDateString('es-CO');
}

const NOMBRE_PLAN = { basico: 'Básico', premium: 'Premium', premium_plus: 'Premium Plus', empresarial: 'Empresarial' };

function boton(texto, url) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px auto 0;">
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

// Anatomía: banda gris clara con la marca pequeña arriba → icono grande
// centrado → título + línea corta debajo → descripción centrada → el
// contenido propio de cada correo (código, tabla, pasos...) → banda gris
// clara al pie con el contacto real. Mismo logo en los dos tamaños.
function plantilla({ preheader = '', titulo, descripcion, contenido, ctaTexto, ctaUrl }) {
  return `
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F0F1F7; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(26,26,46,0.08);">

            <!-- Cabecera: banda clara, marca pequeña -->
            <tr>
              <td style="background: ${COLOR_BANDA}; padding: 16px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align: middle;">
                      <img src="cid:${LOGO_CID}" width="24" height="24" alt="FlashPago"
                           style="display: block; width: 24px; height: 24px; border: 0; border-radius: 6px;" />
                    </td>
                    <td style="padding-left: 8px; color: ${COLOR_DARK}; font-size: 14px; font-weight: 700; vertical-align: middle;">
                      <span translate="no" class="notranslate">FlashPago</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Icono grande + título + descripción, centrados -->
            <tr>
              <td style="padding: 36px 32px 4px; text-align: center;">
                <img src="cid:${LOGO_CID}" width="88" height="88" alt="FlashPago"
                     style="display: block; width: 88px; height: 88px; border: 0; border-radius: 20px; margin: 0 auto 22px;" />
                <h1 style="margin: 0 0 12px; color: ${COLOR_DARK}; font-size: 21px; font-weight: 700;">${titulo}</h1>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 18px;">
                  <tr><td style="width: 40px; height: 3px; background: ${COLOR_ACCENT}; border-radius: 2px; font-size: 0; line-height: 0;">&nbsp;</td></tr>
                </table>
                ${descripcion ? `<p style="margin: 0 auto; max-width: 380px; color: #666; font-size: 14px; line-height: 1.6;">${descripcion}</p>` : ''}
              </td>
            </tr>

            <!-- Contenido propio de cada correo -->
            <tr>
              <td style="padding: 20px 32px 8px;">
                ${contenido || ''}
                ${ctaTexto ? boton(ctaTexto, ctaUrl) : ''}
              </td>
            </tr>

            <!-- Pie: banda clara con el contacto real y la marca -->
            <tr>
              <td style="padding: 30px 0 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${COLOR_BANDA};">
                  <tr>
                    <td style="padding: 18px 28px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="vertical-align: top;">
                            <div style="color: ${COLOR_DARK}; font-size: 13px; font-weight: 700; margin-bottom: 4px;">Equipo de FlashPago</div>
                            <div style="color: #888; font-size: 12px; line-height: 1.7;">
                              flashpago.co/panel<br />
                              contacto@flashpago.co
                            </div>
                          </td>
                          <td style="vertical-align: top; text-align: right; white-space: nowrap;">
                            <img src="cid:${LOGO_CID}" width="20" height="20" alt="FlashPago"
                                 style="display: inline-block; width: 20px; height: 20px; border: 0; border-radius: 5px; vertical-align: middle;" />
                            <span translate="no" class="notranslate" style="padding-left: 6px; color: ${COLOR_DARK}; font-size: 13px; font-weight: 700; vertical-align: middle;">FlashPago</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <p style="margin: 16px 0 0; color: #ABABBE; font-size: 11px; text-align: center; line-height: 1.6; padding: 0 28px 26px;">
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

// Sin caja ni borde — el número grande y espaciado es el propio protagonista,
// como en la referencia. Antes iba en un recuadro gris; ahora va solo, sobre
// blanco, para que el ojo vaya directo al código.
function bloqueCodigo(codigo) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 4px 0 22px;">
      <tr>
        <td style="text-align: center;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 11px; color: ${COLOR_DARK}; font-family: 'Space Grotesk', -apple-system, sans-serif;">${codigo}</span>
        </td>
      </tr>
    </table>
  `;
}

async function enviarCodigoVerificacion(email, codigo, nombreNegocio) {
  const contenido = `
    ${bloqueCodigo(codigo)}
    <p style="margin: 0; color: #999; font-size: 12px; line-height: 1.5; text-align: center;">
      Expira en 10 minutos. Si no solicitaste esta verificación, ignora este correo.
    </p>
  `;

  await transporter.sendMail({
    from: REMITENTE,
    replyTo: RESPUESTA_A,
    to: email,
    subject: `${codigo} — Tu código de verificación de FlashPago`,
    html: plantilla({
      preheader: `Tu código es ${codigo}`,
      titulo: 'Tu código de verificación',
      descripcion: `Usa este código para verificar la cuenta de <strong>${nombreNegocio}</strong> en FlashPago:`,
      contenido,
    }),
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
              Termina el <strong>${formatearFecha(trialFin)}</strong> — todas las funciones están activas hasta esa fecha.
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
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F8F8FB; border-radius: 12px; padding: 4px 14px;">
      ${pasos}
    </table>
    ${bloqueTrial}
    <p style="margin: 18px 0 0; color: #666; font-size: 13px; text-align: center;">
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
      titulo: `¡Bienvenido, ${nombre}!`,
      descripcion: 'Tu cuenta está lista. Para empezar a verificar comprobantes:',
      contenido,
      ctaTexto: 'Ir al dashboard',
      ctaUrl: DASHBOARD_URL,
    }),
    text: `¡Bienvenido, ${nombre}!

Tu cuenta está lista. Para empezar a verificar comprobantes:

${PASOS_INICIO.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}
${trialFin ? `
Estás en tu prueba gratis del plan ${NOMBRE_PLAN[plan] || plan || 'Básico'}. Termina el ${formatearFecha(trialFin)} — todas las funciones están activas hasta esa fecha.
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
      titulo: `¡Gracias por tu pago, ${nombre}!`,
      descripcion: 'Tu cuenta ya quedó activa con todos los beneficios del plan, sin límite de prueba.',
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
    ${bloqueCodigo(codigo)}
    <p style="margin: 0; color: #999; font-size: 12px; line-height: 1.5; text-align: center;">
      Expira en 10 minutos. Si no solicitaste este cambio, ignora este correo y tu contraseña seguirá igual.
    </p>
  `;

  await transporter.sendMail({
    from: REMITENTE,
    replyTo: RESPUESTA_A,
    to: email,
    subject: `${codigo} — Recupera tu contraseña de FlashPago`,
    html: plantilla({
      preheader: `Tu código es ${codigo}`,
      titulo: 'Recupera tu contraseña',
      descripcion: `Hola${nombre ? ` ${nombre}` : ''}, usa este código para crear una nueva contraseña en FlashPago:`,
      contenido,
    }),
    text: `Recupera tu contraseña

Hola${nombre ? ` ${nombre}` : ''}, usa este código para crear una nueva contraseña en FlashPago:

    ${codigo}

Expira en 10 minutos. Si no solicitaste este cambio, ignora este correo y tu contraseña seguirá igual.${PIE_TEXTO}`,
    attachments: ADJUNTOS,
  });

  console.log(`[Mailer] Código de recuperación enviado a ${email}`);
}

async function enviarAvisoPlan(email, nombre, plan, fechaVence, diasRestantes) {
  const nombrePlan = NOMBRE_PLAN[plan] || plan || '';
  const vencido = diasRestantes <= 0;
  const fecha = formatearFecha(fechaVence);

  const titulo = vencido ? 'Tu plan venció' : 'Tu plan está por vencer';
  const cuerpo = vencido
    ? `Hola ${nombre}, tu plan <strong>${nombrePlan}</strong> venció el <strong>${fecha}</strong>. El bot dejó de verificar comprobantes, así que tus empleados no pueden validar pagos hasta que renueves.`
    : `Hola ${nombre}, tu plan <strong>${nombrePlan}</strong> vence el <strong>${fecha}</strong> — ${diasRestantes === 1 ? 'queda 1 día' : `quedan ${diasRestantes} días`}. Renueva antes de esa fecha para que el bot no deje de verificar pagos.`;

  const contenido = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${vencido ? '#FFF1F1' : '#FFF6EC'}; border-left: 3px solid ${vencido ? '#D93025' : COLOR_ACCENT}; border-radius: 8px; margin: 4px 0 18px;">
      <tr>
        <td style="padding: 14px 16px;">
          <p style="margin: 0; font-size: 13px; color: ${vencido ? '#8A1F1B' : '#7A4A00'}; line-height: 1.6;">
            ${vencido
              ? 'Tus datos y tu historial siguen intactos. En cuanto renueves, el bot vuelve a funcionar al instante.'
              : 'No tienes que hacer nada más que renovar: el servicio continúa sin interrupción.'}
          </p>
        </td>
      </tr>
    </table>
  `;

  await transporter.sendMail({
    from: REMITENTE,
    replyTo: RESPUESTA_A,
    to: email,
    subject: vencido
      ? `Tu plan ${nombrePlan} de FlashPago venció`
      : `Tu plan ${nombrePlan} vence el ${fecha}`,
    text: `${titulo}

${cuerpo.replace(/<[^>]+>/g, '')}

Renovar: ${DASHBOARD_URL}${PIE_TEXTO}`,
    html: plantilla({
      preheader: vencido ? `Renueva para reactivar el bot` : `Quedan ${diasRestantes} días de tu plan`,
      titulo,
      descripcion: cuerpo,
      contenido,
      ctaTexto: vencido ? 'Renovar ahora' : 'Renovar mi plan',
      ctaUrl: DASHBOARD_URL,
    }),
    attachments: ADJUNTOS,
  });

  console.log(`[Mailer] Aviso de plan (${vencido ? 'vencido' : diasRestantes + 'd'}) enviado a ${email}`);
}

// Se manda cuando bot/cobros-automaticos.js intenta la renovación automática
// y Wompi la rechaza (tarjeta vencida, fondos insuficientes, etc.) — sin esto
// el negocio no se entera de que falló hasta que le llega el aviso normal de
// "tu plan está por vencer/venció" de enviarAvisoPlan, ya sin margen.
async function enviarAvisoCobroFallido(email, nombre, plan, fechaVence) {
  const nombrePlan = NOMBRE_PLAN[plan] || plan || '';
  const fecha = formatearFecha(fechaVence);

  const contenido = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #FFF1F1; border-left: 3px solid #D93025; border-radius: 8px; margin: 4px 0 18px;">
      <tr>
        <td style="padding: 14px 16px;">
          <p style="margin: 0; font-size: 13px; color: #8A1F1B; line-height: 1.6;">
            Tu servicio sigue activo por ahora, pero si no actualizas la tarjeta antes del <strong>${fecha}</strong> el bot dejará de verificar comprobantes.
          </p>
        </td>
      </tr>
    </table>
  `;

  await transporter.sendMail({
    from: REMITENTE,
    replyTo: RESPUESTA_A,
    to: email,
    subject: `No pudimos cobrar tu plan ${nombrePlan} — actualiza tu tarjeta`,
    text: `No pudimos cobrar tu renovación automática

Hola ${nombre}, intentamos cobrar tu plan ${nombrePlan} con la tarjeta guardada y el banco la rechazó. Tu servicio sigue activo por ahora, pero si no actualizas la tarjeta antes del ${fecha} el bot dejará de verificar comprobantes.

Actualizar tarjeta: ${DASHBOARD_URL}${PIE_TEXTO}`,
    html: plantilla({
      preheader: `Tu tarjeta guardada fue rechazada al renovar el plan ${nombrePlan}`,
      titulo: 'No pudimos cobrar tu tarjeta',
      descripcion: `Hola ${nombre}, intentamos renovar tu plan <strong>${nombrePlan}</strong> con la tarjeta guardada y el banco la rechazó.`,
      contenido,
      ctaTexto: 'Actualizar mi tarjeta',
      ctaUrl: DASHBOARD_URL,
    }),
    attachments: ADJUNTOS,
  });

  console.log(`[Mailer] Aviso de cobro automático fallido enviado a ${email}`);
}

module.exports = { enviarCodigoVerificacion, enviarBienvenida, enviarCodigoRecuperacion, enviarGraciasPago, enviarAvisoPlan, enviarAvisoCobroFallido, formatearFecha, NOMBRE_PLAN };
