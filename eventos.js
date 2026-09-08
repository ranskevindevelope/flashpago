// eventos.js — Canal en vivo hacia los dashboards abiertos (SSE).
//
// Sin esto, el dashboard se entera de un pago cuando le toca preguntar: hasta
// 8 s con la pestaña al frente y hasta un minuto en segundo plano. Con el
// servidor empujando el aviso, el anuncio suena apenas se verifica el pago.
//
// Se usa Server-Sent Events y no WebSockets porque el flujo es en un solo
// sentido (servidor → navegador) y el navegador reconecta solo si se corta.

// negocio_id -> Set de respuestas HTTP abiertas
const conexiones = new Map();

function agregarConexion(negocio_id, res) {
  if (!conexiones.has(negocio_id)) conexiones.set(negocio_id, new Set());
  conexiones.get(negocio_id).add(res);
}

function quitarConexion(negocio_id, res) {
  const grupo = conexiones.get(negocio_id);
  if (!grupo) return;
  grupo.delete(res);
  if (grupo.size === 0) conexiones.delete(negocio_id);
}

// Envía un evento solo a los dashboards de ese negocio.
function emitir(negocio_id, tipo, datos) {
  const grupo = conexiones.get(negocio_id);
  if (!grupo || grupo.size === 0) return 0;

  const carga = `event: ${tipo}\ndata: ${JSON.stringify(datos)}\n\n`;
  let enviados = 0;
  for (const res of grupo) {
    try {
      res.write(carga);
      enviados++;
    } catch {
      // Conexión rota: se limpia y el navegador reconectará por su cuenta.
      quitarConexion(negocio_id, res);
    }
  }
  return enviados;
}

module.exports = { agregarConexion, quitarConexion, emitir };
