import './ui.css';

// Fila de tabla en carga. `columnas` define el ancho de cada celda,
// para que el esqueleto se parezca a los datos que va a reemplazar.
export function FilaSkeleton({ columnas }) {
  return (
    <tr>
      {columnas.map((ancho, i) => (
        <td key={i}><span className="skeleton-bar" style={{ width: ancho }} /></td>
      ))}
    </tr>
  );
}

export function TarjetaSkeleton() {
  return (
    <div className="tarjeta">
      <div className="skeleton-block" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
      <div className="tarjeta-info" style={{ gap: 6, width: '100%' }}>
        <span className="skeleton-bar" style={{ width: '55%' }} />
        <span className="skeleton-bar" style={{ width: '75%', height: '1.3em' }} />
        <span className="skeleton-bar" style={{ width: '40%' }} />
      </div>
    </div>
  );
}
