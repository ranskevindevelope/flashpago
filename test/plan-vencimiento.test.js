// test/plan-vencimiento.test.js — Vencimiento mensual de planes pagados
// Usa un negocio de prueba dedicado (creado/eliminado en este mismo archivo)
// contra la base de datos local, para no pisar datos de negocios reales.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { db, crearNegocio, verificarTrialActivo, marcarNegocioPagado, esAnual, planBase, PRECIOS_CENTAVOS } = require('../db');

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

  describe('planes anuales', () => {
    // El test previo deja plan_vence unos dias adelante; marcarNegocioPagado
    // suma desde el vencimiento vigente (a proposito, para no perder dias ya
    // pagados), asi que sin este reset los "~365 dias" de aqui heredarian esos
    // dias extra y el test se volveria dependiente del orden de ejecucion.
    before(async () => {
      await runAsync('UPDATE negocios SET plan_vence = NULL WHERE id = ?', [negocioId]);
    });

    test('un plan "premium_anual" suma 365 dias, no 30', async () => {
      await marcarNegocioPagado(negocioId, 'premium_anual');
      const resultado = await verificarTrialActivo(negocioId);
      assert.equal(resultado.activo, true);
      assert.equal(resultado.plan_anual, true);
      assert.ok(resultado.dias >= 364 && resultado.dias <= 365, `dias fue ${resultado.dias}`);
    });

    test('guarda el plan BASE en negocios.plan, no "premium_anual"', async () => {
      // NOMBRE_PLAN, los <option> del dashboard y LIMITES_PLAN solo conocen
      // los 4 planes base — si aqui quedara "premium_anual" se romperian.
      await marcarNegocioPagado(negocioId, 'premium_anual');
      const resultado = await verificarTrialActivo(negocioId);
      assert.equal(resultado.plan, 'premium');
    });

    test('asigna el limite de comprobantes del plan base, no un limite aparte', async () => {
      await marcarNegocioPagado(negocioId, 'premium_anual');
      const row = await new Promise((resolve, reject) => {
        db.get('SELECT limite_comprobantes FROM negocios WHERE id = ?', [negocioId], (err, r) => (err ? reject(err) : resolve(r)));
      });
      assert.equal(row.limite_comprobantes, 1000); // el mismo limite mensual que 'premium'
    });

    test('volver a un plan mensual apaga la bandera plan_anual', async () => {
      await marcarNegocioPagado(negocioId, 'premium_anual');
      await marcarNegocioPagado(negocioId, 'basico');
      const resultado = await verificarTrialActivo(negocioId);
      assert.equal(resultado.plan_anual, false);
    });
  });
});

describe('esAnual / planBase', () => {
  test('reconoce el sufijo _anual', () => {
    assert.equal(esAnual('premium_anual'), true);
    assert.equal(esAnual('premium'), false);
    assert.equal(esAnual(undefined), false);
  });

  test('quita el sufijo para obtener el plan base', () => {
    assert.equal(planBase('premium_anual'), 'premium');
    assert.equal(planBase('premium_plus_anual'), 'premium_plus');
    assert.equal(planBase('basico'), 'basico'); // sin sufijo, no cambia
  });
});

describe('PRECIOS_CENTAVOS — planes anuales', () => {
  test('los 3 planes autoservicio tienen su variante anual', () => {
    for (const plan of ['basico', 'premium', 'premium_plus']) {
      assert.ok(PRECIOS_CENTAVOS[`${plan}_anual`] > 0, `falta el precio anual de ${plan}`);
    }
  });

  test('el anual sale mas barato que 12 meses sueltos (el descuento existe de verdad)', () => {
    for (const plan of ['basico', 'premium', 'premium_plus']) {
      const anual = PRECIOS_CENTAVOS[`${plan}_anual`];
      const docemeses = PRECIOS_CENTAVOS[plan] * 12;
      assert.ok(anual < docemeses, `${plan}_anual (${anual}) no es mas barato que 12 meses (${docemeses})`);
    }
  });

  test('a mas caro el plan, mayor el descuento anual (Plus > Premium > Basico)', () => {
    const descuento = (plan) => 1 - PRECIOS_CENTAVOS[`${plan}_anual`] / (PRECIOS_CENTAVOS[plan] * 12);
    assert.ok(descuento('premium') > descuento('basico'));
    assert.ok(descuento('premium_plus') > descuento('premium'));
  });
});
