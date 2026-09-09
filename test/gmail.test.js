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

describe('extraerMontoYNombre — BBVA (Bre-B)', () => {
  // El snippet de Gmail corta antes de la tabla de detalles, asi que el importe
  // llega en el cuerpo. Reproducimos ese reparto tal cual.
  const SNIPPET = 'Tu dinero ya está disponible Nombre Comercio , ya está disponible en tu Cuenta BBVA el dinero que MARTA RIOS envió a tu llave de Código de comercio. Ingresa a nuestros canales digitales';
  const cuerpo = (monto, quien) =>
    `Detalles de la operación Fecha y hora 2026/09/09 11:09 Valor recibido ${monto} Persona que envía ${quien} Tipo de llave Código de comercio Cuenta destino *****0000 Código de operación 00000000000000000000000000000000000`;

  test('interpreta los decimales con coma: $1.000,00 son mil pesos', () => {
    const resultado = extraerMontoYNombre(SNIPPET, 'notificacionesBreB@bbva.com', cuerpo('$1.000,00', 'MARTA RIOS'));
    assert.deepEqual(resultado, { monto: 1000, nombre: 'MARTA RIOS' });
  });

  test('no infla los montos grandes', () => {
    const resultado = extraerMontoYNombre(SNIPPET, 'notificacionesBreB@bbva.com', cuerpo('$1.250.000,00', 'ANA GOMEZ'));
    assert.equal(resultado.monto, 1250000);
  });

  test('acepta importes sin decimales', () => {
    const resultado = extraerMontoYNombre(SNIPPET, 'notificacionesBreB@bbva.com', cuerpo('$60.800', 'JUAN PEREZ'));
    assert.equal(resultado.monto, 60800);
  });

  test('devuelve null si el importe solo esta en el cuerpo y no se pasa', () => {
    const resultado = extraerMontoYNombre(SNIPPET, 'notificacionesBreB@bbva.com');
    assert.equal(resultado, null);
  });

  test('devuelve null si el correo de BBVA no es de un pago', () => {
    const resultado = extraerMontoYNombre('Tu extracto de BBVA ya está listo', 'notificacionesBreB@bbva.com', 'Consulta tu extracto en la app');
    assert.equal(resultado, null);
  });

  test('no confunde el importe con el codigo de operacion', () => {
    const resultado = extraerMontoYNombre(SNIPPET, 'notificacionesBreB@bbva.com', cuerpo('$2.000,00', 'LUIS DIAZ'));
    assert.equal(resultado.monto, 2000);
    assert.equal(resultado.nombre, 'LUIS DIAZ');
  });
});
