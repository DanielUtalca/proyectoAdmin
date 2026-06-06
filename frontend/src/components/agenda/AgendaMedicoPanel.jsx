import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

// Badge visual por estado
const BADGE_CONFIG = {
  RESERVADA: { label: 'Reservada', clase: 'badge-reservada' },
  ATENDIDA:  { label: 'Atendida',  clase: 'badge-atendida'  },
};

const AgendaMedicoPanel = () => {
  const { user } = useAuth();
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('TODAS');
  const [procesando, setProcesando] = useState(null);

  // El nombre_mostrar ya viene como "Dr. Andrés Castro" desde el backend
  // y coincide exactamente con el formato que usa la tabla de citas.
  const nombreMedico = user?.nombreMostrar || '';

  useEffect(() => { fetchCitas(); }, []);

  const fetchCitas = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch(
        `${API_URL}/api/citas/mi-agenda-medico/${encodeURIComponent(nombreMedico)}`
      );
      if (!resp.ok) throw new Error('Error al cargar la agenda');
      const data = await resp.json();
      setCitas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAtender = async (idCita) => {
    if (!window.confirm('¿Confirmas que esta cita fue atendida?')) return;
    try {
      setProcesando(idCita);
      const resp = await fetch(`${API_URL}/api/citas/atender/${idCita}`, { method: 'PUT' });
      if (!resp.ok) throw new Error('Error al actualizar la cita');
      await fetchCitas();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcesando(null);
    }
  };

  const citasFiltradas = filtro === 'TODAS'
    ? citas
    : citas.filter(c => c.estado === filtro);

  // Estadísticas rápidas
  const totalReservadas = citas.filter(c => c.estado === 'RESERVADA').length;
  const totalAtendidas  = citas.filter(c => c.estado === 'ATENDIDA').length;

  if (loading) return <div className="loading-state">Cargando tu agenda...</div>;
  if (error)   return <div className="error-message">{error}</div>;

  return (
    <div className="agenda-container">
      {/* Encabezado */}
      <div className="medico-header">
        <div>
          <h2 style={{ margin: 0, color: '#1e293b' }}>Mi Agenda</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>{nombreMedico}</p>
        </div>
        {/* KPIs rápidos */}
        <div className="medico-kpis">
          <div className="kpi-card kpi-reservadas">
            <span className="kpi-num">{totalReservadas}</span>
            <span className="kpi-label">Pendientes</span>
          </div>
          <div className="kpi-card kpi-atendidas">
            <span className="kpi-num">{totalAtendidas}</span>
            <span className="kpi-label">Atendidas</span>
          </div>
        </div>
      </div>

      {/* Filtro de estado */}
      <div className="medico-filtros">
        {['TODAS', 'RESERVADA', 'ATENDIDA'].map(f => (
          <button
            key={f}
            className={`filtro-tab ${filtro === f ? 'filtro-tab-active' : ''}`}
            onClick={() => setFiltro(f)}
          >
            {f === 'TODAS' ? 'Todas' : f === 'RESERVADA' ? 'Pendientes' : 'Atendidas'}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {citasFiltradas.length === 0 ? (
        <div className="empty-state">
          No hay citas con el filtro seleccionado.
        </div>
      ) : (
        <div className="tabla-medico-wrapper">
          <table className="tabla-medico">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Paciente</th>
                <th>RUT</th>
                <th>Motivo de Consulta</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {citasFiltradas.map(cita => {
                const badge = BADGE_CONFIG[cita.estado] || {};
                // Construir fecha (el string es "YYYY-MM-DD HH:MM")
                const fechaDisplay = (() => {
                  try {
                    return new Date(cita.fecha_hora.replace(' ', 'T') + ':00')
                      .toLocaleString('es-CL', {
                        weekday: 'short', day: '2-digit',
                        month: 'short', hour: '2-digit', minute: '2-digit'
                      });
                  } catch { return cita.fecha_hora; }
                })();

                return (
                  <tr key={cita.id_cita} className={cita.estado === 'ATENDIDA' ? 'fila-atendida' : ''}>
                    <td>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{fechaDisplay}</span>
                    </td>
                    <td>{cita.nombre_paciente || '—'}</td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{cita.rut_paciente || '—'}</td>
                    <td className="celda-motivo" title={cita.motivo_consulta || ''}>
                      {cita.motivo_consulta || '—'}
                    </td>
                    <td>
                      <span className={`cita-badge ${badge.clase}`}>{badge.label}</span>
                    </td>
                    <td>
                      {cita.estado === 'RESERVADA' && (
                        <button
                          className="btn-atender"
                          onClick={() => handleAtender(cita.id_cita)}
                          disabled={procesando === cita.id_cita}
                        >
                          {procesando === cita.id_cita ? '...' : '✓ Atendida'}
                        </button>
                      )}
                      {cita.estado === 'ATENDIDA' && (
                        <span className="atendida-check">✓ Completada</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AgendaMedicoPanel;
