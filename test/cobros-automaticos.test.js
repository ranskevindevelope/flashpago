// test/cobros-automaticos.test.js — Decisión de cuándo cobrar automáticamente
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { decidirCobro, DIAS_ANTES_DE_COBRAR } = require('../bot/cobros-automaticos');

function enDias(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

describe('decidirCobro', () => {
  test('cobra el día antes de vencer', () => {
    const r = decidirCobro({ id: 7, nombre: 'Prueba', plan: 'premium', plan_anual: 0, plan_vence: enDias(1), wompi_payment_source_id: '999' });
    assert.equal(r.planId, 'premium');
    assert.equal(r.referencia, `FP-AUTO-7-${enDias(1)}`);
    assert.ok(r.monto > 0);
  });

  test('cobra el mismo día del vencimiento', () => {
    const r = decidirCobro({ id: 7, plan: 'premium', plan_anual: 0, plan_vence: enDias(0), wompi_payment_source_id: '999' });
    assert.ok(r);
  });

  test('cobra si ya venció y nadie lo notó (dias negativos)', () => {
    const r = decidirCobro({ id: 7, plan: 'premium', plan_anual: 0, plan_vence: enDias(-3), wompi_payment_source_id: '999' });
    assert.ok(r);
  });

  test('no cobra si todavía faltan varios días', () => {
    const r = decidirCobro({ id: 7, plan: 'premium', plan_anual: 0, plan_vence: enDias(5), wompi_payment_source_id: '999' });
    assert.equal(r, null);
  });

  test('no cobra sin fuente de pago guardada', () => {
    const r = decidirCobro({ id: 7, plan: 'premium', plan_anual: 0, plan_vence: enDias(0), wompi_payment_source_id: null });
    assert.equal(r, null);
  });

  test('no cobra sin plan_vence (negocio nunca ha pagado)', () => {
    const r = decidirCobro({ id: 7, plan: 'premium', plan_anual: 0, plan_vence: null, wompi_payment_source_id: '999' });
    assert.equal(r, null);
  });

  test('un plan anual cobra el precio y el id anual, no el mensual', () => {
    const r = decidirCobro({ id: 7, plan: 'premium', plan_anual: 1, plan_vence: enDias(1), wompi_payment_source_id: '999' });
    assert.equal(r.planId, 'premium_anual');
  });

  test('no cobra un plan sin precio definido (p.ej. empresarial a medida)', () => {
    const r = decidirCobro({ id: 7, plan: 'empresarial_a_medida', plan_anual: 0, plan_vence: enDias(0), wompi_payment_source_id: '999' });
    assert.equal(r, null);
  });

  test('la referencia es la misma para el mismo ciclo (no cobra dos veces)', () => {
    const negocio = { id: 42, plan: 'basico', plan_anual: 0, plan_vence: enDias(1), wompi_payment_source_id: '1' };
    const a = decidirCobro(negocio);
    const b = decidirCobro(negocio);
    assert.equal(a.referencia, b.referencia);
  });

  test('DIAS_ANTES_DE_COBRAR es 1 (no el mismo instante del vencimiento)', () => {
    assert.equal(DIAS_ANTES_DE_COBRAR, 1);
  });
});
