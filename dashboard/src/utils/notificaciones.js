// Notificaciones del sistema operativo: las que salen fuera del navegador.
// Son la única forma de avisar de un pago cuando la pestaña no está al frente
// — los toasts se dibujan dentro de la página y ahí nadie los ve.

function soportaNotificaciones() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function permisoNotificaciones() {
  if (!soportaNotificaciones()) return 'no-soportado';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

// El navegador exige que el permiso se pida desde un gesto del usuario
// (un clic). Pedirlo al cargar la página hace que Chrome lo bloquee de una.
export async function pedirPermisoNotificaciones() {
  if (!soportaNotificaciones()) return 'no-soportado';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function notificarSistema({ titulo, cuerpo, tag }) {
  if (!soportaNotificaciones() || Notification.permission !== 'granted') return false;
  try {
    const n = new Notification(titulo, {
      body: cuerpo,
      icon: '/logo192.png',
      badge: '/logo192.png',
      // Con el mismo tag, un aviso nuevo reemplaza al anterior en vez de
      // apilar veinte notificaciones si entran varios pagos seguidos.
      tag: tag || 'flashpago',
      renotify: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}
