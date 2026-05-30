import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Telemedicina from './pages/Telemedicina';
import Logistica from './pages/Logistica';

// Guardián de Rutas
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
  
  // Si no está autenticado, lo enviamos al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública para el Login */}
        <Route path="/login" element={<Login />} />

        {/* Rutas principales con Layout Base (AHORA PROTEGIDAS) */}
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          {/* Si entra a la raíz y está logueado, va al dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* Páginas internas */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="telemedicina" element={<Telemedicina />} />
          <Route path="logistica" element={<Logistica />} />
        </Route>

        {/* Captura rutas no encontradas y las envía al login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
