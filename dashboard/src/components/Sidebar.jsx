import React, { useState, useRef } from 'react';
import { CreditCard, Download, LayoutDashboard, LogOut, Search, TrendingUp, Users, AlertTriangle, Menu, X, ShoppingBag, Settings, Building2, Sun, Moon, Infinity as InfinityIcon, Clock, CheckCircle2 } from 'lucide-react';
import { getPlanLabel, getPlanColor } from '../utils/bancos';

// Estado del plan resumido en una línea: qué mostrar y de qué color.
function estadoDelPlan(planInfo) {
  const trial = planInfo?.trial;
  if (!trial) return null;

  if (trial.ilimitado) {
    return { texto: 'Sin vencimiento', Icono: InfinityIcon, tono: 'ok', detalle: 'Cuenta ilimitada' };
  }
  if (!trial.activo) {
    return {
      texto: trial.razon === 'plan_vencido' ? 'Plan vencido' : 'Prueba terminada',
      Icono: Clock, tono: 'alerta', detalle: 'Renueva para reactivar',
    };
  }
  if (trial.pagado) {
    const dias = trial.dias || 0;
    return {
      texto: trial.plan_vence ? `Vence en ${dias} día${dias === 1 ? '' : 's'}` : 'Activo',
      Icono: dias <= 5 && trial.plan_vence ? Clock : CheckCircle2,
      tono: dias <= 5 && trial.plan_vence ? 'aviso' : 'ok',
      detalle: trial.plan_vence ? `Hasta el ${new Date(trial.plan_vence).toLocaleDateString('es-CO')}` : 'Plan pagado',
    };
  }
  const dias = trial.dias || 0;
  return {
    texto: `Prueba · ${dias} día${dias === 1 ? '' : 's'}`,
    Icono: Clock,
    tono: dias <= 3 ? 'aviso' : 'neutro',
    detalle: trial.trial_fin ? `Hasta el ${new Date(trial.trial_fin).toLocaleDateString('es-CO')}` : null,
  };
}

function Sidebar({ activeSection, isOpen, isAdmin, isSuperAdmin, paymentCount, userCount, negocioNombre, planInfo, onSectionChange, onLogout, tema, onToggleTema }) {
  const [fijado, setFijado] = useState(() => {
    try {
      return localStorage.getItem('fp_sidebar_fijado') === '1';
    } catch {
      return false;
    }
  });
  const [hover, setHover] = useState(false);
  const expandido = fijado || hover || isOpen;

  // Easter egg: al pasar el mouse por el logo aparece la mascota un momento
  // y se desvanece sola de vuelta al logo — no depende de seguir con el mouse
  // encima, es una revelacion cronometrada.
  const [mostrarMascota, setMostrarMascota] = useState(false);
  const mascotaTimeoutRef = useRef(null);
  const activarMascota = () => {
    if (mascotaTimeoutRef.current) clearTimeout(mascotaTimeoutRef.current);
    setMostrarMascota(true);
    mascotaTimeoutRef.current = setTimeout(() => setMostrarMascota(false), 1600);
  };

  const alternarFijado = () => {
    setFijado((prev) => {
      const nuevo = !prev;
      try {
        localStorage.setItem('fp_sidebar_fijado', nuevo ? '1' : '0');
      } catch {
        // localStorage no disponible (modo privado, etc.) — no pasa nada, solo no persiste
      }
      return nuevo;
    });
  };

  const menuItems = [
    { id: 'panel', icon: <LayoutDashboard size={18} />, label: 'Panel' },
    { id: 'pagos', icon: <CreditCard size={18} />, label: 'Pagos' },
    { id: 'ventas', icon: <ShoppingBag size={18} />, label: 'Ventas' },
    { id: 'estadisticas', icon: <TrendingUp size={18} />, label: 'Estadísticas' },
    { id: 'buscar', icon: <Search size={18} />, label: 'Buscar' },
    { id: 'exportar', icon: <Download size={18} />, label: 'Exportar' },
    { id: 'duplicados', icon: <AlertTriangle size={18} />, label: 'Duplicados' },
    ...(isAdmin ? [{ id: 'usuarios', icon: <Users size={18} />, label: 'Usuarios' }] : []),
    ...(isAdmin ? [{ id: 'configuracion', icon: <Settings size={18} />, label: 'Configuración' }] : []),
    ...(isSuperAdmin ? [{ id: 'negocios', icon: <Building2 size={18} />, label: 'Negocios' }] : []),
  ];

  return (
    <aside
      className={`sidebar ${isOpen ? 'sidebar-open' : ''} ${expandido ? 'sidebar-expanded' : 'sidebar-collapsed'}`}
      onMouseEnter={() => { if (!fijado) setHover(true); }}
      onMouseLeave={() => { if (!fijado) setHover(false); }}
    >
      <div className="sidebar-header">
        <div className="sidebar-logo" style={{ justifyContent: expandido ? 'flex-start' : 'center' }}>
          <button onClick={alternarFijado}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 4, display: 'flex', flexShrink: 0 }}>
            {fijado ? <X size={20} /> : <Menu size={20} />}
          </button>
          {expandido && (
            <>
              <div className="sidebar-logo-icon-box" onMouseEnter={activarMascota}>
                <img
                  src="/logo.png" alt="FlashPago"
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10,
                    opacity: mostrarMascota ? 0 : 1, transition: 'opacity 0.4s ease',
                  }}
                />
                <img
                  src="/mascota.gif" alt="" aria-hidden="true"
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10,
                    opacity: mostrarMascota ? 1 : 0, transition: 'opacity 0.4s ease',
                  }}
                />
              </div>
              <div>
                <div className="sidebar-logo-text">Flash<span>Pago</span></div>
                <div className="sidebar-logo-sub">Panel de control</div>
              </div>
            </>
          )}
        </div>
      </div>

      {negocioNombre && (() => {
        const estado = estadoDelPlan(planInfo);
        const porcentaje = Math.min(planInfo?.porcentaje ?? 0, 100);
        return (
          <div className="sidebar-negocio" style={{ justifyContent: expandido ? 'flex-start' : 'center' }}>
            <div className="sidebar-negocio-avatar">
              {negocioNombre.trim().charAt(0).toUpperCase()}
            </div>
            {expandido && (
              <div style={{ minWidth: 0 }}>
                <div className="sidebar-negocio-label">Tu negocio</div>
                <div className="sidebar-negocio-nombre">{negocioNombre}</div>
              </div>
            )}

            {planInfo && (
              <div className="plan-card" role="tooltip">
                <div className="plan-card-top">
                  <div>
                    <div className="plan-card-negocio">{negocioNombre}</div>
                    <div className="plan-card-plan">Plan {getPlanLabel(planInfo.plan)}</div>
                  </div>
                  {estado && (
                    <span className={`plan-card-chip plan-card-chip--${estado.tono}`}>
                      <estado.Icono size={12} />
                      {estado.texto}
                    </span>
                  )}
                </div>

                {estado?.detalle && <div className="plan-card-detalle">{estado.detalle}</div>}

                <div className="plan-card-uso">
                  <div className="plan-card-uso-cifras">
                    <span>Comprobantes del mes</span>
                    <strong>{planInfo.usados ?? 0} / {planInfo.limite ?? '—'}</strong>
                  </div>
                  <div className="plan-card-barra">
                    <div
                      className="plan-card-barra-relleno"
                      style={{ width: `${porcentaje}%`, background: getPlanColor(porcentaje) }}
                    />
                  </div>
                  <div className="plan-card-uso-pie">
                    {porcentaje >= 90
                      ? 'Estás por alcanzar el límite de tu plan'
                      : `${porcentaje}% usado este mes`}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <nav className="sidebar-nav">
        {expandido && <div className="sidebar-section-label">MENÚ</div>}
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`sidebar-item ${activeSection === item.id ? 'sidebar-item-active' : ''}`}
            onClick={() => { onSectionChange(item.id); if (!fijado) setHover(false); }}
            title={!expandido ? item.label : ''}
            aria-current={activeSection === item.id ? 'page' : undefined}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {expandido && <span>{item.label}</span>}
            {expandido && item.id === 'pagos' && paymentCount > 0 && <span className="sidebar-badge">{paymentCount}</span>}
            {expandido && item.id === 'usuarios' && userCount > 0 && <span className="sidebar-badge">{userCount}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {expandido && <div className="sidebar-section-label">CUENTA</div>}
        <button
          className="sidebar-item"
          onClick={onToggleTema}
          title={!expandido ? (tema === 'dark' ? 'Modo claro' : 'Modo oscuro') : ''}
        >
          <span className="sidebar-item-icon">
            <span key={tema} className="sidebar-theme-icon">
              {tema === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </span>
          </span>
          {expandido && <span>{tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>}
        </button>
        <button className="sidebar-item" onClick={onLogout} title={!expandido ? 'Cerrar sesión' : ''}>
          <span className="sidebar-item-icon"><LogOut size={18} /></span>
          {expandido && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;