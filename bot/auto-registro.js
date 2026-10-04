// auto-registro.js — Modo de registro automático: cada ingreso que llega al correo
// del banco se guarda como pago, sin que nadie envíe el comprobante.
// Usa el mismo filtro de ingresos que la verificación (retiros, compras, envíos y
// nómina no cuentan). Un correo registra un solo pago: gmail_id es único en pagos.
const {
  listarNegocios, verificarTrialActivo, correosYaUsados, guardarPago, contarComprobantesDelMes, topeConMargen,
} = require('../db');
const { listarIngresosDesde } = require('../gmail');
const { avisarLimite } = require('./avisos');
const eventos = require('../eventos');
const salud = require('../salud');

const VENTANA_MAX_S = 2 * 24 * 60 * 60; // nunca se mira más atrás de 2 días
const MAX_VISTOS = 5000;

let registrando = false;
// negocio_id -> correos ya evaluados que no hace falta volver a pedir a Gmail.
const vistos = new Map();

// Corre cada 2 minutos (index.js). Con negocio_id revisa solo ese negocio.
// Devuelve la cantidad de pagos registrados, o null si ya había otra revisión en curso.
async function registrarIngresosAutomaticos({ negocio_id } = {}) {
  if (registrando) return null;
  registrando = true;
  let total = 0;
  try {
    const negocios = (await listarNegocios())
      .filter((n) => n.modo_registro === 'automatico' && (!negocio_id || n.id === negocio_id));
    for (const negocio of negocios) {
      try {
        total += await registrarDeNegocio(negocio);
      } catch (err) {
        console.error(`[AutoRegistro] Error en el negocio ${negocio.id}:`, err.message);
        salud.registrar('registro_auto', err.message, negocio.id);
      }
    }
  } catch (err) {
    console.error('[AutoRegistro] Error listando negocios:', err.message);
  } finally {
    registrando = false;
  }
  return total;
}

async function registrarDeNegocio(negocio) {
  // Prueba o plan vencido: igual que con comprobantes, no se registra nada.
  const vigencia = await verificarTrialActivo(negocio.id).catch(() => ({ activo: true }));
  if (!vigencia.activo) return 0;

  const ahora = Math.floor(Date.now() / 1000);
  const desde = Math.max(negocio.auto_desde || ahora, ahora - VENTANA_MAX_S);
  if (!vistos.has(negocio.id) || vistos.get(negocio.id).size > MAX_VISTOS) vistos.set(negocio.id, new Set());
  const yaVistos = vistos.get(negocio.id);

  const resultado = await listarIngresosDesde(negocio.id, desde, async (ids) => {
    const nuevos = ids.filter((id) => !yaVistos.has(id));
    const usados = await correosYaUsados(nuevos);
    usados.forEach((id) => yaVistos.add(id));
    return nuevos.filter((id) => !usados.has(id));
  });

  if (resultado === null) {
    salud.registrar('registro_auto', 'Gmail no conectado', negocio.id);
    return 0;
  }

  // Lo que no es ingreso no cambia: no se vuelve a leer. Los ingresos se marcan
  // al guardarlos, para reintentar los que no entraron (ej. por el tope del plan).
  const ingresoIds = new Set(resultado.ingresos.map((i) => i.gmail_id));
  resultado.evaluados.filter((id) => !ingresoIds.has(id)).forEach((id) => yaVistos.add(id));

  let registrados = 0;
  for (const ingreso of resultado.ingresos) {
    if (!(await hayCupo(negocio))) break;
    if (await guardarIngreso(negocio, ingreso)) registrados++;
    yaVistos.add(ingreso.gmail_id);
  }
  if (registrados) console.log(`[AutoRegistro] ${registrados} pago(s) registrado(s) (negocio ${negocio.id})`);
  return registrados;
}

// Mismo tope que con comprobantes: aviso al llegar al límite, y se detiene pasada la cortesía.
async function hayCupo(negocio) {
  if (negocio.plan_ilimitado) return true;
  const usados = await contarComprobantesDelMes(negocio.id);
  const limite = negocio.limite_comprobantes;
  const tope = topeConMargen(limite);
  if (usados >= tope) {
    avisarLimite(negocio, 'limite_agotado', { limite, tope })
      .catch((err) => console.error('[AutoRegistro] Error avisando límite agotado:', err.message));
    return false;
  }
  if (usados >= limite) {
    avisarLimite(negocio, 'limite_alcanzado', { limite, tope })
      .catch((err) => console.error('[AutoRegistro] Error avisando límite alcanzado:', err.message));
  }
  return true;
}

async function guardarIngreso(negocio, ingreso) {
  const cuando = new Date((ingreso.llegada || Date.now() / 1000) * 1000);
  try {
    const id = await guardarPago({
      monto: ingreso.monto,
      referencia: null,
      banco: ingreso.banco,
      fecha: cuando.toLocaleDateString('es-CO'),
      hora: cuando.toLocaleTimeString('es-CO'),
      estado: 'REAL',
      fuente: 'auto',
      nombre_cliente: ingreso.nombre || null,
      verificado_por: 'automatico',
      negocio_id: negocio.id,
      foto: null,
      gmail_id: ingreso.gmail_id,
    });
    // Aviso inmediato a los dashboards abiertos, el mismo que el flujo con comprobante.
    eventos.emitir(negocio.id, 'pago', { id, monto: ingreso.monto, banco: ingreso.banco, nombre_cliente: ingreso.nombre || null });
    return true;
  } catch (err) {
    // Otro ciclo (o un comprobante) ya usó ese correo: no es un error.
    if (err.message && err.message.includes('UNIQUE constraint failed: pagos.gmail_id')) return false;
    throw err;
  }
}

// Solo para pruebas: simula un reinicio del servidor (la memoria de correos vistos se pierde).
function olvidarVistos() {
  vistos.clear();
}

module.exports = { registrarIngresosAutomaticos, olvidarVistos };
