import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Video, UserCheck, CheckCircle, X, Loader2, MapPin } from 'lucide-react';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

// Configuración de badges para estado de cita
const ESTADO_BADGES = {
  RESERVADA: { label: 'Pendiente', clase: 'badge-reservada' },
  ATENDIDA: { label: 'Completada', clase: 'badge-atendida' }
};

// ─────────────────────────────────────────────────────────
// Autocompletado Nominatim — restringido a Chile
// ─────────────────────────────────────────────────────────
const DireccionAutocomplete = ({ value, onChange, onCoordChange }) => {
  const [query, setQuery] = useState(value || '');
  const [sugerencias, setSugerencias] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [coordsOk, setCoordsOk] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const buscarDirecciones = useCallback((texto) => {
    if (!texto || texto.trim().length < 3) {
      setSugerencias([]);
      setAbierto(false);
      return;
    }
    setBuscando(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=cl&addressdetails=1&limit=6&q=${encodeURIComponent(texto)}`,
      { headers: { 'Accept-Language': 'es', 'User-Agent': 'CESFAM-Purranque/1.0' } }
    )
      .then(r => r.json())
      .then(data => {
        setSugerencias(Array.isArray(data) ? data : []);
        setAbierto(Array.isArray(data) && data.length > 0);
      })
      .catch(() => { setSugerencias([]); setAbierto(false); })
      .finally(() => setBuscando(false));
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setCoordsOk(false);
    onCoordChange(null, null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscarDirecciones(val), 450);
  };

  const handleSelect = (item) => {
    const nombre = item.display_name;
    setQuery(nombre);
    onChange(nombre);
    onCoordChange(parseFloat(item.lat), parseFloat(item.lon));
    setCoordsOk(true);
    setSugerencias([]);
    setAbierto(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => sugerencias.length > 0 && setAbierto(true)}
          placeholder="Ej: Los Aromos 123, Purranque..."
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: coordsOk ? '10px 36px 10px 12px' : '10px 36px 10px 12px',
            border: `1px solid ${coordsOk ? '#22c55e' : '#cbd5e1'}`,
            borderRadius: '8px', fontSize: '0.9rem', color: '#374151',
            outline: 'none', transition: 'border-color 0.2s',
            background: coordsOk ? '#f0fdf4' : 'white',
          }}
        />
        <span style={{
          position: 'absolute', right: '10px', top: '50%',
          transform: 'translateY(-50%)', fontSize: '0.8rem',
          color: coordsOk ? '#16a34a' : buscando ? '#94a3b8' : '#cbd5e1',
          pointerEvents: 'none',
        }}>
          {buscando ? '⏳' : coordsOk ? '📌' : <MapPin size={14} />}
        </span>
      </div>

      {coordsOk && (
        <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#16a34a', fontWeight: 500 }}>
          ✓ Coordenadas GPS obtenidas — el chofer verá el pin en el mapa
        </p>
      )}

      {abierto && sugerencias.length > 0 && (
        <ul style={{
          position: 'absolute', zIndex: 9999, top: '100%', left: 0, right: 0,
          background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.16)', margin: '4px 0 0',
          padding: 0, listStyle: 'none', maxHeight: '200px', overflowY: 'auto',
        }}>
          {sugerencias.map((item) => (
            <li
              key={item.place_id}
              onMouseDown={() => handleSelect(item)}
              style={{
                padding: '9px 14px', cursor: 'pointer',
                fontSize: '0.83rem', color: '#374151',
                borderBottom: '1px solid #f1f5f9',
                lineHeight: 1.4,
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              📍 {item.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────────────────
const TelemedicinaMedicoPanel = () => {
  const { user } = useAuth();
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados del Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [requiereReceta, setRequiereReceta] = useState(false);
  const [requiereVisita, setRequiereVisita] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('TODAS');
  const [notasClinicas, setNotasClinicas] = useState('');

  const nombreMedico = user?.nombreMostrar || '';
  const navigate = useNavigate();

  useEffect(() => {
    if (nombreMedico) fetchCitas();
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
    const jitsiUrl = cita.enlace_telemedicina || '';
    if (jitsiUrl) {
      window.open(jitsiUrl, '_blank');
    } else {
      alert('No hay un enlace de telemedicina registrado para esta cita.');
    }
  };

  const abrirModalFinalizar = (cita) => {
    setCitaSeleccionada(cita);
    setRequiereReceta(false);
    setRequiereVisita(false);
    setNotasClinicas('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setCitaSeleccionada(null);
  };

  const handleFinalizarAtencion = async (e) => {
    e.preventDefault();
    if (!citaSeleccionada) return;

    if (!notasClinicas.trim()) {
      alert('Por favor, ingresa las Notas Clínicas / Diagnóstico.');
      return;
    }

    try {
      setGuardando(true);

      // 1. Marcar cita como ATENDIDA y guardar notas clínicas
      const atenderResp = await fetch(`${API_URL}/api/citas/atender/${citaSeleccionada.id_cita}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notas_clinicas: notasClinicas.trim() })
      });
      if (!atenderResp.ok) throw new Error('Error al registrar la finalización de la cita');

      // 2. Si se marcó visita domiciliaria, crear orden tipo 'Visita'
      if (requiereVisita) {
        const formData = new FormData();
        formData.append('rut_paciente', citaSeleccionada.rut_paciente);
        formData.append('nombre_paciente', citaSeleccionada.nombre_paciente || '');
        formData.append('tipo', 'Visita');
        formData.append('detalle', `Visita programada al finalizar atención. Notas clínicas: ${notasClinicas.trim()}`);

        const logisticaResp = await fetch(`${API_URL}/api/logistica`, {
          method: 'POST',
          body: formData
        });
        if (!logisticaResp.ok) throw new Error('Error al registrar la orden en logística');
      }

      cerrarModal();
      await fetchCitas();

      // 3. Si se marcó receta, redirigir al panel de receta
      if (requiereReceta) {
        navigate(`/medico/receta?rut=${encodeURIComponent(citaSeleccionada.rut_paciente)}`);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  };


  const pendientes = citas.filter(c => c.estado === 'RESERVADA').length;
  const completadas = citas.filter(c => c.estado === 'ATENDIDA').length;

  const citasFiltradas = citas.filter(cita => {
    if (filtroTipo === 'PRESENCIAL') return cita.tipo_cita !== 'Telemedicina';
    if (filtroTipo === 'TELEMEDICINA') return cita.tipo_cita === 'Telemedicina';
    return true;
  });

  if (loading) return <div className="loading-state">Cargando consultas clínicas...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="agenda-container">
      {/* Encabezado */}
      <div className="medico-header">
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={24} color="#2563eb" /> Atención y Telemedicina
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>{nombreMedico}</p>
        </div>
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

      {/* Filtros */}
      <div className="medico-filtros">
        {[
          { id: 'TODAS', label: 'Todas' },
          { id: 'PRESENCIAL', label: 'Solo Presenciales' },
          { id: 'TELEMEDICINA', label: 'Solo Telemedicina' }
        ].map(f => (
          <button
            key={f.id}
            className={`filtro-tab ${filtroTipo === f.id ? 'filtro-tab-active' : ''}`}
            onClick={() => setFiltroTipo(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {citasFiltradas.length === 0 ? (
        <div className="empty-state">No registras citas con el filtro seleccionado.</div>
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
              {citasFiltradas.map(cita => {
                const badge = ESTADO_BADGES[cita.estado] || { label: cita.estado, clase: 'badge-disponible' };
                const isTelemedicina = cita.tipo_cita === 'Telemedicina';
                const fechaDisplay = (() => {
                  try {
                    return new Date(cita.fecha_hora.replace(' ', 'T') + ':00')
                      .toLocaleString('es-CL', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                  } catch { return cita.fecha_hora; }
                })();

                return (
                  <tr key={cita.id_cita} className={cita.estado === 'ATENDIDA' ? 'fila-atendida' : ''}>
                    <td><span style={{ fontWeight: 600, color: '#1e293b' }}>{fechaDisplay}</span></td>
                    <td>{cita.nombre_paciente || '—'}</td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{cita.rut_paciente || '—'}</td>
                    <td>
                      {isTelemedicina
                        ? <span className="cita-badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>Telemedicina</span>
                        : <span className="cita-badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600 }}>Presencial</span>
                      }
                    </td>
                    <td><span className={`cita-badge ${badge.clase}`}>{badge.label}</span></td>
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
          <div
            className="modal-content"
            style={{ maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Finalizar Atención Clínica</h3>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div className="modal-resumen" style={{ fontSize: '0.85rem' }}>
              <div className="modal-resumen-row"><span>Paciente:</span><strong>{citaSeleccionada.nombre_paciente}</strong></div>
              <div className="modal-resumen-row"><span>RUT:</span><strong>{citaSeleccionada.rut_paciente}</strong></div>
              <div className="modal-resumen-row"><span>Modalidad:</span><strong>{citaSeleccionada.tipo_cita}</strong></div>
            </div>

            <form onSubmit={handleFinalizarAtencion}>
              {/* Notas Clínicas */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                  Notas Clínicas / Diagnóstico <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  placeholder="Escribe el diagnóstico, indicaciones o prescripción médica de la atención..."
                  value={notasClinicas}
                  onChange={(e) => setNotasClinicas(e.target.value)}
                  required
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 12px', border: '1px solid #cbd5e1',
                    borderRadius: '8px', fontSize: '0.9rem', minHeight: '110px',
                    resize: 'vertical', fontFamily: 'inherit', color: '#374151',
                  }}
                />
              </div>

              {/* Decisiones Clínicas (Checkboxes) */}
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: '10px', padding: '14px', marginBottom: '20px',
                display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Decisiones Clínicas Posteriores
                </span>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={requiereReceta}
                    onChange={() => setRequiereReceta(v => !v)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                  />
                  El paciente requiere emisión de Receta Médica
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={requiereVisita}
                    onChange={() => setRequiereVisita(v => !v)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                  />
                  Programar Visita Domiciliaria (Procedimiento en casa)
                </label>
              </div>

              {/* Botones */}
              <div className="modal-actions" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
                <button type="button" className="btn-secondary" onClick={cerrarModal} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={guardando} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {guardando ? <><Loader2 size={16} className="spin" /> Guardando...</> : '✓ Confirmar e Ir al Cierre'}
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
