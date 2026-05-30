import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './MainLayout.css';

const MainLayout = () => {
  return (
    <div className="layout-container">
      {/* Barra Lateral de Navegación Fija */}
      <Sidebar />
      
      {/* Contenido Principal Dinámico */}
      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
