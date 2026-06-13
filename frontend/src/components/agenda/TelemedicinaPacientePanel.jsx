import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Video, Calendar, Clock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

const TelemedicinaPacientePanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [citasVirtuales, setCitasVirtuales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ahora, setAhora] = useState(new Date());

  const rut = user?.rut || sessionStorage.getItem('userRut') || '';

  useEffect(() => {
    const timer = setInterval(() => {
      setAhora(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (rut) {
      fetchCitas();
    }
  }, [rut]);

  const fetchCitas = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch(`${API_URL}/api/citas/mis-citas/${rut}`);
      if (!resp.ok) throw new Error('Error al cargar tus citas médicas');
      const data = await resp.json();
      
      // Filtrar citas que sean virtuales (Telemedicina) y estén pendientes (RESERVADA)
      const virtuales = data.filter(c => c.tipo_cita === 'Telemedicina' && c.estado === 'RESERVADA');
      setCitasVirtuales(virtuales);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEntrarVideollamada = (cita) => {
    const jitsiUrl = cita.enlace_telemedicina || '';
    if (jitsiUrl) {
      window.open(jitsiUrl, '_blank');
    } else {
      alert('No hay un enlace de telemedicina registrado para esta cita.');
    }
  };

  if (loading) return <div className="loading-state">Cargando sala de telemedicina...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="agenda-container" style={{ maxWidth: '800px' }}>
      {/* Encabezado */}
      <div className="medico-header" style={{ marginBottom: '28px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={26} color="#2563eb" /> Sala de Telemedicina
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Ingresa a tus consultas virtuales con el equipo médico del CESFAM Purranque.
          </p>
        </div>
      </div>

      {citasVirtuales.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#94a3b8'
          }}>
            <Video size={28} />
          </div>
          <h3 style={{ color: '#1e293b', margin: '0 0 8px 0' }}>Sin Consultas Virtuales Activas</h3>
          <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '400px', margin: '0 auto 24px' }}>
            No registras consultas de telemedicina pendientes para hoy. Recuerda que al agendar una hora puedes seleccionar la modalidad de atención virtual.
          </p>
          <button
            className="btn-primary"
            onClick={() => navigate('/paciente/agenda')}
            style={{ padding: '10px 24px' }}
          >
            Agendar una hora
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {citasVirtuales.map(cita => {
            const citaFecha = (() => {
              try {
                return new Date(cita.fecha_hora.replace(' ', 'T') + ':00');
              } catch {
                return null;
              }
            })();

            const fechaDisplay = (() => {
              try {
                return citaFecha.toLocaleString('es-CL', {
                  weekday: 'long', day: '2-digit',
                  month: 'long', hour: '2-digit', minute: '2-digit'
                });
              } catch { return cita.fecha_hora; }
            })();

            // Regla de negocio: Deshabilitado si faltan más de 15 minutos (omitido en desarrollo para pruebas)
            const diffMs = citaFecha ? citaFecha.getTime() - ahora.getTime() : 0;
            const diffMinutes = diffMs / (1000 * 60);
            const deshabilitado = import.meta.env.DEV ? false : diffMinutes > 15;

            return (
              <div
                key={cita.id_cita}
                style={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  borderLeft: '5px solid #2563eb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {/* Detalles de la cita */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div>
                    <span className="cita-badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 700, display: 'inline-block', marginBottom: '8px' }}>
                      Consulta Virtual
                    </span>
                    <h3 style={{ color: '#1e293b', margin: '0 0 6px 0', fontSize: '1.2rem' }}>{cita.nombre_medico}</h3>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>Especialidad: {cita.especialidad}</p>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={16} color="#64748b" />
                      <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{fechaDisplay}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={16} color="#64748b" />
                      <span>Duración: 30 minutos</span>
                    </div>
                  </div>
                </div>

                {/* Motivo */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  color: '#475569'
                }}>
                  <strong>Motivo de consulta:</strong> {cita.motivo_consulta || 'Control general de salud'}
                </div>

                {/* Estado y Botón de acceso */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '16px',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      className={deshabilitado ? '' : 'chatbot-estado-dot'} 
                      style={{ 
                        backgroundColor: deshabilitado ? '#94a3b8' : '#22c55e', 
                        width: '10px', 
                        height: '10px',
                        borderRadius: '50%'
                      }} 
                    />
                    <span style={{ 
                      fontSize: '0.88rem', 
                      color: deshabilitado ? '#64748b' : '#15803d', 
                      fontWeight: 600, 
                      animation: deshabilitado ? 'none' : 'pulse 2s infinite' 
                    }}>
                      {deshabilitado ? 'Espera programada' : 'Sala de espera activa'}
                    </span>
                  </div>

                  <button
                    className="btn-primary"
                    onClick={() => handleEntrarVideollamada(cita)}
                    disabled={deshabilitado}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 28px',
                      fontSize: '0.95rem',
                      boxShadow: deshabilitado ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.2)',
                      backgroundColor: deshabilitado ? '#94a3b8' : '#2563eb',
                      cursor: deshabilitado ? 'not-allowed' : 'pointer',
                      opacity: deshabilitado ? 0.7 : 1,
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontWeight: 600,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {deshabilitado ? 'Disponible 15 min antes' : <>Ingresar a la Videollamada <ExternalLink size={16} /></>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TelemedicinaPacientePanel;
