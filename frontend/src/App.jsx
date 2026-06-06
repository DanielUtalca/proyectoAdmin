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

import MiAgendaPanel from './components/agenda/MiAgendaPanel';
import AgendaMedicoPanel from './components/agenda/AgendaMedicoPanel';

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
            element={
              <ModulePlaceholder 
                title="Sala de Telemedicina" 
                iconName="Video" 
                description="Sala de espera virtual para tus teleconsultas con médicos del CESFAM. Conéctate a la videollamada programada." 
              />
            } 
          />
          <Route 
            path="despachos" 
            element={
              <ModulePlaceholder 
                title="Mis Despachos" 
                iconName="MapPin" 
                description="Realiza el seguimiento en tiempo real del despacho domiciliario de tus recetas y medicamentos prescritos." 
              />
            } 
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
            element={
              <ModulePlaceholder 
                title="Atención Telemedicina" 
                iconName="Video" 
                description="Inicia videollamadas con pacientes agendados de forma remota. Consulta su ficha en paralelo." 
              />
            } 
          />
          <Route 
            path="receta" 
            element={
              <ModulePlaceholder 
                title="Emitir Receta" 
                iconName="FileText" 
                description="Formulario digital estructurado para prescribir medicamentos a pacientes y enviarlos a despacho logístico." 
              />
            } 
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
            element={
              <ModulePlaceholder 
                title="Rutas de Logística" 
                iconName="Map" 
                description="Asigna conductores, planifica las hojas de ruta y controla el estado de las entregas de medicamentos a domicilio." 
              />
            } 
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
            element={
              <ModulePlaceholder 
                title="Dashboard General" 
                iconName="LayoutDashboard" 
                description="Indicadores clave de rendimiento (KPIs) del CESFAM: tasas de consulta, telemedicina, ausentismo e insumos." 
              />
            } 
          />
          <Route 
            path="reportes" 
            element={
              <ModulePlaceholder 
                title="Reportes Minsal" 
                iconName="FileSpreadsheet" 
                description="Generación y exportación de archivos planos y hojas de cálculo para el Registro Mensual de Atenciones (RMA) oficial del Minsal." 
              />
            } 
          />
        </Route>

        {/* Captura de rutas inexistentes y reenvío a la raíz */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
