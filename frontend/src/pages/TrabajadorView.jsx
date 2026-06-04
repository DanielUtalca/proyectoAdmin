import { useNavigate } from 'react-router-dom';
import { Clock, Map, ArrowRight, Truck, ClipboardList, CheckSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './DashboardViews.css';

/**
 * Vista Base / Dashboard del Trabajador (Personal de Logística / Administrativo).
 * 
 * Ítems de su Sidebar:
 * - Gestión de Horas (/trabajador/horas)
 * - Rutas de Logística (/trabajador/logistica)
 */
const TrabajadorView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const nombre = user?.nombreMostrar || sessionStorage.getItem('nombreMostrar') || 'Trabajador';

  // Ítems del menú definidos para referencia del rol:
  // - Gestión de Horas (/trabajador/horas)
  // - Rutas de Logística (/trabajador/logistica)

  return (
    <div className="view-container">
      <header className="view-header">
        <h1>¡Bienvenido, {nombre}!</h1>
        <p>Panel de Operaciones Clínicas y Logística. Gestiona las horas clínicas del CESFAM y controla los despachos domiciliarios.</p>
      </header>

      {/* Grid de KPIs / Tarjetas */}
      <div className="view-grid">
        <div className="view-card">
          <div className="card-top">
            <span className="card-title">Rutas de Despacho Activas</span>
            <div className="card-icon-container bg-primary-light">
              <Truck size={20} />
            </div>
          </div>
          <div className="card-value">4 Rutas</div>
          <div className="card-detail">12 despachos completados, 8 en tránsito</div>
          <button onClick={() => navigate('/trabajador/logistica')} className="card-link-btn">
            Ver mapa de rutas <ArrowRight size={14} />
          </button>
        </div>

        <div className="view-card">
          <div className="card-top">
            <span className="card-title">Bloques Horarios Disponibles</span>
            <div className="card-icon-container bg-success-light">
              <Clock size={20} />
            </div>
          </div>
          <div className="card-value">124 Cupos</div>
          <div className="card-detail">Para agendamiento general de la semana</div>
          <button onClick={() => navigate('/trabajador/horas')} className="card-link-btn">
            Administrar horas <ArrowRight size={14} />
          </button>
        </div>

        <div className="view-card">
          <div className="card-top">
            <span className="card-title">Incidencias de Ruta</span>
            <div className="card-icon-container bg-danger-light">
              <ClipboardList size={20} />
            </div>
          </div>
          <div className="card-value">0 Reportadas</div>
          <div className="card-detail">Operación logística funcionando con normalidad</div>
          <button onClick={() => navigate('/trabajador/logistica')} className="card-link-btn">
            Ver bitácora de logística <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Sección Informativa y Accesos Rápidos */}
      <div className="view-info-section">
        <div className="quick-actions-panel">
          <h2>Tareas Operativas</h2>
          <div className="actions-list">
            <div className="action-item" onClick={() => navigate('/trabajador/logistica')}>
              <div className="action-item-left">
                <Map size={20} color="var(--primary)" />
                <div>
                  <div className="action-item-title">Generar Hoja de Ruta Domiciliaria</div>
                  <div className="action-item-desc">Asigna despachos pendientes a conductores disponibles</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>

            <div className="action-item" onClick={() => navigate('/trabajador/horas')}>
              <div className="action-item-left">
                <CheckSquare size={20} color="var(--success)" />
                <div>
                  <div className="action-item-title">Carga Masiva de Horas Médicas</div>
                  <div className="action-item-desc">Importar disponibilidad médica desde planilla Excel</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>
          </div>
        </div>

        <div className="info-sidebar-panel">
          <h2>Mensajes de Turno</h2>
          <div className="announcements-list">
            <div className="announcement-item">
              <span className="announcement-date">Jefe de Logística</span>
              <div className="announcement-title">Uso Obligatorio de App GPS</div>
              <p className="announcement-desc">Todos los conductores deben iniciar sesión en la aplicación móvil de rutas al salir del recinto.</p>
            </div>
            
            <div className="announcement-item">
              <span className="announcement-date">Mantención</span>
              <div className="announcement-title">Mantención de Furgón Logístico #3</div>
              <p className="announcement-desc">El vehículo patente BB-CC-22 estará fuera de servicio el Viernes por revisión técnica.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrabajadorView;
