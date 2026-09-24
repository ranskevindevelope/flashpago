// reportes.js — Reportes del cierre de turno (multi-negocio)
const {
  db, resumenDelDia, obtenerNegocio, totalDelDia, correosYaUsados, pagosNoConfirmadosDeHoy, pagosConfirmadosTardeDeHoy,
} = require('../db');
const { listarIngresosDelDia } = require('../gmail');
const { enviarPlantilla } = require('./openwa');

// ─── Obtener admins de un negocio ───────────────────────
function obtenerAdminsNegocio(negocio_id) {
  return new Promise((resolve) => {
    db.all(
      `SELECT whatsapp FROM usuarios WHERE negocio_id = ? AND rol = 'admin' AND activo = 1 AND whatsapp IS NOT NULL`,
      [negocio_id],
      (err, rows) => {
        if (err) {
          console.error(`[Reporte] Error consultando admins del negocio ${negocio_id}:`, err.message);
          resolve([]);
          return;
        }
        if (!rows || rows.length === 0) {
          console.warn(`[Reporte] Negocio ${negocio_id} no tiene ningún admin con WhatsApp registrado; no se envía reporte.`);
          resolve([]);
          return;
        }
        resolve(rows.map(r => r.whatsapp.includes('@') ? r.whatsapp : `${r.whatsapp}@c.us`));
      }
    );
  });
}

async function enviarReporteDiario(negocio_id = 1) {
  try {
    const { total, cantidad, pagoMasAlto } = await resumenDelDia(negocio_id);
    const fecha = new Date().toLocaleDateString('es-CO');

    let negocioNombre = 'FlashPago';
    try {
      const neg = await obtenerNegocio(negocio_id);
      if (neg) negocioNombre = neg.nombre;
    } catch (_) {}

    let mensaje;
    if (cantidad === 0) {
      mensaje = `📊 *Cierre del día — ${negocioNombre} — ${fecha}*\n\nHoy no se registraron pagos.`;
    } else {
      mensaje =
        `📊 *Cierre del día — ${negocioNombre} — ${fecha}*\n\n` +
        `✅ Pagos confirmados: ${cantidad}\n` +
        `💵 Total recibido: $${total.toLocaleString('es-CO')}\n`;

      if (pagoMasAlto) {
        mensaje += `🏆 Pago más alto: $${pagoMasAlto.monto.toLocaleString('es-CO')}`;
        if (pagoMasAlto.nombre_cliente) {
          mensaje += ` (${pagoMasAlto.nombre_cliente})`;
        }
        mensaje += `\n`;
      }

      mensaje += `\n¡Buen trabajo hoy! 🍔`;
    }

    const numerosReporte = await obtenerAdminsNegocio(negocio_id);
    for (const numero of numerosReporte) {
      await enviarPlantilla(
        numero,
        'reporte_diario',
        [negocioNombre, String(cantidad), total.toLocaleString('es-CO')],
        { textoOpenwa: mensaje }
      );
    }
    console.log(`[Reporte] Reporte diario enviado (negocio ${negocio_id})`);
  } catch (err) {
    console.error('[Reporte] Error:', err.message);
  }
}

// ─── Cierre de turno: pagos que llegaron tarde y los que nunca aparecieron ───
async function enviarReportePendientes(negocio_id) {
  try {
    const [tarde, noConfirmados] = await Promise.all([
      pagosConfirmadosTardeDeHoy(negocio_id),
      pagosNoConfirmadosDeHoy(negocio_id),
    ]);
    if (tarde.length === 0 && noConfirmados.length === 0) return;

    let negocioNombre = 'FlashPago';
    try {
      const neg = await obtenerNegocio(negocio_id);
      if (neg) negocioNombre = neg.nombre;
    } catch (_) {}
    const numerosReporte = await obtenerAdminsNegocio(negocio_id);

    if (tarde.length > 0) {
      const total = tarde.reduce((s, p) => s + p.monto, 0);
      const lista = tarde.map(p => `✅ $${p.monto.toLocaleString('es-CO')} — ${p.nombre_cliente || 'Sin nombre'} (Ref: ${p.referencia || 'Sin ref'})`).join('\n');

      const mensaje =
        `🔔 *${negocioNombre} — Pagos que llegaron tarde*\n\n` +
        `${lista}\n\n` +
        `📊 ${tarde.length} pago(s) confirmado(s) cuando llegó tarde el correo del banco\n` +
        `💵 Total: $${total.toLocaleString('es-CO')}`;

      for (const numero of numerosReporte) {
        await enviarPlantilla(
          numero,
          'verificacion_nocturna',
          [negocioNombre, String(tarde.length), total.toLocaleString('es-CO')],
          { textoOpenwa: mensaje }
        );
      }
    }

    if (noConfirmados.length > 0) {
      const lista = noConfirmados.map(p => `• $${p.monto.toLocaleString('es-CO')} — Ref: ${p.referencia || 'Sin ref'} — ${p.hora}`).join('\n');

      const mensaje =
        `⚠️ *${negocioNombre} — Pagos no confirmados*\n\n` +
        `No llegó la notificación del banco de estos ${noConfirmados.length} pago(s):\n\n` +
        `${lista}\n\n` +
        `Revísalos en la app del banco.`;

      for (const numero of numerosReporte) {
        await enviarPlantilla(
          numero,
          'pagos_no_confirmados',
          [negocioNombre, String(noConfirmados.length)],
          { textoOpenwa: mensaje }
        );
      }
    }
    console.log(`[Reporte] Pendientes del cierre enviados (negocio ${negocio_id}): ${tarde.length} tarde, ${noConfirmados.length} sin confirmar`);
  } catch (err) {
    console.error('[Reporte] Error en pendientes del cierre:', err.message);
  }
}

// ─── Buscar transferencias recibidas SIN comprobante ───────
async function buscarIngresosSinComprobante(negocio_id = 1) {
  try {
    // 1) Ingresos vistos en el banco (Gmail)
    const ingresos = await listarIngresosDelDia(negocio_id);
    if (!ingresos || ingresos.length === 0) {
      console.log(`[SinComprobante] No se detectaron ingresos en el banco (negocio ${negocio_id})`);
      return;
    }

    // 2) Se compara correo por correo, no por monto: dos transferencias
    //    iguales con un solo comprobante deben avisarse.
    const usados = await correosYaUsados(ingresos.map(i => i.gmail_id));
    // Los pagos del día confirmados sin correo (a mano, o de antes de guardar
    // gmail_id) cubren cada uno un correo de su mismo monto.
    const { pagos } = await totalDelDia(negocio_id);
    const cupos = new Map();
    for (const p of pagos || []) {
      if (!p.gmail_id) cupos.set(p.monto, (cupos.get(p.monto) || 0) + 1);
    }

    // 3) Ingresos del banco que no tienen pago registrado
    const sinComprobante = ingresos.filter(i => {
      if (usados.has(i.gmail_id)) return false;
      const libres = cupos.get(i.monto) || 0;
      if (libres > 0) {
        cupos.set(i.monto, libres - 1);
        return false;
      }
      return true;
    });

    if (sinComprobante.length === 0) {
      console.log(`[SinComprobante] Todos los ingresos del banco tienen comprobante (negocio ${negocio_id})`);
      return;
    }

    let negocioNombre = 'FlashPago';
    try {
      const neg = await obtenerNegocio(negocio_id);
      if (neg) negocioNombre = neg.nombre;
    } catch (_) {}

    const fecha = new Date().toLocaleDateString('es-CO');
    const totalSinComprobante = sinComprobante.reduce((s, i) => s + i.monto, 0);
    const lista = sinComprobante.map(i => `💸 $${i.monto.toLocaleString('es-CO')}${i.nombre ? ' — ' + i.nombre : ''}`).join('\n');

    const mensaje =
      `💰 *${negocioNombre} — Ingresos sin comprobante — ${fecha}*\n\n` +
      `Se encontraron las siguientes transferencias en el banco que NO tienen comprobante registrado:\n\n` +
      `${lista}\n\n` +
            `📊 Total sin comprobante: $${totalSinComprobante.toLocaleString('es-CO')}\n\n` +
            `⚠️ por favor enviar los comprobantes correspondientes y registrar el pago`;

    const numerosReporte = await obtenerAdminsNegocio(negocio_id);
    for (const numero of numerosReporte) {
      await enviarPlantilla(
        numero,
        'ingresos_sin_comprobante',
        [negocioNombre, String(sinComprobante.length), totalSinComprobante.toLocaleString('es-CO')],
        { textoOpenwa: mensaje }
      );
    }
    console.log(`[SinComprobante] Alerta enviada: ${sinComprobante.length} ingreso(s) sin comprobante (negocio ${negocio_id})`);
  } catch (err) {
    console.error('[SinComprobante] Error:', err.message);
  }
}

module.exports = { enviarReporteDiario, enviarReportePendientes, buscarIngresosSinComprobante, obtenerAdminsNegocio };