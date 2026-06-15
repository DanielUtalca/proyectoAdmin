import { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  CalendarDays,
  Video,
  FileText,
  AlertCircle
} from 'lucide-react';
import './DirectorReportes.css';

const API_URL = import.meta.env?.VITE_API_URL || '';

const DirectorReportes = () => {
  const [loading, setLoading] = useState(true);
  const [citas, setCitas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchPreview = async () => {
    try {
      const response = await fetch(`${API_URL}/api/director/reportes/preview`);
      if (!response.ok) {
        throw new Error('Error al cargar la vista previa.');
      }
      const data = await response.json();
      setCitas(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      // Fallback a registros simulados para demostración visual
      setCitas([
        {
          id_cita: 101,
          rut_paciente: "9.876.543-2",
          nombre_paciente: "Juan Pérez",
          especialidad: "Pediatría",
          nombre_medico: "Dra. Antonia Vega",
          fecha_hora: "2026-06-12 16:30",
          estado: "RESERVADA",
          tipo_cita: "Presencial",
          prioridad: "NORMAL"
        },
        {
          id_cita: 102,
          rut_paciente: "12.345.678-9",
          nombre_paciente: "María González",
          especialidad: "Medicina General",
          nombre_medico: "Dr. Andrés Castro",
          fecha_hora: "2026-06-13 09:15",
          estado: "RESERVADA",
          tipo_cita: "Telemedicina",
          prioridad: "NORMAL"
        },
        {
          id_cita: 103,
          rut_paciente: "11.222.333-4",
          nombre_paciente: "Carlos Ramírez",
          especialidad: "Medicina General",
          nombre_medico: "Dr. Andrés Castro",
          fecha_hora: "2026-06-13 11:30",
          estado: "DISPONIBLE",
          tipo_cita: "Presencial",
          prioridad: "NORMAL"
        },
        {
          id_cita: 104,
          rut_paciente: "15.444.666-8",
          nombre_paciente: "Sofía Alvarado",
          especialidad: "Pediatría",
          nombre_medico: "Dra. Antonia Vega",
          fecha_hora: "2026-06-14 10:00",
          estado: "CANCELADA",
          tipo_cita: "Presencial",
          prioridad: "ALTA"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, []);

  const handleExport = () => {
    setIsExporting(true);
    // Disparar la descarga de forma nativa redirigiendo a la URL del endpoint
    window.location.href = `${API_URL}/api/director/reportes/export`;
    setTimeout(() => setIsExporting(false), 2000);
  };

  // Filtrado de la tabla de vista previa
  const filteredCitas = citas.filter(c => 
    (c.nombre_paciente?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.nombre_medico?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.especialidad?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="director-reportes">
      <header className="page-header">
        <div>
          <h1>Gestión de Reportes del Ministerio</h1>
          <p className="text-muted">Genera, exporta y audita reportes normativos y de atenciones oficiales del CESFAM.</p>
        </div>
      </header>

      {/* Tarjeta de Exportación */}
      <div className="export-action-card glass">
        <div className="export-info">
          <div className="export-icon-container">
            <FileSpreadsheet size={32} color="var(--primary)" />
          </div>
          <div>
            <h3>Registro Mensual de Atenciones (RMA)</h3>
            <p>
              Genera la hoja de cálculo completa con la base consolidada de citas clínicas. El formato de salida es un archivo delimitado por punto y coma (<code>;</code>) optimizado con UTF-8 BOM para apertura nativa en Microsoft Excel en Windows.
            </p>
          </div>
        </div>
        <button 
          className="btn btn-export-excel" 
          onClick={handleExport}
          disabled={isExporting}
        >
          <Download size={18} />
          <span>{isExporting ? 'Exportando...' : 'Descargar Reporte RMA (CSV)'}</span>
        </button>
      </div>

      {/* Vista previa de datos */}
      <div className="preview-section glass">
        <div className="preview-header">
          <div>
            <h2>Vista Previa de Registros Recientes</h2>
            <p className="text-muted">Mostrando las últimas 15 citas agendadas registradas en el sistema.</p>
          </div>
          
          <div className="search-bar-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por paciente, médico o especialidad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-info">
            <AlertCircle size={18} />
            <span>Mostrando vista previa local para demostración. El backend está en modo offline.</span>
          </div>
        )}

        {loading ? (
          <div className="table-loader">
            <div className="spinner"></div>
            <p>Consultando registros...</p>
          </div>
        ) : filteredCitas.length === 0 ? (
          <div className="no-data-display">
            <p>No se encontraron registros que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Paciente</th>
                  <th>RUT Paciente</th>
                  <th>Especialidad</th>
                  <th>Médico Asignado</th>
                  <th>Fecha y Hora</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Prioridad</th>
                </tr>
              </thead>
              <tbody>
                {filteredCitas.map((cita) => (
                  <tr key={cita.id_cita}>
                    <td><strong>#{cita.id_cita}</strong></td>
                    <td>{cita.nombre_paciente || 'N/A'}</td>
                    <td>{cita.rut_paciente || 'N/A'}</td>
                    <td><span className="badge-spec">{cita.especialidad}</span></td>
                    <td>{cita.nombre_medico}</td>
                    <td>{cita.fecha_hora}</td>
                    <td>
                      <span className={`badge-type ${cita.tipo_cita === 'Telemedicina' ? 'tele' : 'pres'}`}>
                        {cita.tipo_cita === 'Telemedicina' ? <Video size={12} /> : <CalendarDays size={12} />}
                        {cita.tipo_cita}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge-table ${cita.estado.toLowerCase()}`}>
                        {cita.estado}
                      </span>
                    </td>
                    <td>
                      <span className={`priority-badge-table ${cita.prioridad.toLowerCase()}`}>
                        {cita.prioridad}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectorReportes;
