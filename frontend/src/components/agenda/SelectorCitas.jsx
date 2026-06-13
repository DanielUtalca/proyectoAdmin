import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────
// Bloques horarios: 09:00-13:30 y 15:00-16:30
// cada 30 minutos. El bloque 14:00-14:30 es
// colación y no se genera.
// ─────────────────────────────────────────────
const ALL_SLOTS = [];
for (let h = 9; h < 14; h++) {
  ALL_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  ALL_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}
for (let h = 15; h < 17; h++) {
  ALL_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  ALL_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

const SelectorCitas = ({ onCitaAgendada }) => {
  const { user } = useAuth();

  // ── Estado: Médicos ──────────────────────────
  const [medicos, setMedicos] = useState([]);
  const [cargandoMedicos, setCargandoMedicos] = useState(true);

  // ── Estado: Filtros ──────────────────────────
  const [especialidadSel, setEspecialidadSel] = useState('');
  const [medicoSel, setMedicoSel] = useState('');

  // ── Estado: Calendario ───────────────────────
  const ahora = new Date();
  const [calYear, setCalYear] = useState(ahora.getFullYear());
  const [calMonth, setCalMonth] = useState(ahora.getMonth()); // 0-11
  const [fechaSel, setFechaSel] = useState(null); // "YYYY-MM-DD"

  // ── Estado: Slots ────────────────────────────
  const [ocupadas, setOcupadas] = useState([]);
  const [cargandoSlots, setCargandoSlots] = useState(false);

  // ── Estado: Modal ────────────────────────────
  const [slotSel, setSlotSel] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [tipoCita, setTipoCita] = useState('Presencial');

  // ── Cargar médicos al montar ─────────────────
  useEffect(() => {
    fetch(`${API_URL}/api/medicos`)
      .then(r => r.json())
      .then(data => { setMedicos(data); setCargandoMedicos(false); })
      .catch(() => setCargandoMedicos(false));
  }, []);

  // ── Cuando cambia médico o fecha → cargar ocupadas ─
  useEffect(() => {
    if (!medicoSel || !fechaSel) { setOcupadas([]); return; }
    setCargandoSlots(true);
    fetch(`${API_URL}/api/citas/ocupadas?medico=${encodeURIComponent(medicoSel)}&fecha=${fechaSel}`)
      .then(r => r.json())
      .then(data => { setOcupadas(data.ocupadas || []); setCargandoSlots(false); })
      .catch(() => setCargandoSlots(false));
  }, [medicoSel, fechaSel]);

  // ── Datos derivados ──────────────────────────
  const especialidades = [...new Set(medicos.map(m => m.especialidad))];
  const medicosFiltrados = especialidadSel
    ? medicos.filter(m => m.especialidad === especialidadSel)
    : medicos;

  // ── Lógica del calendario ────────────────────
  const getDiasDelMes = () => {
    const primerDia = new Date(calYear, calMonth, 1);
    const totalDias = new Date(calYear, calMonth + 1, 0).getDate();
    // Ajustar para que semana empiece en Lunes (0=Lun...6=Dom)
    let offset = primerDia.getDay() - 1;
    if (offset < 0) offset = 6;
    const dias = [];
    for (let i = 0; i < offset; i++) dias.push(null);
    for (let d = 1; d <= totalDias; d++) dias.push(d);
    return dias;
  };

  const isPasado = (d) => {
    const fecha = new Date(calYear, calMonth, d);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return fecha < hoy;
  };
  const isFinde = (d) => {
    if (import.meta.env.DEV) return false;
    const dow = new Date(calYear, calMonth, d).getDay();
    return dow === 0 || dow === 6;
  };
  const isHoy = (d) => {
    const t = new Date();
    return d === t.getDate() && calMonth === t.getMonth() && calYear === t.getFullYear();
  };

  const handleDiaClick = (d) => {
    if (!d || isPasado(d) || isFinde(d)) return;
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    setFechaSel(`${calYear}-${mm}-${dd}`);
    setSlotSel(null);
  };

  const prevMes = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
    setFechaSel(null);
  };
  const nextMes = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
    setFechaSel(null);
  };

  const fechaFormateada = fechaSel
    ? new Date(fechaSel + 'T00:00:00').toLocaleDateString('es-CL', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      })
    : '';

  // ── Confirmar agendamiento ───────────────────
  const handleAgendar = async (e) => {
    e.preventDefault();
    if (!motivo.trim()) return;

    const especialidad = medicos.find(m => m.nombre_completo === medicoSel)?.especialidad || '';
    const fecha_hora = `${fechaSel} ${slotSel}`;

    try {
      setProcesando(true);
      const resp = await fetch(`${API_URL}/api/citas/agendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut_paciente: user.rut,
          nombre_paciente: user.nombreMostrar || 'Paciente',
          especialidad,
          nombre_medico: medicoSel,
          fecha_hora,
          motivo_consulta: motivo,
          prioridad: 'NORMAL',
          tipo_cita: tipoCita
        })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || 'Error al agendar la cita');
      }

      // Actualizar localmente el slot como ocupado
      setOcupadas(prev => [...prev, slotSel]);
      setSlotSel(null);
      setMotivo('');
      alert('¡Cita agendada exitosamente!');
      if (onCitaAgendada) onCitaAgendada();

    } catch (err) {
      alert(err.message);
      // Recargar ocupadas por si hubo race condition
      if (medicoSel && fechaSel) {
        fetch(`${API_URL}/api/citas/ocupadas?medico=${encodeURIComponent(medicoSel)}&fecha=${fechaSel}`)
          .then(r => r.json())
          .then(data => setOcupadas(data.ocupadas || []));
      }
    } finally {
      setProcesando(false);
    }
  };

  // ── Render ───────────────────────────────────
  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>Agendar Nueva Cita</h2>

      {/* ── PASO 1: Especialidad y Médico ── */}
      <div className="agenda-filtros">
        <div className="filtro-grupo">
          <label>1. Elige una especialidad</label>
          <select
            value={especialidadSel}
            onChange={e => {
              setEspecialidadSel(e.target.value);
              setMedicoSel('');
              setFechaSel(null);
            }}
            disabled={cargandoMedicos}
          >
            <option value="">— Selecciona especialidad —</option>
            {especialidades.map(esp => (
              <option key={esp} value={esp}>{esp}</option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo">
          <label>2. Elige un médico</label>
          <select
            value={medicoSel}
            onChange={e => { setMedicoSel(e.target.value); setFechaSel(null); }}
            disabled={!especialidadSel}
          >
            <option value="">— Selecciona médico —</option>
            {medicosFiltrados.map(m => (
              <option key={m.nombre_completo} value={m.nombre_completo}>
                {m.nombre_completo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── PASO 2 & 3: Calendario + Slots ── */}
      {medicoSel && (
        <div className="calendario-layout">
          {/* Calendario */}
          <div className="calendario">
            <div className="cal-header">
              <button className="cal-nav" onClick={prevMes}>‹</button>
              <span className="cal-mes-label">{MESES[calMonth]} {calYear}</span>
              <button className="cal-nav" onClick={nextMes}>›</button>
            </div>

            <div className="cal-grid">
              {/* Cabeceras de días */}
              {DIAS_SEMANA.map(d => (
                <div key={d} className="cal-dia-nombre">{d}</div>
              ))}

              {/* Días del mes */}
              {getDiasDelMes().map((d, i) => {
                if (!d) return <div key={`empty-${i}`} className="cal-dia-vacio" />;
                const mm = String(calMonth + 1).padStart(2, '0');
                const dd = String(d).padStart(2, '0');
                const dateStr = `${calYear}-${mm}-${dd}`;
                const deshabilitado = isPasado(d) || isFinde(d);
                const seleccionado = fechaSel === dateStr;
                return (
                  <div
                    key={d}
                    onClick={() => handleDiaClick(d)}
                    className={[
                      'cal-dia',
                      deshabilitado ? 'cal-dia-disabled' : 'cal-dia-activo',
                      isHoy(d) ? 'cal-dia-hoy' : '',
                      seleccionado ? 'cal-dia-selected' : '',
                    ].join(' ')}
                  >
                    {d}
                  </div>
                );
              })}
            </div>

            <div className="cal-leyenda">
              <span className="leyenda-item"><span className="leyenda-dot dot-libre" />Hoy</span>
              <span className="leyenda-item"><span className="leyenda-dot dot-selected" />Seleccionado</span>
              <span className="leyenda-item"><span className="leyenda-dot dot-disabled" />No disponible</span>
            </div>
          </div>

          {/* Slots horarios */}
          <div className="slots-panel">
            {!fechaSel ? (
              <div className="slots-placeholder">
                <span>📅</span>
                <p>Selecciona un día en el calendario para ver los horarios disponibles</p>
              </div>
            ) : (
              <>
                <h4 className="slots-titulo">
                  Horarios disponibles
                  <span className="slots-fecha">{fechaFormateada}</span>
                </h4>

                <div className="slots-colacion-aviso">
                  🍽 Bloque 14:00–15:00 reservado para colación
                </div>

                {cargandoSlots ? (
                  <p style={{ color: '#64748b', padding: '10px 0' }}>Verificando disponibilidad...</p>
                ) : (
                  <div className="slots-grid">
                    {ALL_SLOTS.map(slot => {
                      const ocupado = ocupadas.includes(slot);
                      return (
                        <button
                          key={slot}
                          className={[
                            'slot-btn',
                            ocupado ? 'slot-ocupado' : 'slot-libre',
                            slotSel === slot ? 'slot-selected' : ''
                          ].join(' ')}
                          onClick={() => !ocupado && setSlotSel(slot)}
                          disabled={ocupado}
                          title={ocupado ? 'Hora no disponible' : `Reservar ${slot}`}
                        >
                          {slot}
                          {ocupado && <span className="slot-ocupado-tag">Ocupado</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL de confirmación ── */}
      {slotSel && (
        <div className="modal-overlay" onClick={() => setSlotSel(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Confirmar Reserva de Hora</h3>
            <div className="modal-resumen">
              <div className="modal-resumen-row"><strong>Médico:</strong><span>{medicoSel}</span></div>
              <div className="modal-resumen-row"><strong>Fecha:</strong><span>{fechaFormateada}</span></div>
              <div className="modal-resumen-row"><strong>Hora:</strong><span>{slotSel} (duración 30 min.)</span></div>
            </div>

            <form onSubmit={handleAgendar}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>
                  Modalidad de atención:
                </label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="tipoCita"
                      value="Presencial"
                      checked={tipoCita === 'Presencial'}
                      onChange={() => setTipoCita('Presencial')}
                    />
                    Presencial
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="tipoCita"
                      value="Telemedicina"
                      checked={tipoCita === 'Telemedicina'}
                      onChange={() => setTipoCita('Telemedicina')}
                    />
                    Telemedicina (Virtual)
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>
                  Motivo de la consulta:
                </label>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Ej: Dolor de cabeza frecuente, control de presión, revisión general..."
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setSlotSel(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={procesando}>
                  {procesando ? 'Agendando...' : '✓ Confirmar Hora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectorCitas;
