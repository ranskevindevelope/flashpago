import { useState } from 'react';
import { Search } from 'lucide-react';
import { FilaSkeleton } from '../components/ui/Skeleton';
import { formatearMonto } from '../utils/formato';
import { getBancoBadge } from '../utils/bancos';

export default function SeccionBuscar({ api }) {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState(null);
  const [buscando, setBuscando] = useState(false);

  const buscarCliente = async () => {
    if (!busqueda.trim()) return;
    setBuscando(true);
    try {
      const data = await api.request(`/api/dashboard/buscar/${encodeURIComponent(busqueda.trim())}`);
      setResultados(data);
    } catch (err) {
      console.error('Error buscando:', err);
    }
    setBuscando(false);
  };

  return (
    <div className="seccion">
      <h2 className="seccion-titulo">Buscar pagos por cliente</h2>
      <div className="buscador">
        <input
          type="text"
          placeholder="Nombre del cliente..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && buscarCliente()}
        />
        <button onClick={buscarCliente}><Search size={16} /> Buscar</button>
      </div>

      {buscando ? (
        <div className="resultados-busqueda">
          <div className="tabla-container">
            <table className="tabla-pagos">
              <thead><tr><th>Monto</th><th>Banco</th><th>Fecha</th><th>Hora</th></tr></thead>
              <tbody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <FilaSkeleton key={`skeleton-${i}`} columnas={['50%', 60, 55, 40]} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : resultados && (
        <div className="resultados-busqueda">
          {resultados.length === 0 ? (
            <p className="sin-resultados">No se encontraron pagos para "{busqueda}"</p>
          ) : (
            <>
              <p className="resultados-titulo">
                {resultados.length} pago(s) de <strong>{resultados[0].nombre_cliente}</strong> —
                Total: <strong>{formatearMonto(resultados.reduce((s, p) => s + p.monto, 0))}</strong>
              </p>
              <div className="tabla-container">
                <table className="tabla-pagos">
                  <thead><tr><th>Monto</th><th>Banco</th><th>Fecha</th><th>Hora</th></tr></thead>
                  <tbody>
                    {resultados.map((p, i) => {
                      const banco = getBancoBadge(p.banco);
                      return (
                        <tr key={i}>
                          <td className="td-monto">{formatearMonto(p.monto)}</td>
                          <td><span className={`banco-badge ${banco.clase}`}>{banco.nombre}</span></td>
                          <td>{p.fecha}</td>
                          <td>{p.hora}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
