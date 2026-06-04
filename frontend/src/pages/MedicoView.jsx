import { useNavigate } from 'react-router-dom';
import { CalendarDays, Video, FileText, ArrowRight, Users, Clipboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './DashboardViews.css';

/**
 * Vista Base / Dashboard del Médico.
 * 
 * Ítems de su Sidebar:
 * - Agenda Diaria (/medico/agenda)
 * - Atención Telemedicina (/medico/telemedicina)
 * - Emitir Receta (/medico/receta)
 */
const MedicoView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const nombre = user?.nombreMostrar || sessionStorage.getItem('nombreMostrar') || 'Médico';

  // Ítems del menú definidos para referencia del rol:
  // - Agenda Diaria (/medico/agenda)
  // - Atención Telemedicina (/medico/telemedicina)
  // - Emitir Receta (/medico/receta)

  return (
    <div className="view-container">
      <header className="view-header">
        <h1>¡Bienvenido, {nombre}!</h1>
        <p>Portal Médico del CESFAM Purranque. Revisa tu agenda clínica, inicia atenciones de telemedicina y emite recetas.</p>
      </header>

      {/* Grid de KPIs / Tarjetas */}
      <div className="view-grid">
        <div className="view-card">
          <div className="card-top">
            <span className="card-title">Pacientes Citados Hoy</span>
            <div className="card-icon-container bg-primary-light">
              <Users size={20} />
            </div>
          </div>
          <div className="card-value">18 Pacientes</div>
          <div className="card-detail">5 atenciones realizadas hoy</div>
          <button onClick={() => navigate('/medico/agenda')} className="card-link-btn">
            Ver agenda de hoy <ArrowRight size={14} />
          </button>
        </div>

        <div className="view-card">
          <div className="card-top">
            <span className="card-title">Teleconsultas Pendientes</span>
            <div className="card-icon-container bg-success-light">
              <Video size={20} />
            </div>
          </div>
          <div className="card-value">3 Consultas</div>
          <div className="card-detail">Próxima llamada a las 11:15 AM con Juan Pérez</div>
          <button onClick={() => navigate('/medico/telemedicina')} className="card-link-btn">
            Ir a telemedicina <ArrowRight size={14} />
          </button>
        </div>

        <div className="view-card">
          <div className="card-top">
            <span className="card-title">Recetas Emitidas esta semana</span>
            <div className="card-icon-container bg-warning-light">
              <FileText size={20} />
            </div>
          </div>
          <div className="card-value">42 Emitidas</div>
          <div className="card-detail">38 despachadas por logística interna</div>
          <button onClick={() => navigate('/medico/receta')} className="card-link-btn">
            Emitir nueva receta <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Sección Informativa y Accesos Rápidos */}
      <div className="view-info-section">
        <div className="quick-actions-panel">
          <h2>Herramientas Clínicas</h2>
          <div className="actions-list">
            <div className="action-item" onClick={() => navigate('/medico/agenda')}>
              <div className="action-item-left">
                <CalendarDays size={20} color="var(--primary)" />
                <div>
                  <div className="action-item-title">Bloquear Agenda / Permisos</div>
                  <div className="action-item-desc">Gestiona tus bloques horarios disponibles en el sistema</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>

            <div className="action-item" onClick={() => navigate('/medico/receta')}>
              <div className="action-item-left">
                <Clipboard size={20} color="var(--warning)" />
                <div>
                  <div className="action-item-title">Historial Clínico de Pacientes</div>
                  <div className="action-item-desc">Búsqueda rápida de fichas clínicas y recetas previas</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>
          </div>
        </div>

        <div className="info-sidebar-panel">
          <h2>Estadísticas Rápidas</h2>
          <div className="announcements-list">
            <div className="announcement-item">
              <span className="announcement-date">Rendimiento</span>
              <div className="announcement-title">Promedio de Atención</div>
              <p className="announcement-desc">18.5 minutos por paciente. Cumple con el estándar recomendado por el CESFAM.</p>
            </div>
            
            <div className="announcement-item">
              <span className="announcement-date">Telemedicina</span>
              <div className="announcement-title">Calidad de Video</div>
              <p className="announcement-desc">Tasa de éxito del 98.4% en transmisiones de consultas esta semana.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicoView;
