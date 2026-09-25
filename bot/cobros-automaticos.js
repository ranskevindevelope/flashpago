// bot/cobros-automaticos.js — Renovación automática de planes con tarjeta guardada.
// A diferencia de avisos.js (que solo recuerda), esto cobra de verdad con la
// fuente de pago que Wompi guardó. El resultado real llega despues por el
// webhook de Wompi (routes/wompi.js), que completa el pago PENDIENTE que
// esto crea.
const config = require('../config');
const {
  listarNegociosParaRenovarAutomaticamente,
  obtenerPagoPlataforma,
  crearPagoPlataforma,
  obtenerAdminDeNegocio,
  PRECIOS_CENTAVOS,
  diasDeServicio,
} = require('../db');

// Un día antes de vencer, para dejar margen si algo sale mal antes de que
// el bot deje de verificar pagos.
const DIAS_ANTES_DE_COBRAR = 1;

// Días que faltan para el último día pagado (0 = hoy es el último), en hora de Colombia.
function diasRestantes(planVence) {
  if (!planVence) return null;
  return diasDeServicio(planVence) - 1;
}

// Determina si toca cobrar. Pura, para poder probarla sin tocar la BD ni Wompi.
function decidirCobro(negocio) {
  if (!negocio?.plan_vence || !negocio?.wompi_payment_source_id) return null;
  const dias = diasRestantes(negocio.plan_vence);
  if (dias === null || dias > DIAS_ANTES_DE_COBRAR) return null;

  const planId = negocio.plan_anual ? `${negocio.plan}_anual` : negocio.plan;
  const monto = PRECIOS_CENTAVOS[planId];
  if (!monto) return null; // plan desconocido (p.ej. 'empresarial', que no se autorenueva)

  // Referencia determinista por ciclo: si el scheduler reintenta, Wompi
  // la rechaza como duplicada en vez de cobrar dos veces.
  const referencia = `FP-AUTO-${negocio.id}-${negocio.plan_vence}`;
  return { planId, monto, referencia };
}

async function cobrarNegocio(negocio) {
  const decision = decidirCobro(negocio);
  if (!decision) return false;

  const yaExiste = await obtenerPagoPlataforma(decision.referencia);
  if (yaExiste) return false; // ya se intentó (o ya se cobró) este ciclo

  const admin = await obtenerAdminDeNegocio(negocio.id);
  if (!admin?.email) {
    console.error(`[CobroAuto] Negocio ${negocio.id} sin admin con correo — no se puede cobrar`);
    return false;
  }

  await crearPagoPlataforma({
    negocio_id: negocio.id,
    referencia: decision.referencia,
    plan: decision.planId,
    monto: decision.monto,
  });

  try {
    const r = await fetch(`${config.WOMPI_API_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.WOMPI_PRIVATE_KEY}` },
      body: JSON.stringify({
        amount_in_cents: decision.monto,
        currency: 'COP',
        customer_email: admin.email,
        reference: decision.referencia,
        payment_source_id: Number(negocio.wompi_payment_source_id),
        recurrent: true,
      }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error(`[CobroAuto] Wompi rechazó el cobro (negocio ${negocio.id}):`, JSON.stringify(body));
      return false;
    }
    console.log(`[CobroAuto] Cobro disparado: negocio ${negocio.id} (${negocio.nombre}), plan ${decision.planId}, ref ${decision.referencia}, estado inicial ${body?.data?.status || '?'}`);
    return true;
  } catch (err) {
    // Queda PENDIENTE en pagos_plataforma si Wompi nunca la recibió — no
    // bloquea nada, avisos.js sigue avisando mientras tanto.
    console.error(`[CobroAuto] Error de red cobrando al negocio ${negocio.id}:`, err.message);
    return false;
  }
}

async function ejecutarCobrosAutomaticos() {
  if (!config.WOMPI_PRIVATE_KEY) return 0; // Wompi no configurado — nada que hacer
  let negocios;
  try {
    negocios = await listarNegociosParaRenovarAutomaticamente();
  } catch (err) {
    console.error('[CobroAuto] Error listando negocios:', err.message);
    return 0;
  }

  let cobrados = 0;
  for (const negocio of negocios) {
    try {
      if (await cobrarNegocio(negocio)) cobrados++;
    } catch (err) {
      console.error(`[CobroAuto] Error con el negocio ${negocio.id}:`, err.message);
    }
  }
  if (cobrados) console.log(`[CobroAuto] Revisión completa: ${cobrados} cobro(s) disparado(s)`);
  return cobrados;
}

module.exports = { ejecutarCobrosAutomaticos, decidirCobro, DIAS_ANTES_DE_COBRAR };
