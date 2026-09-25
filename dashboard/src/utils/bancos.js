// Mapea el nombre libre del banco (viene del OCR o del correo) a un badge
// con color propio. El texto no está normalizado, por eso se compara por
// coincidencia parcial y en minúsculas.
export function getBancoBadge(banco) {
  const b = (banco || '').toLowerCase();
  if (b.includes('nequi')) return { clase: 'badge-nequi', nombre: 'Nequi' };
  if (b.includes('bancolombia')) return { clase: 'badge-bancolombia', nombre: 'Bancolombia' };
  if (b.includes('daviplata') || b.includes('davi')) return { clase: 'badge-daviplata', nombre: 'Daviplata' };
  if (b.includes('breb') || b.includes('bre-b')) return { clase: 'badge-breb', nombre: 'Bre-B' };
  if (b.includes('avvillas') || b.includes('av villas')) return { clase: 'badge-avvillas', nombre: 'AV Villas' };
  if (b.includes('transfiya')) return { clase: 'badge-transfiya', nombre: 'Transfiya' };
  if (b.includes('nu')) return { clase: 'badge-nu', nombre: 'Nu' };
  return { clase: 'badge-otro', nombre: banco || 'Otro' };
}

// Paleta fija para los gráficos de Estadísticas (bancos más usados + donut)
// — distinta de los badges de la tabla de pagos, que ya tienen sus propios
// colores por marca. Solo 4 grupos para que el gráfico se lea de un vistazo.
export const COLOR_BANCO_ESTADISTICAS = {
  'Bre-B': '#2196F3',
  'Nequi': '#E91E63',
  'Bancolombia': '#F57C00',
  'Otro': '#9E9E9E',
};

// Agrupa los bancos crudos (texto libre, viene del OCR o del correo) en los
// 4 grupos que muestra Estadísticas, reusando getBancoBadge para no duplicar
// la lógica de "a qué banco pertenece este texto".
export function agruparBancosParaEstadisticas(bancos) {
  const grupos = {};
  (bancos || []).forEach((b) => {
    const { nombre } = getBancoBadge(b.banco);
    const clave = ['Bre-B', 'Nequi', 'Bancolombia'].includes(nombre) ? nombre : 'Otro';
    if (!grupos[clave]) grupos[clave] = { nombre: clave, pagos: 0, total: 0 };
    grupos[clave].pagos += b.cantidad;
    grupos[clave].total += b.total;
  });
  return Object.values(grupos).sort((a, b) => b.total - a.total);
}

export function getPlanLabel(plan) {
  const labels = { basico: 'Básico', premium: 'Premium', premium_plus: 'Premium Plus', empresarial: 'Empresarial' };
  return labels[plan] || plan;
}

// Sin tope de comprobantes: cuenta con plan ilimitado, o un plan de 999999
// (Premium Plus, Empresarial). Evita mostrar "98 / 999999".
export function sinTopeComprobantes(planInfo) {
  return !!planInfo?.trial?.ilimitado || (planInfo?.limite ?? 0) >= 999999;
}

// Nombre a mostrar: una cuenta con plan ilimitado se ve así, no con el plan de base.
export function nombrePlan(planInfo) {
  return planInfo?.trial?.ilimitado ? 'Plan ilimitado' : `Plan ${getPlanLabel(planInfo?.plan)}`;
}

export function getPlanColor(porcentaje) {
  if (porcentaje >= 90) return '#E53935';
  if (porcentaje >= 70) return '#FF9800';
  return '#43A047';
}
