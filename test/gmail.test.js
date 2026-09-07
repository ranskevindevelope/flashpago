// test/gmail.test.js — Parseo de monto/nombre desde notificaciones bancarias
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { extraerMontoYNombre } = require('../gmail');

describe('extraerMontoYNombre — Bancolombia', () => {
  test('extrae monto y nombre de un snippet típico', () => {
    const snippet = 'Bancolombia le informa que ha recibido un pago de Juan Perez por $60.800 el 05/09/2026';
    const resultado = extraerMontoYNombre(snippet, 'notificacionesbancolombia.com');
    assert.deepEqual(resultado, { monto: 60800, nombre: 'Juan Perez' });
  });

  test('recorta centavos (.XX) del monto', () => {
    const snippet = 'pago de Ana Gomez por $15.500.00 el 05/09/2026';
    const resultado = extraerMontoYNombre(snippet, 'notificacionesbancolombia.com');
    assert.equal(resultado.monto, 15500);
  });

  test('devuelve nombre null si no encuentra el patrón "pago de X por"', () => {
    const snippet = 'Recibiste una transferencia de $20.000 a tu cuenta';
    const resultado = extraerMontoYNombre(snippet, 'notificacionesbancolombia.com');
    assert.equal(resultado.monto, 20000);
    assert.equal(resultado.nombre, null);
  });

  test('devuelve null si no hay monto reconocible', () => {
    const resultado = extraerMontoYNombre('Tu cuenta fue actualizada', 'notificacionesbancolombia.com');
    assert.equal(resultado, null);
  });
});

describe('extraerMontoYNombre — Nequi', () => {
  test('extrae monto (sin signo $) y nombre', () => {
    const snippet = 'Recibiste $554.000 de Carlos Ruiz el 05 sep';
    const resultado = extraerMontoYNombre(snippet, 'notificaciones@nequi.com.co');
    assert.deepEqual(resultado, { monto: 554000, nombre: 'Carlos Ruiz' });
  });

  test('extrae monto sin signo de pesos', () => {
    const snippet = 'Recibiste 30000 de Maria Lopez el 05 sep';
    const resultado = extraerMontoYNombre(snippet, 'notificaciones@nequi.com.co');
    assert.deepEqual(resultado, { monto: 30000, nombre: 'Maria Lopez' });
  });

  test('devuelve null si no matchea el patrón "Recibiste X de Y el"', () => {
    const resultado = extraerMontoYNombre('Tu saldo Nequi es de $100.000', 'notificaciones@nequi.com.co');
    assert.equal(resultado, null);
  });
});
