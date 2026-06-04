import { useNavigate } from 'react-router-dom';
import { CalendarDays, Video, MapPin, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './DashboardViews.css';

/**
 * Vista Base / Dashboard del Paciente.
 * 
 * Ítems de su Sidebar:
 * - Mi Agenda (/paciente/agenda)
 * - Sala de Telemedicina (/paciente/telemedicina)
 * - Mis Despachos (/paciente/despachos)
 */
const PacienteView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const nombre = user?.nombreMostrar || sessionStorage.getItem('nombreMostrar') || 'Paciente';

  // Ítems del menú definidos para referencia del rol:
  // - Mi Agenda (/paciente/agenda)
  // - Sala de Telemedicina (/paciente/telemedicina)
  // - Mis Despachos (/paciente/despachos)

  return (
    <div className="view-container">
      <header className="view-header">
        <h1>¡Bienvenido, {nombre}!</h1>
        <p>Tu portal de salud familiar del CESFAM Purranque. Consulta tu agenda, telemedicina y despachos.</p>
      </header>

      {/* Grid de KPIs / Tarjetas */}
      <div className="view-grid">
        <div className="view-card">
          <div className="card-top">
            <span className="card-title">Próxima Cita Medica</span>
            <div className="card-icon-container bg-primary-light">
              <CalendarDays size={20} />
            </div>
          </div>
          <div className="card-value" style={{ fontSize: '1.25rem' }}>Mañana a las 10:30 AM</div>
          <div className="card-detail">Dr. Alejandro Muñoz — Medicina General</div>
          <button onClick={() => navigate('/paciente/agenda')} className="card-link-btn">
            Ver mi agenda <ArrowRight size={14} />
          </button>
        </div>

        <div className="view-card">
          <div className="card-top">
            <span className="card-title">Sala de Telemedicina</span>
            <div className="card-icon-container bg-success-light">
              <Video size={20} />
            </div>
          </div>
          <div className="card-value" style={{ fontSize: '1.25rem' }}>Sin llamadas activas</div>
          <div className="card-detail">Próxima teleconsulta programada para el 12 de Junio</div>
          <button onClick={() => navigate('/paciente/telemedicina')} className="card-link-btn">
            Entrar a la sala <ArrowRight size={14} />
          </button>
        </div>

        <div className="view-card">
          <div className="card-top">
            <span className="card-title">Medicamentos por Despachar</span>
            <div className="card-icon-container bg-warning-light">
              <MapPin size={20} />
            </div>
          </div>
          <div className="card-value" style={{ fontSize: '1.25rem' }}>1 Receta Pendiente</div>
          <div className="card-detail">Despacho programado a tu domicilio registrado</div>
          <button onClick={() => navigate('/paciente/despachos')} className="card-link-btn">
            Seguimiento de despacho <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Sección Informativa y Accesos Rápidos */}
      <div className="view-info-section">
        <div className="quick-actions-panel">
          <h2>Accesos Directos</h2>
          <div className="actions-list">
            <div className="action-item" onClick={() => navigate('/paciente/agenda')}>
              <div className="action-item-left">
                <CalendarDays size={20} color="var(--primary)" />
                <div>
                  <div className="action-item-title">Reservar o Modificar Cita</div>
                  <div className="action-item-desc">Elige fecha, médico y especialidad en línea</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>

            <div className="action-item" onClick={() => navigate('/paciente/telemedicina')}>
              <div className="action-item-left">
                <Video size={20} color="var(--success)" />
                <div>
                  <div className="action-item-title">Prueba de Conexión de Telemedicina</div>
                  <div className="action-item-desc">Verifica tu cámara y micrófono antes de tu consulta</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>
          </div>
        </div>

        <div className="info-sidebar-panel">
          <h2>Anuncios CESFAM</h2>
          <div className="announcements-list">
            <div className="announcement-item">
              <span className="announcement-date">Campaña de Vacunación</span>
              <div className="announcement-title">Vacunación Influenza 2026</div>
              <p className="announcement-desc">Recuerda vacunarte de Lunes a Viernes de 8:30 a 16:30 hrs en el vacunatorio central.</p>
            </div>
            
            <div className="announcement-item">
              <span className="announcement-date">Aviso General</span>
              <div className="announcement-title">Nuevos horarios de Farmacia</div>
              <p className="announcement-desc">Extendemos el horario de entrega los días Jueves hasta las 20:00 hrs.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PacienteView;
