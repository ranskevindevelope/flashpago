// auto-registro.js — Modo de registro automático: cada ingreso que llega al correo
// del banco se guarda como pago, sin que nadie envíe el comprobante.
// Usa el mismo filtro de ingresos que la verificación (retiros, compras, envíos y
// nómina no cuentan). Un correo registra un solo pago: gmail_id es único en pagos.
const {
  listarNegocios, obtenerNegocio, verificarTrialActivo, correosYaUsados, guardarPago, contarComprobantesDelMes, topeConMargen,
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
const VUELTAS_RESPALDO = 12; // con aviso inmediato vigente, la revisión periódica solo corre 1 de cada 12 vueltas

let registrando = false;
let vuelta = 0;
// negocio_id -> correos ya evaluados que no hace falta volver a pedir a Gmail.
const vistos = new Map();
// Negocios cuya revisión anterior sigue sin terminar: no se lanza otra encima.
const enCurso = new Set();
// Negocios que recibieron otro aviso mientras se revisaban: se repite la revisión al terminar.
const rehacer = new Set();
// negocio_id -> hasta cuándo (ms) vale su aviso inmediato de Gmail (ver gmail-push.js).
const avisos = new Map();

const marcarAvisoInmediato = (negocio_id, expiraMs) => avisos.set(negocio_id, expiraMs);
const quitarAvisoInmediato = (negocio_id) => avisos.delete(negocio_id);
const vencimientoDelAviso = (negocio_id) => avisos.get(negocio_id) || 0;
const avisoVigente = (negocio_id) => vencimientoDelAviso(negocio_id) > Date.now();

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

// Revisa un negocio sin solaparse consigo mismo. Si ya hay una revisión en curso, pide repetirla
// al terminar y devuelve null.
async function revisarSinSolapar(negocio, tiempoMaxMs, origen) {
  if (enCurso.has(negocio.id)) {
    rehacer.add(negocio.id);
    return null;
  }
  enCurso.add(negocio.id);
  const trabajo = registrarDeNegocio(negocio, origen);
  // Se libera cuando termina de verdad, aunque quien llamó ya no lo espere.
  const terminar = () => {
    enCurso.delete(negocio.id);
    if (rehacer.delete(negocio.id)) revisarNegocioYa(negocio.id).catch(() => {});
  };
  trabajo.then(terminar, terminar);
  return conTiempoLimite(trabajo, tiempoMaxMs);
}

// Revisión inmediata de un negocio, en segundo plano (la dispara el aviso de Gmail).
// Devuelve true si el negocio está en modo automático.
async function revisarNegocioYa(negocio_id) {
  try {
    const negocio = await obtenerNegocio(negocio_id);
    if (!negocio || negocio.modo_registro !== 'automatico') return false;
    revisarSinSolapar(negocio, TIEMPO_MAX_NEGOCIO_MS, 'aviso').catch((err) => {
      console.error(`[AutoRegistro] Error en el negocio ${negocio_id}:`, err.message);
      salud.registrar('registro_auto', err.message, negocio_id);
    });
    return true;
  } catch (err) {
    console.error('[AutoRegistro] Error en la revisión inmediata:', err.message);
    return false;
  }
}

// Corre cada 10 segundos (index.js). Con negocio_ids revisa solo esos negocios.
// Devuelve la cantidad de pagos registrados, o null si ya había otra revisión en curso.
async function registrarIngresosAutomaticos({ negocio_ids, tiempoMaxNegocioMs = TIEMPO_MAX_NEGOCIO_MS } = {}) {
  if (registrando) return null;
  registrando = true;
  vuelta += 1;
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
        // Con aviso inmediato vigente esta vuelta es solo un respaldo: no se hace en todas.
        if (avisoVigente(negocio.id) && vuelta % VUELTAS_RESPALDO !== 0) continue;
        try {
          const registrados = await revisarSinSolapar(negocio, tiempoMaxNegocioMs, 'periodica');
          if (registrados) total += registrados;
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

// `origen` solo sirve para el log: 'aviso' (aviso inmediato de Gmail) o 'periodica' (la revisión de respaldo).
async function registrarDeNegocio(negocio, origen = 'periodica') {
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
    if (await guardarIngreso(negocio, ingreso, origen)) registrados++;
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

async function guardarIngreso(negocio, ingreso, origen) {
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
    // Para medir la velocidad real: segundos desde que llegó el correo hasta que quedó registrado (sin datos del cliente).
    if (ingreso.llegada) {
      const segundos = Math.max(0, Date.now() / 1000 - ingreso.llegada);
      console.log(`[AutoRegistro] Pago registrado ${segundos.toFixed(1)} s después de llegar el correo (negocio ${negocio.id}, ${origen})`);
    }
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

module.exports = {
  registrarIngresosAutomaticos, revisarNegocioYa, olvidarVistos,
  marcarAvisoInmediato, quitarAvisoInmediato, vencimientoDelAviso, avisoVigente,
};
