export const formatearMonto = (monto) => '$' + Number(monto).toLocaleString('es-CO');

export const soloDigitos = (valor) => String(valor).replace(/\D/g, '');

// Para inputs de dinero: se muestra con separador de miles colombiano
// (1000 → "1.000") mientras el estado guarda solo los dígitos.
export const formatearMiles = (valor) => {
  const digitos = soloDigitos(valor);
  return digitos ? Number(digitos).toLocaleString('es-CO') : '';
};
