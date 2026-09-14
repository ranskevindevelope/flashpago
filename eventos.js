// eventos.js — Canal en vivo hacia los dashboards abiertos (SSE).
// Sin esto, el dashboard se entera de un pago con hasta 8s (o 1min en
// segundo plano) de retraso por polling. SSE y no WebSockets porque el
// flujo es de un solo sentido (servidor → navegador).

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
