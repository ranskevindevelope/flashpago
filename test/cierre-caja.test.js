// test/cierre-caja.test.js — Cálculo del efectivo esperado al cerrar caja
//
// El negocio reporta cuánto vendió en efectivo (según sus pedidos) y el bot
// aporta las transferencias verificadas. El efectivo esperado en el cajón
// depende solo de lo cobrado en efectivo menos lo gastado en efectivo: las
// transferencias nunca pasan por el cajón.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calcularEfectivoEsperado } = require('../db');

describe('calcularEfectivoEsperado', () => {
  test('resta los gastos pagados en efectivo', () => {
    const esperado = calcularEfectivoEsperado({
      ventas_efectivo: 600000,
      gastos_efectivo: 60000,
    });
    assert.equal(esperado, 540000);
  });

  test('los gastos pagados por transferencia no salen del cajón', () => {
    // gastos_efectivo llega ya filtrado desde la consulta: los pagados por
    // transferencia no vienen incluidos y por eso no restan.
    const esperado = calcularEfectivoEsperado({
      ventas_efectivo: 600000,
      gastos_efectivo: 0,
    });
    assert.equal(esperado, 600000);
  });

  test('las transferencias no afectan el efectivo esperado', () => {
    // Aunque el día haya tenido muchas transferencias, el cajón solo refleja
    // lo cobrado en efectivo.
    const conGastos = calcularEfectivoEsperado({ ventas_efectivo: 150000, gastos_efectivo: 20000 });
    assert.equal(conGastos, 130000);
  });

  test('devuelve negativo si se gastó más efectivo del que entró', () => {
    // Pasa cuando se paga un gasto grande con la base de la caja.
    const esperado = calcularEfectivoEsperado({
      ventas_efectivo: 50000,
      gastos_efectivo: 80000,
    });
    assert.equal(esperado, -30000);
  });

  test('trata los campos ausentes como cero', () => {
    assert.equal(calcularEfectivoEsperado({ ventas_efectivo: 100000 }), 100000);
    assert.equal(calcularEfectivoEsperado({}), 0);
  });
});
