// bot/avisos.js — Aviso al admin de que su plan vence o vencio.
// Sin esto el admin se entera del plan vencido solo cuando un empleado
// intenta pagar y falla (los endpoints de Wompi son soloAdmin).
const {
  listarNegocios, verificarTrialActivo,
  obtenerAdminParaAvisos, yaSeAviso, registrarAviso,
} = require('../db');
const { enviarAvisoPlan, enviarAvisoLimite, formatearFecha, NOMBRE_PLAN } = require('../mailer');
const { enviarPlantilla } = require('./openwa');

// Plan anual avisa con más margen que el mensual (uno que pagó hace casi un
// año no se acuerda con solo 3 días).
const DIAS_AVISO = [3];
const DIAS_AVISO_ANUAL = [15];

// Decide si toca avisar y de que. Se mantiene pura para poder probarla sin
// tocar la BD ni WhatsApp.
function decidirAviso(estado) {
  if (!estado || estado.ilimitado) return null;

  const vence = estado.plan_vence || estado.trial_fin;
  if (!vence) return null;

  if (!estado.activo) {
    if (estado.razon === 'plan_vencido' || estado.razon === 'trial_expirado') {
      return { tipo: 'vencido', vence, dias: 0 };
    }
    return null; // negocio inactivo o inexistente: no es asunto de este aviso
  }

  const dias = Number(estado.dias);
  const diasAviso = estado.plan_anual ? DIAS_AVISO_ANUAL : DIAS_AVISO;
  if (diasAviso.includes(dias)) return { tipo: `faltan_${dias}`, vence, dias };
  return null;
}

// Plantilla de WhatsApp según sea prueba gratis o plan pagado, y si ya venció.
function plantillaAviso({ esPrueba, dias, nombre, nombrePlan, fecha }) {
  if (esPrueba) {
    return { clave: dias > 0 ? 'prueba_por_terminar' : 'prueba_terminada', variables: [nombre, fecha] };
  }
  return dias > 0
    ? { clave: 'plan_por_vencer', variables: [nombre, nombrePlan, fecha] }
    : { clave: 'plan_vencido', variables: [nombre, fecha] };
}

async function avisarNegocio(negocio) {
  const estado = await verificarTrialActivo(negocio.id);
  const aviso = decidirAviso(estado);
  if (!aviso) return false;

  if (await yaSeAviso(negocio.id, aviso.tipo, aviso.vence)) return false;

  const admin = await obtenerAdminParaAvisos(negocio.id);
  if (!admin) {
    console.log(`[Avisos] Negocio ${negocio.id} sin admin al que avisar`);
    return false;
  }

  const nombrePlan = NOMBRE_PLAN[estado.plan] || estado.plan || 'Básico';
  const fecha = formatearFecha(aviso.vence);

  const esPrueba = !estado.pagado;

  if (admin.email) {
    try {
      await enviarAvisoPlan(admin.email, admin.nombre, estado.plan, aviso.vence, aviso.dias, { esPrueba });
    } catch (err) {
      console.error(`[Avisos] Correo falló (negocio ${negocio.id}):`, err.message);
    }
  }

  if (admin.whatsapp) {
    // Falle lo que falle aqui, el aviso queda registrado igual: reintentar cada
    // hora seria acosar al admin, y el correo normalmente ya salio.
    const { clave, variables } = plantillaAviso({ esPrueba, dias: aviso.dias, nombre: admin.nombre, nombrePlan, fecha });
    await enviarPlantilla(admin.whatsapp, clave, variables);
  }

  await registrarAviso(negocio.id, aviso.tipo, aviso.vence);
  console.log(`[Avisos] "${aviso.tipo}" enviado al admin del negocio ${negocio.id}`);
  return true;
}

// Las fechas cambian a medianoche: sin esto el aviso le llegaría al dueño de madrugada.
const HORA_INICIO_AVISOS = 8;
const HORA_FIN_AVISOS = 20;

function enHorarioDeAvisos(fecha = new Date()) {
  const hora = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota', hour: 'numeric', hourCycle: 'h23',
  }).format(fecha));
  return hora >= HORA_INICIO_AVISOS && hora < HORA_FIN_AVISOS;
}

async function revisarVencimientos() {
  if (!enHorarioDeAvisos()) return 0;

  let negocios;
  try {
    negocios = await listarNegocios();
  } catch (err) {
    console.error('[Avisos] Error listando negocios:', err.message);
    return 0;
  }

  let enviados = 0;
  for (const negocio of negocios) {
    try {
      if (await avisarNegocio(negocio)) enviados++;
    } catch (err) {
      // Un negocio con datos raros no debe cortar la revision de los demas.
      console.error(`[Avisos] Error con el negocio ${negocio.id}:`, err.message);
    }
  }
  if (enviados) console.log(`[Avisos] Revisión completa: ${enviados} aviso(s) enviado(s)`);
  return enviados;
}

// ─── Límite de comprobantes del mes ───────────────────────
// Un aviso por mes y tipo: 'limite_alcanzado' (entró a la cortesía) y
// 'limite_agotado' (el bot se detuvo).
function mesActual(fecha = new Date()) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

async function avisarLimite(negocio, tipo, { limite, tope }) {
  // Se reclama antes de enviar: dos comprobantes a la vez no mandan dos avisos.
  if (!(await registrarAviso(negocio.id, tipo, mesActual()))) return false;

  const admin = await obtenerAdminParaAvisos(negocio.id);
  if (!admin) {
    console.log(`[Avisos] Negocio ${negocio.id} sin admin al que avisar del límite`);
    return false;
  }

  if (admin.email) {
    try {
      await enviarAvisoLimite(admin.email, admin.nombre, negocio.nombre, tipo, { limite, tope });
    } catch (err) {
      console.error(`[Avisos] Correo de límite falló (negocio ${negocio.id}):`, err.message);
    }
  }

  if (admin.whatsapp) {
    const variables = tipo === 'limite_agotado'
      ? [admin.nombre, negocio.nombre, tope.toLocaleString('es-CO')]
      : [admin.nombre, negocio.nombre, limite.toLocaleString('es-CO'), (tope - limite).toLocaleString('es-CO')];
    await enviarPlantilla(admin.whatsapp, tipo, variables);
  }

  console.log(`[Avisos] "${tipo}" enviado al admin del negocio ${negocio.id}`);
  return true;
}

module.exports = { revisarVencimientos, decidirAviso, plantillaAviso, enHorarioDeAvisos, avisarLimite, mesActual, DIAS_AVISO, DIAS_AVISO_ANUAL };
