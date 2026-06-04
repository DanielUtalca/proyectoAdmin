import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, ArrowRight, BarChart3, Users, Landmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './DashboardViews.css';

/**
 * Vista Base / Dashboard del Director del CESFAM.
 * 
 * Ítems de su Sidebar:
 * - Dashboard General (/director/general)
 * - Reportes Minsal (/director/reportes)
 */
const DirectorView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const nombre = user?.nombreMostrar || sessionStorage.getItem('nombreMostrar') || 'Director';

  // Ítems del menú definidos para referencia del rol:
  // - Dashboard General (/director/general)
  // - Reportes Minsal (/director/reportes)

  return (
    <div className="view-container">
      <header className="view-header">
        <h1>¡Bienvenido, {nombre}!</h1>
        <p>Panel de Gestión Institucional y Reportes. Evalúa las métricas globales del CESFAM Purranque y exporta reportes normativos para el Minsal.</p>
      </header>

      {/* Grid de KPIs / Tarjetas */}
      <div className="view-grid">
        <div className="view-card">
          <div className="card-top">
            <span className="card-title">Pacientes Registrados Totales</span>
            <div className="card-icon-container bg-primary-light">
              <Users size={20} />
            </div>
          </div>
          <div className="card-value">12,482 Habitantes</div>
          <div className="card-detail">+145 nuevos ingresos este mes</div>
          <button onClick={() => navigate('/director/general')} className="card-link-btn">
            Ver estadísticas de población <ArrowRight size={14} />
          </button>
        </div>

        <div className="view-card">
          <div className="card-top">
            <span className="card-title">Atenciones Totales (Mes)</span>
            <div className="card-icon-container bg-success-light">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="card-value">3,120 Atenciones</div>
          <div className="card-detail">82% Presencial, 18% Telemedicina</div>
          <button onClick={() => navigate('/director/general')} className="card-link-btn">
            Ver reporte de rendimiento <ArrowRight size={14} />
          </button>
        </div>

        <div className="view-card">
          <div className="card-top">
            <span className="card-title">Estado Reportes Minsal</span>
            <div className="card-icon-container bg-warning-light">
              <Landmark size={20} />
            </div>
          </div>
          <div className="card-value">Al Día</div>
          <div className="card-detail">Próxima entrega: 10 de Junio (Reporte Mensual)</div>
          <button onClick={() => navigate('/director/reportes')} className="card-link-btn">
            Ver reportes del Ministerio <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Sección Informativa y Accesos Rápidos */}
      <div className="view-info-section">
        <div className="quick-actions-panel">
          <h2>Gestión de Reportes</h2>
          <div className="actions-list">
            <div className="action-item" onClick={() => navigate('/director/reportes')}>
              <div className="action-item-left">
                <FileSpreadsheet size={20} color="var(--primary)" />
                <div>
                  <div className="action-item-title">Exportar Registro Mensual de Atenciones (RMA)</div>
                  <div className="action-item-desc">Genera archivo oficial para envío directo al Ministerio de Salud</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>

            <div className="action-item" onClick={() => navigate('/director/general')}>
              <div className="action-item-left">
                <BarChart3 size={20} color="var(--success)" />
                <div>
                  <div className="action-item-title">Auditoría de Tiempos de Espera</div>
                  <div className="action-item-desc">Revisión de cuellos de botella en admisión y teleconsultas</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>
          </div>
        </div>

        <div className="info-sidebar-panel">
          <h2>Alertas Administrativas</h2>
          <div className="announcements-list">
            <div className="announcement-item">
              <span className="announcement-date" style={{ color: 'var(--danger)' }}>Urgente</span>
              <div className="announcement-title">Presupuesto Insumos Q3</div>
              <p className="announcement-desc">Revisión y firma del plan de insumos médicos de telemedicina antes del Viernes.</p>
            </div>
            
            <div className="announcement-item">
              <span className="announcement-date">Servicio de Salud Osorno</span>
              <div className="announcement-title">Metas Sanitarias 2026</div>
              <p className="announcement-desc">Publicados nuevos umbrales de cobertura cardiovascular. Nivel actual del CESFAM: 78% (Meta: 80%).</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectorView;
