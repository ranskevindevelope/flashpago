const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { JWT_SECRET } = require('./config');

// Nombre de la cookie de sesión. Mismo valor que la clave de localStorage
// para que sea obvio que son la misma sesión vista desde los dos lados.
const COOKIE_SESION = 'fp_token';

// El JWT viaja por header en todo lo que es fetch/XHR. La cookie existe solo
// para los dos casos donde el navegador NO deja poner headers: <img> (modal de
// comprobantes) y EventSource (notificaciones en vivo). Antes eso se resolvía
// con ?token= en la URL, lo que dejaba el JWT en los logs de nginx y en el
// historial del navegador.
//
// domain .flashpago.co: la landing (flashpago.co) y el panel
// (app.flashpago.co) son orígenes distintos y deben compartir la sesión. En
// localhost se omite el domain, si no el navegador rechaza la cookie.
function opcionesCookieSesion(req) {
  const host = req.hostname || '';
  const enFlashpago = host === 'flashpago.co' || host.endsWith('.flashpago.co');
  return {
    httpOnly: true,
    secure: req.secure, // con trust proxy activo, refleja el https real de nginx
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // igual que expiresIn del JWT
    path: '/',
    ...(enFlashpago ? { domain: '.flashpago.co' } : {}),
  };
}

function verificarToken(req, res, next) {
  let token = null;
  const header = req.headers.authorization || req.headers.Authorization;
  if (header && typeof header === 'string' && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.cookies && req.cookies[COOKIE_SESION]) {
    token = req.cookies[COOKIE_SESION];
  }
  if (!token) return res.status(401).json({ ok: false, error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
  }
}

function soloAdmin(req, res, next) {
  if (!req.user || (req.user.rol !== 'admin' && req.user.rol !== 'superadmin')) {
    return res.status(403).json({ ok: false, error: 'Solo administradores' });
  }
  next();
}

function soloSuperAdmin(req, res, next) {
  if (!req.user || req.user.rol !== 'superadmin') {
    return res.status(403).json({ ok: false, error: 'Solo superadmin' });
  }
  next();
}

// Rate limiter para login
const loginIntentos = new Map();
function limitarLogin(req, res, next) {
  const ip = req.ip;
  const ahora = Date.now();
  const datos = loginIntentos.get(ip);

  if (datos && ahora - datos.inicio < 60000 && datos.intentos >= 5) {
    const segundosRestantes = Math.ceil((60000 - (ahora - datos.inicio)) / 1000);
    return res.status(429).json({ ok: false, error: `Demasiados intentos. Espera ${segundosRestantes} segundos.` });
  }

  if (!datos || ahora - datos.inicio > 60000) {
    loginIntentos.set(ip, { intentos: 1, inicio: ahora });
  } else {
    datos.intentos++;
  }

  const restantes = 5 - (loginIntentos.get(ip).intentos);
  if (restantes <= 2 && restantes > 0) {
    res.locals.advertencia = `Te quedan ${restantes} intento(s)`;
  }
  next();
}

// limpiar cada 5 minutos. .unref(): sin esto, cualquier script corto que
// solo necesite importar este archivo (como un test) queda colgado para
// siempre esperando este timer — el servidor real no lo nota porque ya se
// mantiene vivo solo (tiene un puerto abierto), así que quitarlo no cambia
// nada ahí.
const limpiezaLoginIntentos = setInterval(() => {
  const ahora = Date.now();
  for (const [ip, datos] of loginIntentos) {
    if (ahora - datos.inicio > 300000) loginIntentos.delete(ip);
  }
}, 300000);
limpiezaLoginIntentos.unref();

module.exports = {
  verificarToken,
  soloAdmin,
  soloSuperAdmin,
  limitarLogin,
  opcionesCookieSesion,
  COOKIE_SESION,
};