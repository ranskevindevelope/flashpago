import { useState } from 'react';
import { Download } from 'lucide-react';

/**
 * Sección Exportar: selector de mes propio (independiente del de
 * Pagos/Estadísticas/Panel) — solo dispara la descarga vía exportarPagos,
 * que sigue viviendo en Dashboard.jsx (usa api.download, compartido).
 */
export default function SeccionExportar({ mesesNombres, sumarMes, esMesActualGenerico, exportarPagos }) {
  const [exportarMes, setExportarMes] = useState(new Date().getMonth() + 1);
  const [exportarAnio, setExportarAnio] = useState(new Date().getFullYear());

  const cambiarExportarMes = (direccion) => {
    const { mes, anio } = sumarMes(exportarMes, exportarAnio, direccion);
    setExportarMes(mes);
    setExportarAnio(anio);
  };

  return (
    <div className="seccion exportar-seccion">
      <div className="exportar-card">
        <div className="exportar-icon-box"><Download size={32} color="#F57C00" /></div>
        <h2>Exportar pagos a Excel</h2>
        <p>Elige el mes y descarga sus pagos verificados. Se abre en Excel, Google Sheets o cualquier programa de hojas de cálculo.</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center', margin: '1rem 0' }}>
          <button onClick={() => cambiarExportarMes(-1)} style={{
            width: 34, height: 34, borderRadius: 9, border: '2px solid var(--dash-border)',
            background: 'var(--dash-surface)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '1rem' }}>‹</span>
          </button>
          <div style={{
            padding: '0.4rem 1rem', borderRadius: 9, background: '#F57C00',
            color: '#fff', fontWeight: 700, fontSize: '0.85rem', minWidth: 140, textAlign: 'center',
          }}>
            {mesesNombres[exportarMes - 1]} {exportarAnio}
          </div>
          <button onClick={() => cambiarExportarMes(1)} disabled={esMesActualGenerico(exportarMes, exportarAnio)} style={{
            width: 34, height: 34, borderRadius: 9, border: '2px solid var(--dash-border)',
            background: esMesActualGenerico(exportarMes, exportarAnio) ? 'var(--dash-surface-2)' : 'var(--dash-surface)',
            cursor: esMesActualGenerico(exportarMes, exportarAnio) ? 'default' : 'pointer',
            opacity: esMesActualGenerico(exportarMes, exportarAnio) ? 0.4 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '1rem' }}>›</span>
          </button>
        </div>

        <button className="exportar-btn" onClick={() => exportarPagos(exportarMes, exportarAnio)}>
          <Download size={14} /> Exportar Excel
        </button>
      </div>
    </div>
  );
}
