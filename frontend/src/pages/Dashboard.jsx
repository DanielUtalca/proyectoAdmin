import { Users, CheckCircle, XCircle } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  // Datos simulados para las tarjetas
  const kpis = [
    {
      title: "Pacientes Agendados Hoy",
      value: "48",
      trend: "+12%",
      isPositive: true,
      icon: <Users size={24} className="text-primary" />,
      bgColor: "rgba(26, 115, 232, 0.1)"
    },
    {
      title: "Atenciones Realizadas",
      value: "32",
      trend: "+5%",
      isPositive: true,
      icon: <CheckCircle size={24} className="text-success" />,
      bgColor: "rgba(15, 157, 88, 0.1)"
    },
    {
      title: "Citas Canceladas",
      value: "3",
      trend: "-2%",
      isPositive: false,
      icon: <XCircle size={24} className="text-danger" />,
      bgColor: "rgba(217, 48, 37, 0.1)"
    }
  ];

  // Datos simulados para el gráfico de barras
  const chartData = [
    { day: 'Lun', value: 65 },
    { day: 'Mar', value: 45 },
    { day: 'Mié', value: 80 },
    { day: 'Jue', value: 55 },
    { day: 'Vie', value: 90 }
  ];

  return (
    <div className="dashboard-container">
      <header className="page-header">
        <h1>Dashboard Administrativo</h1>
        <p className="text-muted">Resumen de actividad del CESFAM - {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </header>

      {/* Grid de KPIs */}
      <div className="kpi-grid">
        {kpis.map((kpi, index) => (
          <div key={index} className="card kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">{kpi.title}</span>
              <div className="kpi-icon" style={{ backgroundColor: kpi.bgColor }}>
                {kpi.icon}
              </div>
            </div>
            <div className="kpi-body">
              <span className="kpi-value">{kpi.value}</span>
              <span className={`kpi-trend ${kpi.isPositive ? 'text-success' : 'text-danger'}`}>
                {kpi.trend} vs ayer
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico Simulado */}
      <div className="card chart-section">
        <div className="chart-header">
          <h2>Resumen Semanal de Atenciones</h2>
          <p className="text-muted">Comparativa de flujo de pacientes</p>
        </div>
        
        <div className="chart-container-mock">
          {chartData.map((data, index) => (
            <div key={index} className="bar-group">
              <div className="bar-wrapper">
                <div 
                  className="bar" 
                  style={{ height: `${data.value}%` }}
                  title={`${data.value} atenciones`}
                ></div>
              </div>
              <span className="bar-label">{data.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
