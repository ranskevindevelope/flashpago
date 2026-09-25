require('dotenv').config();

const required = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
};

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || required('JWT_SECRET'),
  INBOUND_WEBHOOK_SECRET: process.env.INBOUND_WEBHOOK_SECRET || null,
  OPENWA_URL: process.env.OPENWA_URL || 'http://localhost:2785',
  OPENWA_SESSION: process.env.OPENWA_SESSION || 'vinson',
  // Sin fallback a proposito: mejor que truene el arranque a que se
  // autentique en silencio con una clave equivocada (ya paso).
  OPENWA_KEY: process.env.OPENWA_API_KEY || required('OPENWA_API_KEY'),
  NEGOCIO_NOMBRE: process.env.NEGOCIO_NOMBRE || 'Flash Pago',

  // Proveedor de WhatsApp: 'openwa' (por defecto, no oficial) o 'meta' (API
  // oficial de Meta, de respaldo por si banean el número de open-wa).
  WA_PROVIDER: process.env.WA_PROVIDER || 'openwa',
  META_API_VERSION: process.env.META_API_VERSION || 'v20.0',
  META_PHONE_NUMBER_ID: process.env.META_PHONE_NUMBER_ID || '',
  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN || '',
  META_APP_SECRET: process.env.META_APP_SECRET || '',
  META_VERIFY_TOKEN: process.env.META_VERIFY_TOKEN || '',

  // Wompi (pasarela de pagos de suscripción de FlashPago)
  WOMPI_AMBIENTE: process.env.WOMPI_AMBIENTE || 'test', // 'test' | 'prod'
  WOMPI_PUBLIC_KEY: process.env.WOMPI_PUBLIC_KEY || '',
  WOMPI_PRIVATE_KEY: process.env.WOMPI_PRIVATE_KEY || '',
  WOMPI_INTEGRITY_SECRET: process.env.WOMPI_INTEGRITY_SECRET || '',
  WOMPI_EVENTS_SECRET: process.env.WOMPI_EVENTS_SECRET || '',
  get WOMPI_API_URL() {
    return this.WOMPI_AMBIENTE === 'prod' ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1';
  },

  // Cloudflare Turnstile: se pide tras varios intentos fallidos de guardar
  // tarjeta (routes/wompi.js). Sin required(): si falta, esa capa no se activa.
  TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY || '',
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || '',

  // "Iniciar sesión con Google" — distinto del OAuth de credentials.json
  // (conectar el Gmail del negocio). Sin required(): si falta, el botón de
  // Google no se activa.
  GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID || '',

  // Cuenta bancaria para pagos de suscripción por transferencia manual
  CUENTA_BANCO: process.env.CUENTA_BANCO || '',
  CUENTA_TIPO: process.env.CUENTA_TIPO || '',
  CUENTA_NUMERO: process.env.CUENTA_NUMERO || '',
  CUENTA_TITULAR: process.env.CUENTA_TITULAR || '',
  CUENTA_NIT: process.env.CUENTA_NIT || '',
  // Número del bot (con Meta, solo lo lee la API): ahí llegan los "confirmar
  // <código>" y los comprobantes de la suscripción. Se configura en el .env.
  FLASHPAGO_WHATSAPP: process.env.FLASHPAGO_WHATSAPP || '573167064671',
  // negocio_id cuyo Gmail se usa para verificar pagos de suscripción por
  // transferencia manual. Por defecto el negocio 1.
  NEGOCIO_ID_SUSCRIPCION: parseInt(process.env.NEGOCIO_ID_SUSCRIPCION || '1', 10),
  // A quién le llega la alerta de pago de suscripción sin confirmar: una
  // persona (el contacto de la landing), nunca el número del bot.
  ADMIN_SUSCRIPCION_WHATSAPP: process.env.ADMIN_SUSCRIPCION_WHATSAPP || '573167064671',
};
