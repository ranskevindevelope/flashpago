import { useState } from 'react';
import { Receipt, CheckCircle, ArrowDownUp, MinusCircle, Wallet, Edit, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import { formatearMonto, formatearMiles, soloDigitos } from '../utils/formato';

function FilaCalculo({ etiqueta, valor, detalle, signo, destacado }) {
  return (
    <div className={`cierre-calculo-fila ${destacado ? 'cierre-calculo-fila--total' : ''}`}>
      <span className="cierre-calculo-etiqueta">
        {signo && <span className="cierre-calculo-signo">{signo}</span>}
        {etiqueta}
        {detalle && <span className="cierre-calculo-detalle">{detalle}</span>}
      </span>
      <span className="cierre-calculo-valor">{formatearMonto(valor)}</span>
    </div>
  );
}

export default function CierreCaja({ resumen, api, esAdmin, onGuardado }) {
  const cierre = resumen?.cierre || null;
  const [editando, setEditando] = useState(false);
  const [montoVentas, setMontoVentas] = useState('');
  const [efectivoContado, setEfectivoContado] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  const transferencias = resumen?.transferencias?.total || 0;
  const cantidadTransferencias = resumen?.transferencias?.cantidad || 0;
  const gastosEfectivo = resumen?.gastos_efectivo ?? resumen?.gastos?.total_efectivo ?? 0;

  const ventasEfectivo = parseInt(montoVentas, 10) || 0;
  const totalDia = ventasEfectivo + transferencias;
  const esperado = ventasEfectivo - gastosEfectivo;
  const contado = efectivoContado === '' ? null : parseInt(efectivoContado, 10) || 0;
  const diferencia = contado === null ? null : contado - esperado;

  const abrirEdicion = () => {
    // Se guarda el total, pero el formulario pide solo el efectivo.
    setMontoVentas(String(Math.max((cierre.total_ventas ?? 0) - (cierre.total_transferencias ?? 0), 0)));
    setEfectivoContado(cierre.efectivo_contado === null || cierre.efectivo_contado === undefined ? '' : String(cierre.efectivo_contado));
    setNota(cierre.nota || '');
    setEditando(true);
  };

  const cancelarEdicion = () => {
    setEditando(false);
    setMontoVentas('');
    setEfectivoContado('');
    setNota('');
  };

  const guardar = async () => {
    if (!ventasEfectivo || ventasEfectivo <= 0) {
      toast.error('Ingresa cuánto vendiste en efectivo');
      return;
    }
    setGuardando(true);
    try {
      const cuerpo = JSON.stringify({
        ventas_efectivo: ventasEfectivo,
        nota: nota.trim() || null,
        efectivo_contado: efectivoContado === '' ? null : contado,
      });
      const data = editando && cierre
        ? await api.request(`/api/ventas/cierre/${cierre.id}`, { method: 'PUT', body: cuerpo })
        : await api.request('/api/ventas/cierre', { method: 'POST', body: cuerpo });

      if (data.ok) {
        toast.success(editando ? 'Cierre corregido' : `Cierre guardado: ${formatearMonto(totalDia)} en ventas`);
        cancelarEdicion();
        onGuardado?.();
      } else {
        toast.error(data.error || 'No se pudo guardar el cierre');
      }
    } catch (err) {
      toast.error(err.message || 'Error guardando el cierre');
    }
    setGuardando(false);
  };

  // ── Cierre ya registrado ──────────────────────────────
  if (cierre && !editando) {
    const dif = cierre.diferencia;
    return (
      <div style={{ padding: '0.5rem 0' }}>
        <div className="cierre-hecho">
          <CheckCircle size={20} color="#388E3C" style={{ flexShrink: 0 }} />
          <div>
            <div className="cierre-hecho-monto">{formatearMonto(cierre.total_ventas)}</div>
            <div className="cierre-hecho-autor">Cerrado por {cierre.cerrado_por || 'alguien'}</div>
          </div>
          {esAdmin && (
            <button className="modal-close-inline cierre-editar" onClick={abrirEdicion} title="Corregir cierre">
              <Edit size={15} />
            </button>
          )}
        </div>

        <div className="cierre-calculo">
          <FilaCalculo etiqueta="Ventas en efectivo" valor={cierre.total_ventas - cierre.total_transferencias} />
          <FilaCalculo etiqueta="Transferencias verificadas" valor={cierre.total_transferencias} signo="+" />
          <FilaCalculo etiqueta="Total del día" valor={cierre.total_ventas} destacado />
        </div>

        <div className="cierre-calculo">
          <FilaCalculo etiqueta="Ventas en efectivo" valor={cierre.total_ventas - cierre.total_transferencias} />
          <FilaCalculo
            etiqueta="Gastos pagados en efectivo"
            valor={(cierre.total_ventas - cierre.total_transferencias) - cierre.total_efectivo}
            signo="−"
          />
          <FilaCalculo etiqueta="Efectivo esperado" valor={cierre.total_efectivo} destacado />
        </div>

        {cierre.efectivo_contado === null || cierre.efectivo_contado === undefined ? (
          <p className="cierre-aviso">No se registró el conteo del cajón en este cierre.</p>
        ) : (
          <div className={`cierre-diferencia ${dif === 0 ? 'cierre-diferencia--ok' : dif < 0 ? 'cierre-diferencia--faltante' : 'cierre-diferencia--sobrante'}`}>
            <div className="cierre-diferencia-fila">
              <span>Contado en el cajón</span>
              <strong>{formatearMonto(cierre.efectivo_contado)}</strong>
            </div>
            <div className="cierre-diferencia-fila cierre-diferencia-resultado">
              <span>{dif === 0 ? 'Cuadra exacto' : dif < 0 ? 'Faltante' : 'Sobrante'}</span>
              <strong>{dif > 0 ? '+' : ''}{formatearMonto(dif)}</strong>
            </div>
          </div>
        )}

        {cierre.nota && <div className="cierre-nota">📝 {cierre.nota}</div>}
      </div>
    );
  }

  // ── Formulario de cierre (nuevo o corrección) ─────────
  return (
    <div style={{ padding: '0.5rem 0' }}>
      {editando && (
        <div className="cierre-editando">
          <span>Corrigiendo el cierre de hoy</span>
          <button className="modal-close-inline" onClick={cancelarEdicion}><X size={14} /></button>
        </div>
      )}

      <label className="cierre-label" htmlFor="cierre-ventas">¿Cuánto vendiste en efectivo? ($)</label>
      <input
        id="cierre-ventas"
        type="text"
        inputMode="numeric"
        className="cierre-input cierre-input--grande"
        placeholder="Ej: 235.100"
        value={formatearMiles(montoVentas)}
        onChange={(e) => setMontoVentas(soloDigitos(e.target.value))}
      />
      <p className="cierre-pista">
        Según tus pedidos, no contando el cajón. Las transferencias las suma el sistema solo.
      </p>

      <div className="cierre-calculo">
        <FilaCalculo etiqueta="Ventas en efectivo" valor={ventasEfectivo} />
        <FilaCalculo
          etiqueta="Transferencias verificadas"
          detalle={`${cantidadTransferencias} pago${cantidadTransferencias === 1 ? '' : 's'}`}
          valor={transferencias}
          signo="+"
        />
        <FilaCalculo etiqueta="Total del día" valor={totalDia} destacado />
      </div>

      <div className="cierre-calculo">
        <FilaCalculo etiqueta="Ventas en efectivo" valor={ventasEfectivo} />
        <FilaCalculo etiqueta="Gastos pagados en efectivo" valor={gastosEfectivo} signo="−" />
        <FilaCalculo etiqueta="Efectivo esperado en el cajón" valor={esperado} destacado />
      </div>

      {ventasEfectivo > 0 && esperado < 0 && (
        <div className="cierre-alerta">
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>
            Los gastos en efectivo superan lo que cobraste en efectivo. Solo cuadra si sacaste
            plata de la base de la caja — si no, revisa los gastos del día.
          </span>
        </div>
      )}

      <label className="cierre-label" htmlFor="cierre-contado">¿Cuánto contaste en el cajón? (opcional)</label>
      <input
        id="cierre-contado"
        type="text"
        inputMode="numeric"
        className="cierre-input"
        placeholder="Deja vacío si no lo contaste"
        value={formatearMiles(efectivoContado)}
        onChange={(e) => setEfectivoContado(soloDigitos(e.target.value))}
      />

      {contado !== null && ventasEfectivo > 0 && (
        <div className={`cierre-diferencia ${diferencia === 0 ? 'cierre-diferencia--ok' : diferencia < 0 ? 'cierre-diferencia--faltante' : 'cierre-diferencia--sobrante'}`}>
          <div className="cierre-diferencia-fila cierre-diferencia-resultado">
            <span>{diferencia === 0 ? 'Cuadra exacto' : diferencia < 0 ? 'Faltante' : 'Sobrante'}</span>
            <strong>{diferencia > 0 ? '+' : ''}{formatearMonto(diferencia)}</strong>
          </div>
        </div>
      )}

      <label className="cierre-label" htmlFor="cierre-nota">Nota (opcional)</label>
      <input
        id="cierre-nota"
        type="text"
        className="cierre-input"
        placeholder="Ej: Día normal, faltó cambio"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
      />

      <div style={{ marginTop: '1rem' }}>
        <Button
          variant={ventasEfectivo > 0 ? 'primary' : 'ghost'}
          fullWidth
          disabled={ventasEfectivo <= 0}
          loading={guardando}
          onClick={guardar}
          icon={<Receipt size={16} />}
        >
          {editando ? 'Guardar corrección' : 'Cerrar caja del día'}
        </Button>
      </div>
    </div>
  );
}
