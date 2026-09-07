// test/plan-vencimiento.test.js — Vencimiento mensual de planes pagados
// Usa un negocio de prueba dedicado (creado/eliminado en este mismo archivo)
// contra la base de datos local, para no pisar datos de negocios reales.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { db, crearNegocio, verificarTrialActivo, marcarNegocioPagado } = require('../db');

function runAsync(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err); else resolve(this);
    });
  });
}

describe('verificarTrialActivo — plan pagado', () => {
  let negocioId;

  before(async () => {
    const negocio = await crearNegocio({ nombre: '__test_plan_vencimiento__', plan: 'basico' });
    negocioId = negocio.id;
  });

  after(async () => {
    await runAsync('DELETE FROM negocios WHERE id = ?', [negocioId]);
  });

  test('pagado sin plan_vence (pago legado) queda activo indefinidamente', async () => {
    await runAsync('UPDATE negocios SET pagado = 1, plan_vence = NULL WHERE id = ?', [negocioId]);
    const resultado = await verificarTrialActivo(negocioId);
    assert.equal(resultado.activo, true);
    assert.equal(resultado.pagado, true);
  });

  test('pagado con plan_vence futuro queda activo', async () => {
    const enDiez = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await runAsync('UPDATE negocios SET pagado = 1, plan_vence = ? WHERE id = ?', [enDiez, negocioId]);
    const resultado = await verificarTrialActivo(negocioId);
    assert.equal(resultado.activo, true);
    assert.ok(resultado.dias > 0);
  });

  test('pagado con plan_vence en el pasado queda bloqueado (plan_vencido)', async () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await runAsync('UPDATE negocios SET pagado = 1, plan_vence = ? WHERE id = ?', [ayer, negocioId]);
    const resultado = await verificarTrialActivo(negocioId);
    assert.equal(resultado.activo, false);
    assert.equal(resultado.razon, 'plan_vencido');
  });

  test('plan_ilimitado queda activo sin importar que plan_vence haya pasado', async () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await runAsync('UPDATE negocios SET pagado = 1, plan_vence = ?, plan_ilimitado = 1 WHERE id = ?', [ayer, negocioId]);
    const resultado = await verificarTrialActivo(negocioId);
    assert.equal(resultado.activo, true);
    assert.equal(resultado.ilimitado, true);

    await runAsync('UPDATE negocios SET plan_ilimitado = 0 WHERE id = ?', [negocioId]);
  });
});

describe('marcarNegocioPagado', () => {
  let negocioId;

  before(async () => {
    const negocio = await crearNegocio({ nombre: '__test_marcar_pagado__', plan: 'basico' });
    negocioId = negocio.id;
  });

  after(async () => {
    await runAsync('DELETE FROM negocios WHERE id = ?', [negocioId]);
  });

  test('primer pago suma 30 dias desde hoy', async () => {
    await marcarNegocioPagado(negocioId, 'basico');
    const resultado = await verificarTrialActivo(negocioId);
    assert.equal(resultado.activo, true);
    // Debe quedar entre 29 y 30 dias (margen por redondeo de horas)
    assert.ok(resultado.dias >= 29 && resultado.dias <= 30, `dias fue ${resultado.dias}`);
  });

  test('renovar antes de vencer suma 30 dias desde el vencimiento vigente (no desde hoy)', async () => {
    // Deja el plan por vencer en 5 dias
    const enCinco = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await runAsync('UPDATE negocios SET plan_vence = ? WHERE id = ?', [enCinco, negocioId]);

    await marcarNegocioPagado(negocioId, 'basico');
    const resultado = await verificarTrialActivo(negocioId);
    // 5 dias que quedaban + 30 nuevos = ~35, no ~30 (que perderia los 5 dias ya pagados)
    assert.ok(resultado.dias >= 34 && resultado.dias <= 35, `dias fue ${resultado.dias}`);
  });
});
