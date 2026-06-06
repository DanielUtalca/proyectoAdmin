import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const ListaMisCitas = () => {
  const { user } = useAuth();
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [procesando, setProcesando] = useState(null); // id de la cita siendo cancelada

  useEffect(() => {
    fetchCitas();
  }, [user]);

  const fetchCitas = async () => {
    try {
      setLoading(true);
      setError(null);
      // Usamos import.meta.env.VITE_API_URL si existe, si no, localhost por defecto
      const baseUrl = import.meta.env?.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/citas/mis-citas/${user.rut}`);
      if (!response.ok) throw new Error('Error al cargar las citas');
      const data = await response.json();
      
      // Filtrar para mostrar solo citas RESERVADAS (y las canceladas si se desea mantener historial)
      const citasRelevantes = data.filter(c => c.estado !== 'DISPONIBLE');
      // Ordenar por fecha_hora
      citasRelevantes.sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
      
      setCitas(citasRelevantes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async (idCita) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta hora? El cupo será liberado.')) return;
    
    try {
      setProcesando(idCita);
      const baseUrl = import.meta.env?.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/citas/cancelar/${idCita}`, {
        method: 'PUT',
      });
      
      if (!response.ok) throw new Error('Error al cancelar la cita');
      
      // Refrescar lista
      await fetchCitas();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcesando(null);
    }
  };

  if (loading) return <div className="loading-state">Cargando tus citas...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>Mis horas reservadas</h2>
      
      {citas.length === 0 ? (
        <div className="empty-state">
          No tienes horas agendadas en este momento.
        </div>
      ) : (
        <div className="citas-grid">
          {citas.map((cita) => (
            <div key={cita.id_cita} className={`cita-card ${cita.estado.toLowerCase()}`}>
              <div className="cita-header">
                <span className="cita-fecha">
                  {new Date(cita.fecha_hora).toLocaleString('es-CL', {
                    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit'
                  })}
                </span>
                <span className={`cita-badge badge-${cita.estado.toLowerCase()}`}>
                  {cita.estado}
                </span>
              </div>
              <div className="cita-body">
                <p><strong>Especialidad:</strong> {cita.especialidad}</p>
                <p><strong>Médico:</strong> {cita.nombre_medico}</p>
                {cita.motivo_consulta && <p><strong>Motivo:</strong> {cita.motivo_consulta}</p>}
              </div>
              {cita.estado === 'RESERVADA' && (
                <button 
                  className="btn-cancelar" 
                  onClick={() => handleCancelar(cita.id_cita)}
                  disabled={procesando === cita.id_cita}
                >
                  {procesando === cita.id_cita ? 'Cancelando...' : 'Cancelar Hora'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListaMisCitas;
