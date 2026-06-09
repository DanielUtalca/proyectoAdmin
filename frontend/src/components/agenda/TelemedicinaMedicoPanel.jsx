import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Video, UserCheck, CheckCircle, X, Loader2 } from 'lucide-react';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

// Configuración de badges para estado de cita
const ESTADO_BADGES = {
  RESERVADA: { label: 'Pendiente', clase: 'badge-reservada' },
  ATENDIDA: { label: 'Completada', clase: 'badge-atendida' }
};

const TelemedicinaMedicoPanel = () => {
  const { user } = useAuth();
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados de control para el Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [accionTipo, setAccionTipo] = useState('ALTA'); // 'ALTA' o 'LOGISTICA'
  const [logisticaTipo, setLogisticaTipo] = useState('Despacho'); // 'Despacho' o 'Visita'
  const [direccion, setDireccion] = useState('');
  const [detalle, setDetalle] = useState('');
  const [guardando, setGuardando] = useState(false);

  const nombreMedico = user?.nombreMostrar || '';

  useEffect(() => {
    if (nombreMedico) {
      fetchCitas();
    }
  }, [nombreMedico]);

  const fetchCitas = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch(
        `${API_URL}/api/citas/mi-agenda-medico/${encodeURIComponent(nombreMedico)}`
      );
      if (!resp.ok) throw new Error('Error al cargar la agenda de telemedicina');
      const data = await resp.json();
      setCitas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarVideollamada = (cita) => {
    // Sanitizamos el RUT del paciente para formar un nombre de sala de Jitsi válido (solo alfanuméricos, guión y guión bajo)
    const cleanRut = (cita.rut_paciente || 'paciente').replace(/[^a-zA-Z0-9-_]/g, '');
    const jitsiUrl = `https://meet.jit.si/cesfam-telemedicina-${cleanRut}`;
    window.open(jitsiUrl, '_blank');
  };

  const abrirModalFinalizar = (cita) => {
    setCitaSeleccionada(cita);
    setAccionTipo('ALTA');
    setLogisticaTipo('Despacho');
    setDireccion('');
    setDetalle('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setCitaSeleccionada(null);
  };

  const handleFinalizarAtencion = async (e) => {
    e.preventDefault();
    if (!citaSeleccionada) return;

    try {
      setGuardando(true);

      // Si el médico seleccionó generar una orden de despacho o visita
      if (accionTipo === 'LOGISTICA') {
        if (!direccion.trim()) {
          alert('Por favor, ingresa la dirección para la logística.');
          setGuardando(false);
          return;
        }

        const logisticaResp = await fetch(`${API_URL}/api/logistica`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rut_paciente: citaSeleccionada.rut_paciente,
            nombre_paciente: citaSeleccionada.nombre_paciente,
            tipo: logisticaTipo,
            direccion: direccion.trim(),
            detalle: detalle.trim() || null
          })
        });

        if (!logisticaResp.ok) throw new Error('Error al registrar la orden en logística');
      }

      // Marcar la cita como Atendida/Completada
      const atenderResp = await fetch(`${API_URL}/api/citas/atender/${citaSeleccionada.id_cita}`, {
        method: 'PUT'
      });

      if (!atenderResp.ok) throw new Error('Error al registrar la finalización de la cita');

      cerrarModal();
      await fetchCitas();
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const pendientes = citas.filter(c => c.estado === 'RESERVADA').length;
  const completadas = citas.filter(c => c.estado === 'ATENDIDA').length;

  if (loading) return <div className="loading-state">Cargando consultas clínicas...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="agenda-container">
      {/* Encabezado del Panel */}
      <div className="medico-header">
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={24} color="#2563eb" /> Atención y Telemedicina
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>{nombreMedico}</p>
        </div>
        {/* KPIs Rápidos */}
        <div className="medico-kpis">
          <div className="kpi-card kpi-reservadas">
            <span className="kpi-num">{pendientes}</span>
            <span className="kpi-label">Pendientes</span>
          </div>
          <div className="kpi-card kpi-atendidas">
            <span className="kpi-num">{completadas}</span>
            <span className="kpi-label">Atendidas</span>
          </div>
        </div>
      </div>

      {/* Listado de Pacientes */}
      {citas.length === 0 ? (
        <div className="empty-state">
          No registras citas para el día de hoy.
        </div>
      ) : (
        <div className="tabla-medico-wrapper">
          <table className="tabla-medico">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Paciente</th>
                <th>RUT</th>
                <th>Modalidad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {citas.map(cita => {
                const badge = ESTADO_BADGES[cita.estado] || { label: cita.estado, clase: 'badge-disponible' };
                const isTelemedicina = cita.tipo_cita === 'Telemedicina';
                
                // Formateador de fecha amigable para el doctor
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
                    <td>
                      {isTelemedicina ? (
                        <span className="cita-badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                          Telemedicina
                        </span>
                      ) : (
                        <span className="cita-badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                          Presencial
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`cita-badge ${badge.clase}`}>{badge.label}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {cita.estado === 'RESERVADA' && (
                          <>
                            {isTelemedicina && (
                              <button
                                className="btn-primary"
                                onClick={() => handleIniciarVideollamada(cita)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.82rem' }}
                              >
                                <Video size={14} /> Iniciar Videollamada
                              </button>
                            )}
                            <button
                              className="btn-atender"
                              onClick={() => abrirModalFinalizar(cita)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <UserCheck size={14} /> Finalizar Atención
                            </button>
                          </>
                        )}
                        {cita.estado === 'ATENDIDA' && (
                          <span className="atendida-check" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Completada
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL FINALIZAR ATENCIÓN ── */}
      {modalAbierto && citaSeleccionada && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Finalizar Atención Clínica</h3>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', marginLeft: 'auto' }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div className="modal-resumen" style={{ fontSize: '0.85rem' }}>
              <div className="modal-resumen-row">
                <span>Paciente:</span>
                <strong>{citaSeleccionada.nombre_paciente}</strong>
              </div>
              <div className="modal-resumen-row">
                <span>RUT:</span>
                <strong>{citaSeleccionada.rut_paciente}</strong>
              </div>
              <div className="modal-resumen-row">
                <span>Modalidad:</span>
                <strong>{citaSeleccionada.tipo_cita}</strong>
              </div>
            </div>

            <form onSubmit={handleFinalizarAtencion}>
              {/* Selección de Acción */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                  Acción clínica para el alta:
                </label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="accionTipo"
                      value="ALTA"
                      checked={accionTipo === 'ALTA'}
                      onChange={() => setAccionTipo('ALTA')}
                    />
                    Alta clínica regular
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="accionTipo"
                      value="LOGISTICA"
                      checked={accionTipo === 'LOGISTICA'}
                      onChange={() => setAccionTipo('LOGISTICA')}
                    />
                    Generar Orden de Logística
                  </label>
                </div>
              </div>

              {/* Campos dinámicos si se elige Logística */}
              {accionTipo === 'LOGISTICA' && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  
                  {/* Tipo de orden */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Tipo de Cuidado/Logística
                    </label>
                    <select
                      value={logisticaTipo}
                      onChange={(e) => setLogisticaTipo(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        background: 'white'
                      }}
                    >
                      <option value="Despacho">Despacho de Medicamentos</option>
                      <option value="Visita">Visita Domiciliaria</option>
                    </select>
                  </div>

                  {/* Dirección */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Dirección de Destino
                    </label>
                    <input
                      type="text"
                      placeholder="Dirección del domicilio del paciente"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '10px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  {/* Detalle o Receta */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Detalle / Receta de Fármacos o Indicaciones de Visita
                    </label>
                    <textarea
                      placeholder={logisticaTipo === 'Despacho' ? 'Ej. Paracetamol 500mg (2 cajas), Losartán 50mg (1 caja)' : 'Ej. Control de signos vitales, curación de herida operatoria.'}
                      value={detalle}
                      onChange={(e) => setDetalle(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="modal-actions" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
                <button type="button" className="btn-secondary" onClick={cerrarModal} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={guardando} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {guardando ? (
                    <>
                      <Loader2 size={16} className="spin" /> Guardando...
                    </>
                  ) : (
                    'Finalizar y Cerrar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelemedicinaMedicoPanel;
