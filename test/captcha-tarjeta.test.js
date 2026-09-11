// test/captcha-tarjeta.test.js — Umbral de captcha al guardar tarjeta
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  requiereCaptchaTarjeta, registrarFalloTarjeta, limpiarFallosTarjeta, UMBRAL_CAPTCHA,
} = require('../routes/wompi');

describe('captcha al guardar tarjeta', () => {
  test('no exige captcha sin fallos previos', () => {
    limpiarFallosTarjeta(1001);
    assert.equal(requiereCaptchaTarjeta(1001), false);
  });

  test(`no exige captcha con menos de ${UMBRAL_CAPTCHA} fallos`, () => {
    limpiarFallosTarjeta(1002);
    for (let i = 0; i < UMBRAL_CAPTCHA - 1; i++) registrarFalloTarjeta(1002);
    assert.equal(requiereCaptchaTarjeta(1002), false);
  });

  test(`exige captcha al llegar a ${UMBRAL_CAPTCHA} fallos`, () => {
    limpiarFallosTarjeta(1003);
    for (let i = 0; i < UMBRAL_CAPTCHA; i++) registrarFalloTarjeta(1003);
    assert.equal(requiereCaptchaTarjeta(1003), true);
  });

  test('sigue exigiendo captcha si los fallos superan el umbral', () => {
    limpiarFallosTarjeta(1004);
    for (let i = 0; i < UMBRAL_CAPTCHA + 5; i++) registrarFalloTarjeta(1004);
    assert.equal(requiereCaptchaTarjeta(1004), true);
  });

  test('limpiarFallosTarjeta resetea el contador (guardar con éxito perdona los fallos previos)', () => {
    limpiarFallosTarjeta(1005);
    for (let i = 0; i < UMBRAL_CAPTCHA; i++) registrarFalloTarjeta(1005);
    assert.equal(requiereCaptchaTarjeta(1005), true);
    limpiarFallosTarjeta(1005);
    assert.equal(requiereCaptchaTarjeta(1005), false);
  });

  test('el contador es por negocio: uno no afecta a otro', () => {
    limpiarFallosTarjeta(2001);
    limpiarFallosTarjeta(2002);
    for (let i = 0; i < UMBRAL_CAPTCHA; i++) registrarFalloTarjeta(2001);
    assert.equal(requiereCaptchaTarjeta(2001), true);
    assert.equal(requiereCaptchaTarjeta(2002), false);
  });
});
