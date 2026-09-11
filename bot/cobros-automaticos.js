// bot/cobros-automaticos.js — Renovación automática de planes con tarjeta guardada.
//
// Corre junto a bot/avisos.js en el mismo scheduler cada hora. La diferencia:
// avisos.js manda un recordatorio; esto cobra de verdad, usando la fuente de
// pago que Wompi guardó (nunca un número de tarjeta, ver routes/wompi.js).
//
// El resultado real del cobro llega despues, por el webhook de Wompi
// (routes/wompi.js POST /webhook), que ya sabe completar un pago PENDIENTE
// via marcarNegocioPagado — esto solo crea ese registro y dispara el cobro.
const config = require('../config');
const {
  listarNegociosParaRenovarAutomaticamente,
  obtenerPagoPlataforma,
  crearPagoPlataforma,
  obtenerAdminDeNegocio,
  PRECIOS_CENTAVOS,
} = require('../db');

// Se cobra un dia antes de vencer (no el mismo dia) para que, si algo sale
// mal, quede un dia de margen antes de que el bot deje de verificar pagos —
// en ese caso el aviso normal de avisos.js sigue funcionando igual.
const DIAS_ANTES_DE_COBRAR = 1;

function diasRestantes(planVence) {
  if (!planVence) return null;
  const hoy = new Date().toISOString().split('T')[0];
  return Math.ceil((new Date(planVence) - new Date(hoy)) / (1000 * 60 * 60 * 24));
}

// Determina si toca cobrar. Pura, para poder probarla sin tocar la BD ni Wompi.
function decidirCobro(negocio) {
  if (!negocio?.plan_vence || !negocio?.wompi_payment_source_id) return null;
  const dias = diasRestantes(negocio.plan_vence);
  if (dias === null || dias > DIAS_ANTES_DE_COBRAR) return null;

  const planId = negocio.plan_anual ? `${negocio.plan}_anual` : negocio.plan;
  const monto = PRECIOS_CENTAVOS[planId];
  if (!monto) return null; // plan desconocido (p.ej. 'empresarial', que no se autorenueva)

  // Referencia determinista por ciclo: si el scheduler corre varias veces
  // antes de que el webhook confirme, reintentar con la MISMA referencia es
  // seguro — Wompi la rechaza como duplicada en vez de cobrar dos veces.
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
    // La transacción quedó creada como PENDIENTE en pagos_plataforma; si Wompi
    // nunca la recibió, se queda así — no bloquea nada, el aviso normal de
    // avisos.js sigue avisando mientras el plan no se renueve.
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
