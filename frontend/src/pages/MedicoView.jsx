import { useNavigate } from 'react-router-dom';
import { CalendarDays, Video, FileText, ArrowRight, Users, Clipboard, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import './DashboardViews.css';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

/**
 * Vista Base / Dashboard del Médico.
 * KPIs conectados en tiempo real con la API.
 */
const MedicoView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const nombre = user?.nombreMostrar || sessionStorage.getItem('nombreMostrar') || 'Médico';

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!nombre || nombre === 'Médico') return;
    setLoadingStats(true);
    fetch(`${API_URL}/api/stats/medico/${encodeURIComponent(nombre)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setStats(data); setLoadingStats(false); })
      .catch(() => setLoadingStats(false));
  }, [nombre]);

  const StatValue = ({ children }) => (
    loadingStats
      ? <Loader2 size={20} className="spin" style={{ color: '#94a3b8' }} />
      : <>{children}</>
  );

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
          <div className="card-value">
            <StatValue>
              {stats?.total_pacientes_hoy ?? 0} Paciente{(stats?.total_pacientes_hoy ?? 0) !== 1 ? 's' : ''}
            </StatValue>
          </div>
          <div className="card-detail">
            <StatValue>
              {stats?.atendidas_hoy ?? 0} atendido{(stats?.atendidas_hoy ?? 0) !== 1 ? 's' : ''} hoy
            </StatValue>
          </div>
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
          <div className="card-value">
            <StatValue>
              {stats?.teleconsultas_pendientes ?? 0} Consulta{(stats?.teleconsultas_pendientes ?? 0) !== 1 ? 's' : ''}
            </StatValue>
          </div>
          <div className="card-detail">
            <StatValue>
              {stats?.proxima_teleconsulta
                ? `Próxima: ${stats.proxima_teleconsulta.nombre_paciente} — ${stats.proxima_teleconsulta.fecha_hora}`
                : 'Sin teleconsultas virtuales pendientes'}
            </StatValue>
          </div>
          <button onClick={() => navigate('/medico/telemedicina')} className="card-link-btn">
            Ir a telemedicina <ArrowRight size={14} />
          </button>
        </div>

        <div className="view-card">
          <div className="card-top">
            <span className="card-title">Emitir Receta / Logística</span>
            <div className="card-icon-container bg-warning-light">
              <FileText size={20} />
            </div>
          </div>
          <div className="card-value" style={{ fontSize: '1.1rem' }}>Prescripción Digital</div>
          <div className="card-detail">Genera recetas y órdenes de despacho domiciliario</div>
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
                  <div className="action-item-title">Agenda Diaria</div>
                  <div className="action-item-desc">Ver y gestionar todas tus citas del día</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>

            <div className="action-item" onClick={() => navigate('/medico/telemedicina')}>
              <div className="action-item-left">
                <Video size={20} color="var(--success)" />
                <div>
                  <div className="action-item-title">Panel de Telemedicina</div>
                  <div className="action-item-desc">Inicia videollamadas y registra atenciones virtuales</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>

            <div className="action-item" onClick={() => navigate('/medico/receta')}>
              <div className="action-item-left">
                <Clipboard size={20} color="var(--warning)" />
                <div>
                  <div className="action-item-title">Receta Electrónica</div>
                  <div className="action-item-desc">Prescribe medicamentos y genera órdenes de logística</div>
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
              <span className="announcement-date">Hoy</span>
              <div className="announcement-title">Resumen de Atenciones</div>
              <p className="announcement-desc">
                {loadingStats
                  ? 'Calculando...'
                  : `${stats?.atendidas_hoy ?? 0} de ${stats?.total_pacientes_hoy ?? 0} pacientes atendidos hoy.`
                }
              </p>
            </div>

            <div className="announcement-item">
              <span className="announcement-date">Telemedicina</span>
              <div className="announcement-title">Teleconsultas Activas</div>
              <p className="announcement-desc">
                {loadingStats
                  ? 'Cargando...'
                  : stats?.teleconsultas_pendientes > 0
                    ? `${stats.teleconsultas_pendientes} consulta${stats.teleconsultas_pendientes !== 1 ? 's' : ''} virtual${stats.teleconsultas_pendientes !== 1 ? 'es' : ''} pendiente${stats.teleconsultas_pendientes !== 1 ? 's' : ''} en tu agenda.`
                    : 'No tienes teleconsultas virtuales pendientes.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicoView;
