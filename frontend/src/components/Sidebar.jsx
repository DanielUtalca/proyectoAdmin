import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Video, MapPin, LogOut, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Genera las iniciales del avatar a partir del nombre mostrado
  const getInitials = (nombreMostrar = '') => {
    const words = nombreMostrar.replace(/^Dr\.\s*/i, '').trim().split(' ');
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return nombreMostrar.slice(0, 2).toUpperCase();
  };

  const nombreMostrar = user?.nombreMostrar || 'Usuario';
  const rol = user?.rol || '';

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/agenda', label: 'Agenda 24/7', icon: <CalendarDays size={20} /> },
    { path: '/telemedicina', label: 'Telemedicina', icon: <Video size={20} /> },
    { path: '/logistica', label: 'Logística Domiciliaria', icon: <MapPin size={20} /> },
  ];

  return (
    <aside className="sidebar">
      {/* Cabecera del Sidebar */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Activity size={24} color="var(--primary)" />
        </div>
        <div className="sidebar-brand-text">
          <span className="brand-title">CESFAM</span>
          <span className="brand-subtitle">Gestión Clínica</span>
        </div>
      </div>

      {/* Menú de Navegación */}
      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Pie del Sidebar — Usuario dinámico */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar" title={nombreMostrar}>
            {getInitials(nombreMostrar)}
          </div>
          <div className="user-info">
            <span className="user-name">{nombreMostrar}</span>
            <span className="user-role">{rol}</span>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-btn" title="Cerrar Sesión">
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
