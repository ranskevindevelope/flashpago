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
const CONCURRENCIA = 5; // negocios que se revisan a la vez
const TIEMPO_MAX_NEGOCIO_MS = 60 * 1000; // pasado esto se sigue con los demás
const VUELTA_LENTA_S = 20;

let registrando = false;
// negocio_id -> correos ya evaluados que no hace falta volver a pedir a Gmail.
const vistos = new Map();
// Negocios cuya revisión anterior sigue sin terminar: no se lanza otra encima.
const enCurso = new Set();

// Rechaza si la promesa no termina a tiempo. El trabajo no se cancela, pero la vuelta sigue sin él.
async function conTiempoLimite(promesa, ms) {
  let temporizador;
  const limite = new Promise((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new Error('La revisión tardó demasiado')), ms);
  });
  try {
    return await Promise.race([promesa, limite]);
  } finally {
    clearTimeout(temporizador);
  }
}

// Corre cada 30 segundos (index.js). Con negocio_ids revisa solo esos negocios.
// Devuelve la cantidad de pagos registrados, o null si ya había otra revisión en curso.
async function registrarIngresosAutomaticos({ negocio_ids, tiempoMaxNegocioMs = TIEMPO_MAX_NEGOCIO_MS } = {}) {
  if (registrando) return null;
  registrando = true;
  const inicio = Date.now();
  let total = 0;
  try {
    const negocios = (await listarNegocios())
      .filter((n) => n.modo_registro === 'automatico' && (!negocio_ids || negocio_ids.includes(n.id)));
    // Un negocio que sale del modo automático no necesita seguir ocupando memoria.
    const activos = new Set(negocios.map((n) => n.id));
    for (const id of vistos.keys()) if (!activos.has(id)) vistos.delete(id);

    // Varios negocios a la vez: uno lento o caído no frena a los demás.
    const cola = [...negocios];
    const trabajador = async () => {
      while (cola.length) {
        const negocio = cola.shift();
        if (enCurso.has(negocio.id)) continue;
        enCurso.add(negocio.id);
        const trabajo = registrarDeNegocio(negocio);
        // Se libera cuando termina de verdad, aunque la vuelta ya no lo espere.
        trabajo.then(() => enCurso.delete(negocio.id), () => enCurso.delete(negocio.id));
        try {
          const registrados = await conTiempoLimite(trabajo, tiempoMaxNegocioMs);
          total += registrados;
        } catch (err) {
          console.error(`[AutoRegistro] Error en el negocio ${negocio.id}:`, err.message);
          salud.registrar('registro_auto', err.message, negocio.id);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, cola.length) }, trabajador));

    const segundos = (Date.now() - inicio) / 1000;
    if (segundos > VUELTA_LENTA_S) {
      console.warn(`[AutoRegistro] Vuelta lenta: ${segundos.toFixed(1)} s para ${negocios.length} negocio(s)`);
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
