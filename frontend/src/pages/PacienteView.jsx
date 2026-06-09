import { useNavigate } from 'react-router-dom';
import { CalendarDays, Video, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import './DashboardViews.css';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

/**
 * Vista Base / Dashboard del Paciente.
 * KPIs conectados en tiempo real con la API.
 */
const PacienteView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const nombre = user?.nombreMostrar || sessionStorage.getItem('nombreMostrar') || 'Paciente';
  const rut = user?.rut || sessionStorage.getItem('userRut') || '';

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!rut) return;
    setLoadingStats(true);
    fetch(`${API_URL}/api/stats/paciente/${encodeURIComponent(rut)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setStats(data); setLoadingStats(false); })
      .catch(() => setLoadingStats(false));
  }, [rut]);

  const StatValue = ({ children }) => (
    loadingStats
      ? <Loader2 size={18} className="spin" style={{ color: '#94a3b8' }} />
      : <>{children}</>
  );

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
            <span className="card-title">Próxima Cita Médica</span>
            <div className="card-icon-container bg-primary-light">
              <CalendarDays size={20} />
            </div>
          </div>
          <div className="card-value" style={{ fontSize: '1.1rem' }}>
            <StatValue>
              {stats?.proxima_cita
                ? stats.proxima_cita.fecha_legible || stats.proxima_cita.fecha_hora
                : 'Sin citas próximas'}
            </StatValue>
          </div>
          <div className="card-detail">
            <StatValue>
              {stats?.proxima_cita
                ? `${stats.proxima_cita.nombre_medico} — ${stats.proxima_cita.especialidad}`
                : 'Agenda una hora con tu médico'}
            </StatValue>
          </div>
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
          <div className="card-value" style={{ fontSize: '1.1rem' }}>
            <StatValue>
              {stats?.citas_virtuales_pendientes > 0
                ? `${stats.citas_virtuales_pendientes} Consulta${stats.citas_virtuales_pendientes !== 1 ? 's' : ''} Virtual${stats.citas_virtuales_pendientes !== 1 ? 'es' : ''}`
                : 'Sin llamadas activas'}
            </StatValue>
          </div>
          <div className="card-detail">
            <StatValue>
              {stats?.proxima_cita?.tipo_cita === 'Telemedicina'
                ? `Teleconsulta: ${stats.proxima_cita.fecha_legible || stats.proxima_cita.fecha_hora}`
                : stats?.citas_virtuales_pendientes > 0
                  ? 'Tienes teleconsultas virtuales agendadas'
                  : 'Al agendar, elige la modalidad virtual'}
            </StatValue>
          </div>
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
          <div className="card-value" style={{ fontSize: '1.1rem' }}>
            <StatValue>
              {stats?.despachos_pendientes > 0
                ? `${stats.despachos_pendientes} Receta${stats.despachos_pendientes !== 1 ? 's' : ''} Pendiente${stats.despachos_pendientes !== 1 ? 's' : ''}`
                : 'Sin despachos pendientes'}
            </StatValue>
          </div>
          <div className="card-detail">
            <StatValue>
              {stats?.despachos_pendientes > 0
                ? 'Despacho programado a tu domicilio registrado'
                : 'No tienes recetas en camino'}
            </StatValue>
          </div>
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
                  <div className="action-item-title">Sala de Telemedicina</div>
                  <div className="action-item-desc">Accede a tus consultas virtuales activas</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>

            <div className="action-item" onClick={() => navigate('/paciente/despachos')}>
              <div className="action-item-left">
                <MapPin size={20} color="var(--warning)" />
                <div>
                  <div className="action-item-title">Seguimiento de Despacho</div>
                  <div className="action-item-desc">Rastrea el estado de tus medicamentos en camino</div>
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
