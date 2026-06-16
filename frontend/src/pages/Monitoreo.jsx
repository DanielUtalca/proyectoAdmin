import { useState, useEffect, useCallback } from 'react';
import { 
  Cpu, 
  HardDrive, 
  Database, 
  Activity, 
  RefreshCw, 
  Clock, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle,
  Server
} from 'lucide-react';
import './Monitoreo.css';

const API_URL = import.meta.env?.VITE_API_URL || '';
const GRAFANA_URL = import.meta.env?.VITE_GRAFANA_URL || 'https://cesfam-grafana-271357973400.us-central1.run.app';

const Monitoreo = () => {
  const [activeTab, setActiveTab] = useState('realtime');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper to format uptime seconds
  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const dDisplay = d > 0 ? `${d}d ` : '';
    const hDisplay = h > 0 ? `${h}h ` : '';
    const mDisplay = m > 0 ? `${m}m ` : '';
    const sDisplay = `${s}s`;
    return dDisplay + hDisplay + mDisplay + sDisplay;
  };

  const fetchStats = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/system-stats`);
      if (!response.ok) {
        throw new Error('No se pudo establecer conexión con el endpoint de telemetría.');
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      // Mock data in case backend is loading/offline to provide visual demonstration without empty screens
      setStats({
        uptime_seconds: 14520,
        cpu_percent: 18.5,
        memory: {
          total_mb: 8192,
          used_mb: 4210,
          percent: 51.4,
          process_rss_mb: 142.3
        },
        database: {
          status: 'connected',
          latency_ms: 4.8
        },
        os: {
          platform: 'Linux',
          release: '5.15.0-x86_64',
          python_version: '3.11.2'
        }
      });
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 600);
      }
    }
  }, []);

  // Poll metrics every 3 seconds when Realtime tab is active
  useEffect(() => {
    fetchStats();
    let interval;
    if (activeTab === 'realtime') {
      interval = setInterval(() => {
        fetchStats();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, fetchStats]);

  return (
    <div className="monitoreo-container">
      <header className="page-header">
        <div className="header-info">
          <h1>Monitoreo del Servidor</h1>
          <p className="text-muted">
            Estado de salud, métricas y telemetría de rendimiento en tiempo real del sistema CESFAM.
          </p>
        </div>
        <div className="header-actions">
          {activeTab === 'realtime' && (
            <button 
              className={`btn btn-refresh ${isRefreshing ? 'refreshing' : ''}`} 
              onClick={() => fetchStats(true)}
              disabled={isRefreshing}
            >
              <RefreshCw size={16} />
              <span>{isRefreshing ? 'Actualizando...' : 'Actualizar ahora'}</span>
            </button>
          )}
          <span className={`status-badge ${error ? 'warning' : 'healthy'}`}>
            <span className="pulse-dot"></span>
            {error ? 'Telemetría Limitada (Mock)' : 'Servidor en Línea'}
          </span>
        </div>
      </header>

      {/* Tabs de Navegación */}
      <div className="tabs-nav">
        <button 
          className={`tab-btn ${activeTab === 'realtime' ? 'active' : ''}`}
          onClick={() => setActiveTab('realtime')}
        >
          <Activity size={18} />
          <span>Tiempo Real</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'grafana' ? 'active' : ''}`}
          onClick={() => setActiveTab('grafana')}
        >
          <Server size={18} />
          <span>Panel Histórico (Grafana)</span>
        </button>
      </div>

      {/* Contenido de las Pestañas */}
      <div className="tab-content">
        {loading ? (
          <div className="loader-wrapper">
            <div className="spinner"></div>
            <p>Cargando datos de telemetría...</p>
          </div>
        ) : activeTab === 'realtime' ? (
          <div className="realtime-panel">
            {error && (
              <div className="alert alert-warning">
                <AlertTriangle size={20} />
                <div>
                  <strong>Advertencia de Conexión:</strong> {error} Mostrando datos de simulación local. Asegúrate de iniciar el backend.
                </div>
              </div>
            )}

            {/* Grid de KPIs principales */}
            <div className="metrics-grid">
              {/* CPU Card */}
              <div className="metric-card glass">
                <div className="card-header">
                  <div className="card-icon cpu-icon">
                    <Cpu size={22} />
                  </div>
                  <h3>Uso de CPU</h3>
                </div>
                <div className="card-value">
                  <span className="big-number">{stats?.cpu_percent}%</span>
                </div>
                <div className="card-progress">
                  <div 
                    className={`progress-bar ${stats?.cpu_percent > 80 ? 'critical' : stats?.cpu_percent > 50 ? 'warning' : 'normal'}`}
                    style={{ width: `${stats?.cpu_percent}%` }}
                  ></div>
                </div>
                <div className="card-footer">
                  <span className="text-muted">Carga de CPU activa en el contenedor</span>
                </div>
              </div>

              {/* Memory Card */}
              <div className="metric-card glass">
                <div className="card-header">
                  <div className="card-icon memory-icon">
                    <HardDrive size={22} />
                  </div>
                  <h3>Memoria del Sistema</h3>
                </div>
                <div className="card-value">
                  <span className="big-number">{stats?.memory?.percent}%</span>
                  <span className="sub-value">
                    {stats?.memory?.used_mb} MB / {stats?.memory?.total_mb} MB
                  </span>
                </div>
                <div className="card-progress">
                  <div 
                    className="progress-bar"
                    style={{ width: `${stats?.memory?.percent}%` }}
                  ></div>
                </div>
                <div className="card-footer">
                  <span className="label-rss">Proceso Python RSS:</span>
                  <strong className="value-rss">{stats?.memory?.process_rss_mb} MB</strong>
                </div>
              </div>

              {/* Database Card */}
              <div className="metric-card glass">
                <div className="card-header">
                  <div className="card-icon db-icon">
                    <Database size={22} />
                  </div>
                  <h3>Base de Datos</h3>
                </div>
                <div className="card-value">
                  <span className="big-number status-text connected">
                    <CheckCircle size={24} className="inline-icon" /> Conectada
                  </span>
                </div>
                <div className="db-latency-display">
                  <span className="latency-label">Latencia de Ping:</span>
                  <span className="latency-value">{stats?.database?.latency_ms} ms</span>
                </div>
                <div className="card-footer">
                  <span className="text-muted">Motor: PostgreSQL (Postgres-15-Alpine)</span>
                </div>
              </div>

              {/* Uptime Card */}
              <div className="metric-card glass">
                <div className="card-header">
                  <div className="card-icon uptime-icon">
                    <Clock size={22} />
                  </div>
                  <h3>Tiempo de Actividad</h3>
                </div>
                <div className="card-value">
                  <span className="big-number uptime-text">
                    {formatUptime(stats?.uptime_seconds)}
                  </span>
                </div>
                <div className="sys-info-list">
                  <div className="sys-info-item">
                    <span>S.O.:</span>
                    <strong>{stats?.os?.platform} {stats?.os?.release.split('-')[0]}</strong>
                  </div>
                  <div className="sys-info-item">
                    <span>Python:</span>
                    <strong>v{stats?.os?.python_version}</strong>
                  </div>
                </div>
                <div className="card-footer">
                  <span className="text-muted">Tiempo desde el último inicio</span>
                </div>
              </div>
            </div>


          </div>
        ) : (
          <div className="grafana-panel">
            <div className="grafana-actions">
              <p className="text-muted">
                Grafana lee en tiempo real la base de datos temporal de Prometheus. Puedes abrir el panel en pantalla completa para realizar auditorías avanzadas de tiempos de respuesta HTTP.
              </p>
              <a 
                href={`${GRAFANA_URL}/d/fastapi_metrics/cesfam-api-metrics?orgId=1`} 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-external-grafana"
              >
                <span>Abrir Grafana Autónomo</span>
                <ExternalLink size={14} />
              </a>
            </div>
            
            <div className="iframe-container glass">
              <iframe
                title="Grafana FastAPI Dashboard"
                src={`${GRAFANA_URL}/d/fastapi_metrics/cesfam-api-metrics?orgId=1&refresh=5s&kiosk`}
                width="100%"
                height="650"
                frameBorder="0"
                className="grafana-iframe"
                onError={() => console.log('Error al conectar con Grafana.')}
              ></iframe>
              <div className="iframe-fallback-overlay">
                <div className="fallback-card">
                  <AlertTriangle size={36} color="var(--warning)" />
                  <h3>¿No puedes visualizar el panel de Grafana?</h3>
                  <p>
                    Asegúrate de que los contenedores de Docker estén encendidos y corriendo. Grafana requiere levantar el servicio local en el puerto <code>3000</code>.
                  </p>
                  <div className="fallback-commands">
                    <code>docker compose up -d</code>
                  </div>
                  <button onClick={() => {
                    const iframe = document.querySelector('.grafana-iframe');
                    if(iframe) iframe.src = iframe.src;
                  }} className="btn btn-retry">
                    Reintentar cargar panel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Monitoreo;
