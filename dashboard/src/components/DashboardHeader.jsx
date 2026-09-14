import React from 'react';
import { AlertTriangle, CreditCard, Download, LayoutDashboard, Search, TrendingUp, Users, Settings, Building2 } from 'lucide-react';
import CampanaNotificaciones from './CampanaNotificaciones';

const titles = {
  panel: ['Panel general', LayoutDashboard],
  pagos: ['Pagos verificados', CreditCard],
  estadisticas: ['Estadísticas', TrendingUp],
  buscar: ['Buscar cliente', Search],
  exportar: ['Exportar datos', Download],
  duplicados: ['Duplicados detectados', AlertTriangle],
  usuarios: ['Gestión de usuarios', Users],
  configuracion: ['Configuración', Settings],
  negocios: ['Negocios', Building2],
};

function DashboardHeader({ activeSection, sidebarAbierto, onToggleSidebar, notificaciones, onAbrirNotificaciones }) {
  const [title, Icon] = titles[activeSection] || titles.panel;

  return (
    <header className="topbar">
      <button
        className={`menu-toggle burger-anim ${sidebarAbierto ? 'burger-anim--abierto' : ''}`}
        onClick={onToggleSidebar}
        aria-label={sidebarAbierto ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={sidebarAbierto}
      >
        <span /><span /><span />
      </button>
      <h1 className="topbar-title"><Icon size={18} /> {title}</h1>
      <span className="topbar-fecha">
        {new Date().toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
      </span>
      <CampanaNotificaciones notificaciones={notificaciones} onAbrir={onAbrirNotificaciones} />
    </header>
  );
}

export default DashboardHeader;
