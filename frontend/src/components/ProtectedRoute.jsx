import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Componente que protege rutas basándose en la autenticación y el rol del usuario.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componente hijo a renderizar si se cumple la condición.
 * @param {string[]} props.allowedRoles - Lista de roles permitidos para acceder a la ruta.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  // Fallback para mantener la sesión en recarga mientras el contexto se inicializa
  const isAuthenticated = !!user || sessionStorage.getItem('isAuthenticated') === 'true';
  const userRol = user?.rol || sessionStorage.getItem('userRol');

  if (!isAuthenticated) {
    // Redirige al login si no está autenticado
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRol)) {
    // Redirige a "No Autorizado" si el rol no coincide con los permitidos
    return <Navigate to="/no-autorizado" replace />;
  }

  return children;
};

export default ProtectedRoute;
