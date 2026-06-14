import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRedirector from './components/RoleRedirector';
import DashboardLayout from './layouts/DashboardLayout';
import NoAutorizado from './pages/NoAutorizado';
import ModulePlaceholder from './pages/ModulePlaceholder';

// Importación de Dashboards por rol
import PacienteView from './pages/PacienteView';
import MedicoView from './pages/MedicoView';
import TrabajadorView from './pages/TrabajadorView';
import DirectorView from './pages/DirectorView';
import DirectorDashboard from './pages/DirectorDashboard';
import DirectorReportes from './pages/DirectorReportes';
import Monitoreo from './pages/Monitoreo';

import MiAgendaPanel from './components/agenda/MiAgendaPanel';
import AgendaMedicoPanel from './components/agenda/AgendaMedicoPanel';
import TelemedicinaMedicoPanel from './components/agenda/TelemedicinaMedicoPanel';
import TelemedicinaPacientePanel from './components/agenda/TelemedicinaPacientePanel';
import PanelLogistica from './components/PanelLogistica';
import RecetaMedicoPanel from './components/RecetaMedicoPanel';
import MisDespachosPaciente from './components/MisDespachosPaciente';
import HistorialRecetasPaciente from './components/HistorialRecetasPaciente';
import VisitasDomiciliariasPanel from './components/VisitasDomiciliariasPanel';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública para el Login */}
        <Route path="/login" element={<Login />} />

        {/* Ruta de Acceso Denegado / No Autorizado */}
        <Route path="/no-autorizado" element={<NoAutorizado />} />

        {/* Redirección automática al cargar la raíz o /dashboard */}
        <Route path="/" element={<RoleRedirector />} />
        <Route path="/dashboard" element={<RoleRedirector />} />

        {/* ──────── RUTA DE PACIENTE ──────── */}
        <Route 
          path="/paciente" 
          element={
            <ProtectedRoute allowedRoles={['Paciente']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Index: Vista principal de bienvenida y resumen */}
          <Route index element={<PacienteView />} />
          
          {/* Submódulos del paciente */}
          <Route 
            path="agenda" 
            element={<MiAgendaPanel />} 
          />
          <Route 
            path="telemedicina" 
            element={<TelemedicinaPacientePanel />} 
          />
          <Route
            path="despachos"
            element={<MisDespachosPaciente />}
          />
          <Route
            path="recetas"
            element={<HistorialRecetasPaciente />}
          />
        </Route>

        {/* ──────── RUTA DE MÉDICO ──────── */}
        <Route 
          path="/medico" 
          element={
            <ProtectedRoute allowedRoles={['Médico']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MedicoView />} />
          
          {/* Submódulos del médico */}
          <Route 
            path="agenda" 
            element={<AgendaMedicoPanel />} 
          />
          <Route 
            path="telemedicina" 
            element={<TelemedicinaMedicoPanel />} 
          />
          <Route
            path="receta"
            element={<RecetaMedicoPanel />}
          />
          <Route
            path="visitas"
            element={<VisitasDomiciliariasPanel />}
          />
        </Route>

        {/* ──────── RUTA DE TRABAJADOR ──────── */}
        <Route 
          path="/trabajador" 
          element={
            <ProtectedRoute allowedRoles={['Trabajador']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TrabajadorView />} />
          
          {/* Submódulos del trabajador */}
          <Route 
            path="horas" 
            element={
              <ModulePlaceholder 
                title="Gestión de Horas" 
                iconName="Clock" 
                description="Crea, deshabilita o modifica bloques de horas disponibles en las agendas del personal clínico del CESFAM." 
              />
            } 
          />
          <Route
            path="logistica"
            element={<PanelLogistica />}
          />
        </Route>

        {/* ──────── RUTA DE DIRECTOR ──────── */}
        <Route 
          path="/director" 
          element={
            <ProtectedRoute allowedRoles={['Director']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DirectorView />} />
          
          {/* Submódulos del director */}
          <Route 
            path="general" 
            element={<DirectorDashboard />} 
          />
          <Route 
            path="reportes" 
            element={<DirectorReportes />} 
          />
          <Route 
            path="monitoreo" 
            element={<Monitoreo />} 
          />
        </Route>

        {/* Captura de rutas inexistentes y reenvío a la raíz */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
