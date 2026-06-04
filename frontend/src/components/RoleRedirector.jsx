import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Componente que redirige al usuario a la página adecuada según su rol.
 * Se usa en la ruta raíz ("/") para evitar que el usuario tenga que navegar manualmente.
 */
const RoleRedirector = () => {
  const { user } = useAuth();
  const isAuthenticated = !!user || sessionStorage.getItem('isAuthenticated') === 'true';
  const role = user?.rol || sessionStorage.getItem('userRol');

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  switch (role) {
    case 'Paciente':
      return <Navigate to="/paciente" replace />;
    case 'Médico':
      return <Navigate to="/medico" replace />;
    case 'Trabajador':
      return <Navigate to="/trabajador" replace />;
    case 'Director':
      return <Navigate to="/director" replace />;
    default:
      // Si el rol es desconocido, redirige al login por seguridad
      return <Navigate to="/login" replace />;
  }
};

export default RoleRedirector;
