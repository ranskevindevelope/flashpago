import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Eye, X, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import { formatearMonto } from '../utils/formato';
import { getBancoBadge } from '../utils/bancos';

const MOTIVO_MINIMO = 3;
const MOTIVO_MAXIMO = 500;

// Tarjeta de un pago dentro de la comparación. `destacado` marca el pago
// sospechoso (el que se está revisando) frente al que ya estaba registrado.
function PagoComparado({ pago, etiqueta, destacado, onVerFoto }) {
  const banco = getBancoBadge(pago.banco);
  return (
    <div className={`dup-comparar-card ${destacado ? 'dup-comparar-card--sospechoso' : ''}`}>
      <div className="dup-comparar-etiqueta">{etiqueta}</div>
      <div className="dup-comparar-monto">{formatearMonto(pago.monto)}</div>
      <div className="dup-comparar-fila">
        <span className={`banco-badge ${banco.clase}`}>{banco.nombre}</span>
      </div>
      <div className="dup-comparar-fila">{pago.nombre_cliente || 'Sin nombre'}</div>
      <div className="dup-comparar-fila dup-comparar-fecha">
        {pago.fecha || '-'} {pago.hora || ''}
      </div>
      {pago.foto ? (
        <button className="ver-foto-btn" onClick={() => onVerFoto(pago.foto)}>
          <Eye size={13} /> Comprobante
        </button>
      ) : (
        <span className="dup-comparar-sinfoto">Sin comprobante</span>
      )}
    </div>
  );
}

export default function SeccionDuplicados({ api, esAdmin, onVerFoto, onRevisionGuardada }) {
  const [duplicados, setDuplicados] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(null); // 'DUPLICADO' | 'LEGITIMO' | null

  const cargarDuplicados = useCallback(async () => {
    try {
      const data = await api.request('/api/dashboard/duplicados');
      setDuplicados(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando duplicados:', err);
    }
  }, [api]);

  useEffect(() => {
    cargarDuplicados();
    const intervalo = setInterval(cargarDuplicados, 30000);
    window.addEventListener('focus', cargarDuplicados);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener('focus', cargarDuplicados);
    };
  }, [cargarDuplicados]);

  // Mantener el caso abierto sincronizado con la lista que se refresca sola,
  // para que el detalle no quede mostrando datos viejos.
  useEffect(() => {
    if (!seleccionado) return;
    const actualizado = duplicados.find((d) => d.id === seleccionado.id);
    if (actualizado && actualizado !== seleccionado) setSeleccionado(actualizado);
  }, [duplicados, seleccionado]);

  const motivoValido = motivo.trim().length >= MOTIVO_MINIMO;
  const yaRevisado = Boolean(seleccionado) && (seleccionado.revision_estado || 'PENDIENTE') !== 'PENDIENTE';

  const revisarDuplicado = async (estado) => {
    if (!seleccionado || !motivoValido) return;
    setGuardando(estado);
    try {
      await api.request(`/api/dashboard/duplicados/${seleccionado.id}/revision`, {
        method: 'POST',
        body: JSON.stringify({ estado, motivo: motivo.trim() }),
      });
      toast.success(estado === 'DUPLICADO' ? 'Marcado como duplicado' : 'Marcado como legítimo');
      setMotivo('');
      setSeleccionado(null);
      await cargarDuplicados();
      onRevisionGuardada?.();
    } catch (err) {
      console.error('Error guardando revisión de duplicado:', err);
      toast.error(err.message || 'No se pudo guardar la decisión');
    } finally {
      setGuardando(null);
    }
  };

  const seleccionarCaso = (caso) => {
    setSeleccionado(caso);
    setMotivo('');
  };

  return (
    <div className="duplicados-layout">
      <div className="seccion duplicados-lista">
        <div className="seccion-header">
          <h2 className="seccion-titulo"><AlertTriangle size={18} /> Casos para revisar</h2>
          <span className="duplicados-count">{duplicados.length} casos</span>
        </div>
        {duplicados.length === 0 ? (
          <p className="empty-state">No se han detectado duplicados. ¡Todo limpio!</p>
        ) : (
          <div className="tabla-container">
            <table className="tabla-pagos">
              <thead><tr><th>Referencia</th><th>Cliente</th><th>Monto</th><th>Estado</th><th>Acción</th></tr></thead>
              <tbody>
                {duplicados.map((d) => {
                  const banco = getBancoBadge(d.banco);
                  return (
                    <tr key={d.id} className={seleccionado?.id === d.id ? 'fila-seleccionada' : ''}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{d.referencia || '-'}</td>
                      <td>{d.nombre_cliente || 'Sin nombre'}<br /><span className="tabla-subtexto">{banco.nombre}</span></td>
                      <td className="td-monto">{formatearMonto(d.monto)}</td>
                      <td><span className={`revision-badge revision-${(d.revision_estado || 'PENDIENTE').toLowerCase()}`}>{d.revision_estado || 'PENDIENTE'}</span></td>
                      <td><button className="ver-foto-btn" onClick={() => seleccionarCaso(d)}>Revisar</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="seccion duplicado-detalle">
        <div className="seccion-header">
          <h2 className="seccion-titulo"><Eye size={18} /> Detalle del caso</h2>
          {seleccionado && (
            <button className="modal-close-inline" onClick={() => setSeleccionado(null)}><X size={15} /></button>
          )}
        </div>

        {!seleccionado ? (
          <p className="empty-state">Selecciona un caso para revisar sus datos.</p>
        ) : (
          <>
            <div className="duplicado-resumen">
              <strong>{seleccionado.referencia || 'Sin referencia'}</strong>
              <span>Misma referencia detectada en {(seleccionado.relacionados?.length || 0) + 1} pagos</span>
            </div>

            {seleccionado.relacionados?.length > 0 ? (
              <div className="dup-comparar">
                <PagoComparado
                  pago={seleccionado.relacionados[0]}
                  etiqueta="Ya registrado"
                  onVerFoto={onVerFoto}
                />
                <ArrowRight size={16} className="dup-comparar-flecha" />
                <PagoComparado
                  pago={seleccionado}
                  etiqueta="Este comprobante"
                  destacado
                  onVerFoto={onVerFoto}
                />
              </div>
            ) : (
              <div className="dup-comparar">
                <PagoComparado
                  pago={seleccionado}
                  etiqueta="Este comprobante"
                  destacado
                  onVerFoto={onVerFoto}
                />
                <p className="dup-comparar-aviso">
                  No se encontró otro pago con esta referencia — puede que el original se haya
                  eliminado o que la referencia se haya leído mal del comprobante.
                </p>
              </div>
            )}

            {seleccionado.relacionados?.length > 1 && (
              <p className="dup-comparar-aviso">
                Hay {seleccionado.relacionados.length - 1} pago(s) más con esta misma referencia.
              </p>
            )}

            {yaRevisado && (
              <div className="dup-decision">
                <div className="dup-decision-encabezado">
                  <span className={`revision-badge revision-${seleccionado.revision_estado.toLowerCase()}`}>
                    {seleccionado.revision_estado}
                  </span>
                  <span className="dup-decision-autor">
                    {seleccionado.revisado_por || 'alguien'}
                    {seleccionado.revisado_en ? ` · ${seleccionado.revisado_en}` : ''}
                  </span>
                </div>
                {seleccionado.revision_motivo && (
                  <p className="dup-decision-motivo">“{seleccionado.revision_motivo}”</p>
                )}
              </div>
            )}

            <label className="revision-label" htmlFor="motivo-revision">
              {yaRevisado ? 'Motivo para cambiar la decisión' : 'Motivo de la decisión'}
            </label>
            <textarea
              id="motivo-revision"
              className="revision-motivo"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Ej: el cliente pagó dos pedidos distintos con la misma referencia"
              maxLength={MOTIVO_MAXIMO}
              disabled={!esAdmin}
            />
            <div className="revision-ayuda">
              <span className={motivoValido ? 'revision-ayuda--ok' : ''}>
                {motivoValido
                  ? 'Listo para guardar la decisión'
                  : `Escribe al menos ${MOTIVO_MINIMO} caracteres para poder decidir`}
              </span>
              <span>{motivo.length}/{MOTIVO_MAXIMO}</span>
            </div>

            <div className="revision-acciones">
              <Button
                variant="danger"
                fullWidth
                disabled={!esAdmin || !motivoValido}
                loading={guardando === 'DUPLICADO'}
                onClick={() => revisarDuplicado('DUPLICADO')}
              >
                Confirmar duplicado
              </Button>
              <Button
                variant="secondary"
                fullWidth
                disabled={!esAdmin || !motivoValido}
                loading={guardando === 'LEGITIMO'}
                onClick={() => revisarDuplicado('LEGITIMO')}
              >
                Marcar como legítimo
              </Button>
              {!esAdmin && <small>Solo un administrador puede guardar decisiones.</small>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
