import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

// Badge visual por estado
const BADGE_CONFIG = {
  RESERVADA: { label: 'Reservada', clase: 'badge-reservada' },
  ATENDIDA:  { label: 'Atendida',  clase: 'badge-atendida'  },
};

// ─────────────────────────────────────────────────────────
// Modal: Finalizar Atención
// ─────────────────────────────────────────────────────────
const ModalFinalizarAtencion = ({ cita, onClose, onConfirm }) => {
  const navigate = useNavigate();
  const [notasClinicas, setNotasClinicas] = useState('');
  const [requiereReceta, setRequiereReceta] = useState(false);
  const [requiereVisita, setRequiereVisita] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!notasClinicas.trim()) {
      alert('Por favor, ingresa las Notas Clínicas / Diagnóstico de la atención.');
      return;
    }
    
    setProcesando(true);

    try {
      // 1. Marcar cita como ATENDIDA y guardar notas clínicas
      const respCita = await fetch(`${API_URL}/api/citas/atender/${cita.id_cita}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notas_clinicas: notasClinicas.trim() }),
      });
      if (!respCita.ok) throw new Error('Error al marcar la cita como atendida');

      // 2. Si se marcó visita domiciliaria, crear orden tipo 'Visita'
      if (requiereVisita) {
        const formData = new FormData();
        formData.append('rut_paciente', cita.rut_paciente || '');
        formData.append('nombre_paciente', cita.nombre_paciente || '');
        formData.append('tipo', 'Visita');
        formData.append('detalle', `Visita programada al finalizar atención. Notas clínicas: ${notasClinicas.trim()}`);
        // La dirección se autocompletará en el backend desde el perfil del paciente

        const respLog = await fetch(`${API_URL}/api/logistica`, {
          method: 'POST',
          body: formData,
        });
        if (!respLog.ok) throw new Error('Error al programar la visita domiciliaria');
      }

      onConfirm(); // Recarga la agenda

      // 3. Si se marcó receta, redirigir al panel de receta
      if (requiereReceta) {
        navigate(`/medico/receta?rut=${encodeURIComponent(cita.rut_paciente)}`);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '480px' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: '6px' }}>📋 Finalizar Atención Clínica</h3>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '20px' }}>
          Paciente: <strong>{cita.nombre_paciente || cita.rut_paciente}</strong>
        </p>

        <form onSubmit={handleConfirm}>
          {/* Notas Clínicas */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
              Notas Clínicas / Diagnóstico <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              placeholder="Registra el diagnóstico, anamnesis e indicaciones del paciente..."
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

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={procesando}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={procesando}>
              {procesando ? 'Guardando...' : '✓ Confirmar e Ir al Cierre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Componente Principal: Agenda del Médico
// ─────────────────────────────────────────────────────────
const AgendaMedicoPanel = () => {
  const { user } = useAuth();
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('TODAS');
  const [citaModal, setCitaModal] = useState(null); // cita seleccionada para el modal

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

  const citasFiltradas = filtro === 'TODAS'
    ? citas
    : citas.filter(c => c.estado === filtro);

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

      {/* Filtros */}
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
                          onClick={() => setCitaModal(cita)}
                        >
                          📋 Finalizar Atención
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

      {/* Modal Finalizar Atención */}
      {citaModal && (
        <ModalFinalizarAtencion
          cita={citaModal}
          onClose={() => setCitaModal(null)}
          onConfirm={() => {
            setCitaModal(null);
            fetchCitas();
          }}
        />
      )}
    </div>
  );
};

export default AgendaMedicoPanel;
