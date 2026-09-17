// test/verificador.test.js — Respaldo cuando Gmail no confirma el pago
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { verificarPago } = require('../verificador');

describe('verificarPago', () => {
  test('rechaza comprobante sin monto como INCOMPLETO', () => {
    const resultado = verificarPago({ monto: null });
    assert.equal(resultado.estado, 'INCOMPLETO');
  });

  test('con monto pero sin confirmar por Gmail, devuelve NO_ENCONTRADO', () => {
    const resultado = verificarPago({ monto: 50000 });
    assert.equal(resultado.estado, 'NO_ENCONTRADO');
  });
});
