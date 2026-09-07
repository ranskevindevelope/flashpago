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

export function getPlanLabel(plan) {
  const labels = { basico: 'Básico', premium: 'Premium', premium_plus: 'Premium Plus', empresarial: 'Empresarial' };
  return labels[plan] || plan;
}

export function getPlanColor(porcentaje) {
  if (porcentaje >= 90) return '#E53935';
  if (porcentaje >= 70) return '#FF9800';
  return '#43A047';
}
