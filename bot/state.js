// Central small in-memory state shared between index.js and bot jobs.
// Los pagos pendientes ya no viven aquí: se leen de la BD (bot/pendientes.js).
module.exports = {
  historialPagos: []
};
