// test/avisos.test.js — Decision de a quien avisar y cuando
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { decidirAviso } = require('../bot/avisos');

describe('decidirAviso', () => {
  test('avisa 3 días antes de que venza un plan pagado', () => {
    const r = decidirAviso({ activo: true, pagado: true, plan: 'premium', plan_vence: '2026-09-16', dias: 3 });
    assert.deepEqual(r, { tipo: 'faltan_3', vence: '2026-09-16', dias: 3 });
  });

  test('avisa cuando el plan ya venció', () => {
    const r = decidirAviso({ activo: false, pagado: true, razon: 'plan_vencido', plan_vence: '2026-09-09', dias: 0 });
    assert.deepEqual(r, { tipo: 'vencido', vence: '2026-09-09', dias: 0 });
  });

  test('avisa cuando expiró la prueba gratis', () => {
    const r = decidirAviso({ activo: false, razon: 'trial_expirado', trial_fin: '2026-09-09', dias: 0 });
    assert.deepEqual(r, { tipo: 'vencido', vence: '2026-09-09', dias: 0 });
  });

  test('no avisa a 5 días: solo en los dias configurados', () => {
    assert.equal(decidirAviso({ activo: true, plan_vence: '2026-09-20', dias: 5 }), null);
  });

  test('no avisa a un plan ilimitado', () => {
    assert.equal(decidirAviso({ activo: true, ilimitado: true, plan_vence: '2026-09-16', dias: 3 }), null);
  });

  test('no avisa a un negocio viejo sin fecha de vencimiento', () => {
    assert.equal(decidirAviso({ activo: true, pagado: true, plan: 'basico' }), null);
  });

  test('no avisa si el negocio no existe', () => {
    assert.equal(decidirAviso({ activo: false, razon: 'negocio_no_encontrado' }), null);
    assert.equal(decidirAviso(null), null);
  });

  test('el tipo incluye la fecha, para que el aviso se repita el siguiente ciclo', () => {
    const septiembre = decidirAviso({ activo: true, plan_vence: '2026-09-16', dias: 3 });
    const octubre = decidirAviso({ activo: true, plan_vence: '2026-10-16', dias: 3 });
    assert.equal(septiembre.tipo, octubre.tipo);
    assert.notEqual(septiembre.vence, octubre.vence);
  });

  describe('planes anuales', () => {
    // Un anual avisa a 15 días, no a 3: con casi un año pagado nadie se
    // acuerda de una fecha exacta con tan poca antelación.
    test('un plan anual avisa a 15 días, no a 3', () => {
      const r = decidirAviso({ activo: true, plan_anual: true, plan_vence: '2026-09-24', dias: 15 });
      assert.deepEqual(r, { tipo: 'faltan_15', vence: '2026-09-24', dias: 15 });
    });

    test('a un plan anual, 3 días antes no le dispara nada', () => {
      assert.equal(decidirAviso({ activo: true, plan_anual: true, plan_vence: '2026-09-12', dias: 3 }), null);
    });

    test('a un plan mensual, 15 días antes no le dispara nada', () => {
      assert.equal(decidirAviso({ activo: true, plan_anual: false, plan_vence: '2026-09-24', dias: 15 }), null);
    });

    test('vencido, anual o no, siempre avisa igual', () => {
      const r = decidirAviso({ activo: false, plan_anual: true, razon: 'plan_vencido', plan_vence: '2026-09-09', dias: 0 });
      assert.deepEqual(r, { tipo: 'vencido', vence: '2026-09-09', dias: 0 });
    });
  });
});
