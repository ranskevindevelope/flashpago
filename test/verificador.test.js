// test/verificador.test.js — Deteccion de duplicados y validacion basica
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { verificarPago, comprobantesUsados } = require('../verificador');

describe('verificarPago', () => {
  beforeEach(() => {
    comprobantesUsados.clear();
  });

  test('rechaza comprobante sin monto como INCOMPLETO', async () => {
    const resultado = await verificarPago({ monto: null, referencia: 'REF1', banco: 'Nequi', negocio_id: 1 });
    assert.equal(resultado.estado, 'INCOMPLETO');
  });

  test('sin PROMETEO_API_KEY configurada, cae a modo demo (NO_ENCONTRADO)', async () => {
    const resultado = await verificarPago({ monto: 50000, referencia: 'REF2', banco: 'Bancolombia', negocio_id: 1 });
    assert.equal(resultado.estado, 'NO_ENCONTRADO');
  });

  test('detecta un comprobante duplicado por referencia + negocio', async () => {
    // Primera vez: cae a modo demo (NO_ENCONTRADO), no marca como usado porque
    // el modo demo nunca llega a REAL. Se simula el uso insertando directo.
    comprobantesUsados.set('1:REF3', { monto: 50000, fecha: '2026-09-07', banco: 'Nequi' });

    const resultado = await verificarPago({ monto: 50000, referencia: 'REF3', banco: 'Nequi', negocio_id: 1 });
    assert.equal(resultado.estado, 'DUPLICADO');
  });

  test('la misma referencia en otro negocio_id no cuenta como duplicado', async () => {
    comprobantesUsados.set('1:REF4', { monto: 50000, fecha: '2026-09-07', banco: 'Nequi' });

    const resultado = await verificarPago({ monto: 50000, referencia: 'REF4', banco: 'Nequi', negocio_id: 2 });
    assert.notEqual(resultado.estado, 'DUPLICADO');
  });
});
