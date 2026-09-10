// test/mailer.test.js — Formato de fechas en los correos
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { formatearFecha } = require('../mailer');

describe('formatearFecha', () => {
  // Las fechas de la BD son 'YYYY-MM-DD'. Interpretarlas como UTC y mostrarlas
  // en hora de Colombia restaba un dia: al cliente se le anunciaba el fin de su
  // prueba antes de tiempo.
  test('no adelanta el dia en una fecha YYYY-MM-DD', () => {
    assert.equal(formatearFecha('2026-09-16'), '16/9/2026');
  });

  test('respeta el primer dia del anio', () => {
    assert.equal(formatearFecha('2026-01-01'), '1/1/2026');
  });

  test('respeta el ultimo dia del anio', () => {
    assert.equal(formatearFecha('2026-12-31'), '31/12/2026');
  });

  test('sigue funcionando con una fecha completa ISO', () => {
    assert.match(formatearFecha('2026-09-16T15:30:00.000Z'), /\d{1,2}\/\d{1,2}\/2026/);
  });
});
