// Placeholder mientras carga un gráfico lazy (recharts) — compartido entre
// Dashboard.jsx y las secciones que tienen su propio gráfico (ej. Pagos).
export default function GraficaCargando({ alto = '100%' }) {
  return <div className="skeleton-block" style={{ width: '100%', height: alto }} />;
}
