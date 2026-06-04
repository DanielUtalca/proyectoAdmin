import { NavLink, useNavigate } from 'react-router-dom';
import { 
  CalendarDays, 
  Video, 
  MapPin, 
  Clock, 
  Map, 
  LayoutDashboard, 
  FileSpreadsheet, 
  FileText,
  Activity,
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './DashboardLayout.css';

// Mapeo dinámico de iconos de Lucide
const getIcon = (iconName, size = 20) => {
  switch (iconName) {
    case 'CalendarDays':
      return <CalendarDays size={size} />;
    case 'Video':
      return <Video size={size} />;
    case 'MapPin':
      return <MapPin size={size} />;
    case 'Clock':
      return <Clock size={size} />;
    case 'Map':
      return <Map size={size} />;
    case 'LayoutDashboard':
      return <LayoutDashboard size={size} />;
    case 'FileSpreadsheet':
      return <FileSpreadsheet size={size} />;
    case 'FileText':
      return <FileText size={size} />;
    default:
      return <User size={size} />;
  }
};

// Configuración de menús por rol
const MENU_CONFIG = {
  Paciente: [
    { label: 'Mi Agenda', path: '/paciente/agenda', icon: 'CalendarDays' },
    { label: 'Sala de Telemedicina', path: '/paciente/telemedicina', icon: 'Video' },
    { label: 'Mis Despachos', path: '/paciente/despachos', icon: 'MapPin' },
  ],
  Médico: [
    { label: 'Agenda Diaria', path: '/medico/agenda', icon: 'CalendarDays' },
    { label: 'Atención Telemedicina', path: '/medico/telemedicina', icon: 'Video' },
    { label: 'Emitir Receta', path: '/medico/receta', icon: 'FileText' },
  ],
  Trabajador: [
    { label: 'Gestión de Horas', path: '/trabajador/horas', icon: 'Clock' },
    { label: 'Rutas de Logística', path: '/trabajador/logistica', icon: 'Map' },
  ],
  Director: [
    { label: 'Dashboard General', path: '/director/general', icon: 'LayoutDashboard' },
    { label: 'Reportes Minsal', path: '/director/reportes', icon: 'FileSpreadsheet' },
  ],
};

import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userRol = user?.rol || sessionStorage.getItem('userRol') || 'Paciente';
  const nombreMostrar = user?.nombreMostrar || sessionStorage.getItem('nombreMostrar') || 'Usuario';
  const menuItems = MENU_CONFIG[userRol] || [];

  // Obtener iniciales para el avatar
  const getInitials = (name = '') => {
    const cleanName = name.replace(/^(Dr\.|Dra\.)\s*/i, '').trim();
    const parts = cleanName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  };

  return (
    <div className="dashboard-layout">
      {/* Barra Lateral (Sidebar) */}
      <aside className="dashboard-sidebar">
        {/* Cabecera del Sidebar */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Activity size={24} color="var(--primary)" />
          </div>
          <div className="sidebar-brand-text">
            <span className="brand-title">CESFAM</span>
            <span className="brand-subtitle">Purranque Admin</span>
          </div>
        </div>

        {/* Menú de Navegación Dinámico */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-title">Módulos de {userRol}</div>
          <ul>
            {/* Botón de Inicio / Volver al Panel principal del rol */}
            <li>
              <NavLink
                to={`/${userRol.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon"><LayoutDashboard size={20} /></span>
                <span className="nav-label">Inicio Panel</span>
              </NavLink>
            </li>

            {/* Ítems dinámicos del rol */}
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{getIcon(item.icon)}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Pie del Sidebar (Usuario + Cierre Sesión) */}
        <div className="sidebar-footer">
          <div className="user-profile-card">
            <div className="avatar" title={nombreMostrar}>
              {getInitials(nombreMostrar)}
            </div>
            <div className="user-info">
              <span className="user-name" title={nombreMostrar}>{nombreMostrar}</span>
              <span className="user-role-badge" title={userRol}>{userRol}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Área Principal */}
      <div className="dashboard-main">
        {/* Header Superior */}
        <header className="dashboard-header">
          <div className="header-left">
            <span className={`role-tag ${userRol.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}>
              Panel {userRol}
            </span>
          </div>
          <div className="header-right">
            <span className="header-user-welcome">
              Conectado como: <strong>{nombreMostrar}</strong>
            </span>
            <button onClick={handleLogout} className="logout-header-btn" title="Cerrar Sesión">
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </header>

        {/* Contenedor de la Vista Activa */}
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
