const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Grilla de 7 columnas (Lun a Dom) x semanas del mes — `matriz` viene tal
// cual del backend (heatmap_semanal), un array de semanas de 7 números cada
// una (cantidad de transacciones ese día; 0 para días fuera del mes en la
// primera/última semana). El color es azul con opacidad proporcional al
// máximo del mes, no un valor fijo.
export default function EstadisticasHeatmap({ matriz }) {
  if (!matriz?.length) return null;
  const max = Math.max(1, ...matriz.flat());

  // Celdas de tamaño fijo (no 1fr): sin esto, en pantallas anchas cada
  // celda ocupa contenedor/7 de ancho y, al ser cuadrada, la grilla termina
  // ocupando cientos de píxeles de alto. Con un tamaño máximo se queda
  // compacta como un heatmap normal, y en móvil sigue encogiendo porque el
  // máximo es un límite, no un tamaño fijo.
  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 5, marginBottom: 6 }}>
        {DIAS.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 600, color: 'var(--dash-text-faint)' }}>
            {d}
          </div>
        ))}
      </div>
      {matriz.map((semana, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 5, marginBottom: 5 }}>
          {semana.map((cantidad, j) => {
            const intensidad = cantidad / max; // 0..1
            const esOscuro = intensidad > 0.55;
            return (
              <div
                key={j}
                title={`${cantidad} transaccion${cantidad === 1 ? '' : 'es'}`}
                style={{
                  width: '100%', maxWidth: 44, aspectRatio: '1', margin: '0 auto', borderRadius: 6,
                  background: cantidad === 0 ? 'var(--dash-surface-2)' : `rgba(21, 101, 192, ${0.12 + intensidad * 0.78})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11.5, fontWeight: 600,
                  color: cantidad === 0 ? 'var(--dash-text-faint)' : (esOscuro ? '#fff' : '#1565C0'),
                }}
              >
                {cantidad}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
