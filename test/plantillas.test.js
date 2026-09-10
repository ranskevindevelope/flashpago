// test/plantillas.test.js — Plantillas de WhatsApp para avisos proactivos
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { PLANTILLAS, renderizar, cargaMeta, validarCuerpo } = require('../bot/plantillas');

describe('plantillas — reglas de aprobacion de Meta', () => {
  // No podemos enviar por Meta desde local, pero si comprobar que el texto
  // cumple lo que Meta exige. Descubrir un rechazo el dia de la migracion,
  // con openwa caido, seria el peor momento posible.
  for (const [clave, plantilla] of Object.entries(PLANTILLAS)) {
    test(`"${clave}" cumple las reglas de Meta`, () => {
      assert.deepEqual(validarCuerpo(plantilla.cuerpo), []);
    });

    test(`"${clave}" declara tantas variables como usa el texto`, () => {
      const usadas = new Set([...plantilla.cuerpo.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]));
      assert.equal(usadas.size, plantilla.variables.length);
    });
  }

  test('detecta variables pegadas', () => {
    assert.ok(validarCuerpo('Hola {{1}}{{2}} que tal').includes('tiene dos variables seguidas'));
  });

  test('detecta numeracion con saltos', () => {
    const errores = validarCuerpo('Hola {{1}} y tambien {{3}} gracias');
    assert.ok(errores.some((e) => e.includes('numeradas')));
  });

  test('detecta cuerpo que termina en variable', () => {
    assert.ok(validarCuerpo('Tu plan vence el {{1}}').includes('termina con una variable'));
  });
});

describe('plantillas — renderizado para openwa', () => {
  test('sustituye las variables en orden', () => {
    const texto = renderizar('plan_por_vencer', ['Kevin', 'Premium', '16/09/2026']);
    assert.ok(texto.includes('Hola Kevin,'));
    assert.ok(texto.includes('plan Premium'));
    assert.ok(texto.includes('vence el 16/09/2026'));
    assert.ok(!texto.includes('{{'), 'no deben quedar marcadores sin sustituir');
  });

  test('falla si faltan variables, en vez de mandar un {{2}} al cliente', () => {
    assert.throws(() => renderizar('plan_por_vencer', ['Kevin']), /espera 3 variables/);
  });

  test('falla con una plantilla que no existe', () => {
    assert.throws(() => renderizar('no_existe', []), /Plantilla desconocida/);
  });
});

describe('plantillas — carga para la API de Meta', () => {
  test('arma el payload con la forma que espera Meta', () => {
    const carga = cargaMeta('plan_vencido', ['Kevin', '09/09/2026'], '573167064671');
    assert.equal(carga.messaging_product, 'whatsapp');
    assert.equal(carga.type, 'template');
    assert.equal(carga.to, '573167064671');
    assert.equal(carga.template.name, 'plan_vencido');
    assert.equal(carga.template.language.code, 'es');
    assert.deepEqual(carga.template.components, [
      { type: 'body', parameters: [
        { type: 'text', text: 'Kevin' },
        { type: 'text', text: '09/09/2026' },
      ] },
    ]);
  });

  test('convierte los valores a texto (Meta rechaza numeros crudos)', () => {
    const carga = cargaMeta('plan_vencido', ['Kevin', 20260909], '573167064671');
    assert.strictEqual(carga.template.components[0].parameters[1].text, '20260909');
  });
});
