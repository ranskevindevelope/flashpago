export const formatearMonto = (monto) => '$' + Number(monto).toLocaleString('es-CO');

export const soloDigitos = (valor) => String(valor).replace(/\D/g, '');

// Fechas de prueba/plan: 'AAAA-MM-DD' = último día con servicio, hora de Colombia.
// new Date('AAAA-MM-DD') las toma como medianoche UTC, que aquí es el día anterior.
export const formatearFechaPlan = (fecha) => {
  if (!fecha) return '';
  const [a, m, d] = String(fecha).slice(0, 10).split('-').map(Number);
  return `${d}/${m}/${a}`;
};

export const sumarDias = (fecha, dias) => {
  const d = new Date(`${String(fecha).slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

const hoyColombia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

// Días con servicio que quedan, contando hoy: 1 = último día; 0 o menos = vencido.
export const diasDeServicio = (fecha) =>
  Math.round((Date.parse(`${String(fecha).slice(0, 10)}T00:00:00Z`) - Date.parse(`${hoyColombia()}T00:00:00Z`)) / 86400000) + 1;

// Para inputs de dinero: se muestra con separador de miles colombiano
// (1000 → "1.000") mientras el estado guarda solo los dígitos.
export const formatearMiles = (valor) => {
  const digitos = soloDigitos(valor);
  return digitos ? Number(digitos).toLocaleString('es-CO') : '';
};
