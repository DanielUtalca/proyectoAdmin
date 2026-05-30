import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Video, MapPin, LogOut, Activity } from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Borrar el estado de sesión y redirigir
    sessionStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

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

      {/* Pie del Sidebar (Usuario y Logout) */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">MA</div>
          <div className="user-info">
            <span className="user-name">Dr. María Admin</span>
            <span className="user-role">Administrador</span>
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
