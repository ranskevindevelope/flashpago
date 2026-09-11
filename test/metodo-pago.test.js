// test/metodo-pago.test.js — Método de pago guardado (renovación automática)
// Usa un negocio de prueba dedicado (creado/eliminado en este mismo archivo)
// contra la base de datos local, para no pisar datos de negocios reales.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  db, crearNegocio,
  guardarMetodoPago, obtenerMetodoPago, eliminarMetodoPago, actualizarRenovarAutomatico,
} = require('../db');

function runAsync(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) { if (err) reject(err); else resolve(this); });
  });
}

describe('metodo de pago', () => {
  let negocioId;

  before(async () => {
    const negocio = await crearNegocio({ nombre: '__test_metodo_pago__', plan: 'premium' });
    negocioId = negocio.id;
  });

  after(async () => {
    await runAsync('DELETE FROM metodos_pago WHERE negocio_id = ?', [negocioId]);
    await runAsync('DELETE FROM negocios WHERE id = ?', [negocioId]);
  });

  test('sin tarjeta guardada, obtenerMetodoPago devuelve null', async () => {
    const r = await obtenerMetodoPago(negocioId);
    assert.equal(r, null);
  });

  test('guardarMetodoPago la deja disponible para obtenerMetodoPago', async () => {
    await guardarMetodoPago({
      negocio_id: negocioId, wompi_payment_source_id: '12345',
      marca: 'VISA', ultimos4: '4242', exp_mes: '12', exp_anio: '28',
    });
    const r = await obtenerMetodoPago(negocioId);
    assert.equal(r.wompi_payment_source_id, '12345');
    assert.equal(r.marca, 'VISA');
    assert.equal(r.ultimos4, '4242');
  });

  test('guardar de nuevo reemplaza la anterior, no crea una segunda fila', async () => {
    await guardarMetodoPago({ negocio_id: negocioId, wompi_payment_source_id: '99999', marca: 'MASTERCARD', ultimos4: '1111', exp_mes: '1', exp_anio: '30' });
    const filas = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM metodos_pago WHERE negocio_id = ?', [negocioId], (err, rows) => (err ? reject(err) : resolve(rows)));
    });
    assert.equal(filas.length, 1);
    assert.equal(filas[0].wompi_payment_source_id, '99999');
  });

  test('activar renovación automática exige tener tarjeta guardada', async () => {
    // Este negocio ya tiene una (por el test anterior), así que debe poder.
    await actualizarRenovarAutomatico(negocioId, true);
    const row = await new Promise((resolve, reject) => {
      db.get('SELECT renovar_automatico FROM negocios WHERE id = ?', [negocioId], (err, r) => (err ? reject(err) : resolve(r)));
    });
    assert.equal(row.renovar_automatico, 1);
  });

  test('sin tarjeta guardada, no se puede activar la renovación automática', async () => {
    const otro = await crearNegocio({ nombre: '__test_metodo_pago_sin_tarjeta__', plan: 'basico' });
    try {
      await assert.rejects(() => actualizarRenovarAutomatico(otro.id, true));
    } finally {
      await runAsync('DELETE FROM negocios WHERE id = ?', [otro.id]);
    }
  });

  test('eliminarMetodoPago borra la tarjeta y apaga la renovación automática', async () => {
    await eliminarMetodoPago(negocioId);
    const metodo = await obtenerMetodoPago(negocioId);
    assert.equal(metodo, null);
    const row = await new Promise((resolve, reject) => {
      db.get('SELECT renovar_automatico FROM negocios WHERE id = ?', [negocioId], (err, r) => (err ? reject(err) : resolve(r)));
    });
    assert.equal(row.renovar_automatico, 0);
  });
});
