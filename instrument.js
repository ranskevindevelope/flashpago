// instrument.js — Sentry: avisa de los errores del backend. Va primero en index.js.
// Sin SENTRY_DSN, o si el paquete no está instalado en el servidor, no hace nada y la app arranca igual.
let Sentry = null;
try {
  Sentry = require('@sentry/node');
} catch (err) {
  if (process.env.SENTRY_DSN) console.warn('[Sentry] No se pudo cargar @sentry/node (¿falta npm install?):', err.message);
}

const activo = Boolean(Sentry && process.env.SENTRY_DSN);

// El bot maneja nombres y montos de clientes: del evento solo salen el error, su traza y
// el método de la ruta. Nada de cuerpos, cookies, cabeceras ni URLs (pueden llevar nombres).
function limpiarEvento(evento) {
  if (evento.request) evento.request = { method: evento.request.method };
  delete evento.user;
  return evento;
}

if (activo) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: 0, // los console.log del bot llevan datos de clientes
    beforeBreadcrumb: () => null,
    beforeSend: limpiarEvento,
    // Una promesa rechazada sin manejar sigue tumbando el proceso (PM2 lo reinicia), pero ahora queda reportada.
    integrations: [Sentry.onUnhandledRejectionIntegration({ mode: 'strict' })],
  });
}

module.exports = { Sentry, activo, limpiarEvento };
