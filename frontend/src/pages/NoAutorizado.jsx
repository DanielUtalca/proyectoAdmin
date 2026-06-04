import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './NoAutorizado.css';

const NoAutorizado = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGoHome = () => {
    // Redirige al usuario a la página de inicio (el redirector se encargará de enviarlo a su rol)
    navigate('/');
  };

  const rol = user?.rol || sessionStorage.getItem('userRol') || 'Invitado';
  const nombre = user?.nombreMostrar || sessionStorage.getItem('nombreMostrar') || 'Usuario';

  return (
    <div className="no-auth-container">
      <div className="no-auth-card">
        <div className="no-auth-icon-wrapper">
          <ShieldAlert size={48} className="no-auth-icon" />
        </div>
        
        <h1 className="no-auth-title">Acceso Denegado</h1>
        <p className="no-auth-text">
          Lo sentimos, <strong>{nombre}</strong>. Tu cuenta con rol de <span className="role-badge">{rol}</span> no tiene los permisos necesarios para acceder a esta sección.
        </p>

        <div className="no-auth-actions">
          <button onClick={handleGoHome} className="btn-primary-custom">
            <ArrowLeft size={18} />
            Ir a mi panel principal
          </button>
          
          <button onClick={handleLogout} className="btn-secondary-custom">
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoAutorizado;
