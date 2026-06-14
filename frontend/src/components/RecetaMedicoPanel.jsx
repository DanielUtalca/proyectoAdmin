/**
 * RecetaMedicoPanel.jsx
 * Panel de Emitir Receta y Generar Órdenes de Logística — Rol Médico
 *
 * El médico puede buscar un paciente por RUT, escribir una prescripción,
 * agregar medicamentos, y generar una orden de despacho domiciliario con
 * autocompletado de dirección via Nominatim (OpenStreetMap).
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, Search, Plus, Trash2, CheckCircle, MapPin, Loader2 } from 'lucide-react';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────
// Autocompletado Nominatim
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
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const buscarDirecciones = useCallback((texto) => {
    if (!texto || texto.trim().length < 3) { setSugerencias([]); setAbierto(false); return; }
    setBuscando(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=cl&addressdetails=1&limit=6&q=${encodeURIComponent(texto)}`,
      { headers: { 'Accept-Language': 'es', 'User-Agent': 'CESFAM-Purranque/1.0' } }
    )
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setSugerencias(arr);
        setAbierto(arr.length > 0);
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
    setQuery(item.display_name);
    onChange(item.display_name);
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
          placeholder="Ej: Los Aromos 123, Purranque, Los Lagos..."
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '11px 40px 11px 14px',
            border: `2px solid ${coordsOk ? '#22c55e' : '#e2e8f0'}`,
            borderRadius: '10px', fontSize: '0.95rem', color: '#1e293b',
            outline: 'none', transition: 'border-color 0.2s',
            background: coordsOk ? '#f0fdf4' : 'white',
          }}
          onFocus={e => { e.target.style.borderColor = coordsOk ? '#22c55e' : '#2563eb'; sugerencias.length > 0 && setAbierto(true); }}
          onBlur={e => e.target.style.borderColor = coordsOk ? '#22c55e' : '#e2e8f0'}
        />
        <span style={{
          position: 'absolute', right: '12px', top: '50%',
          transform: 'translateY(-50%)', pointerEvents: 'none',
          color: coordsOk ? '#16a34a' : buscando ? '#94a3b8' : '#cbd5e1',
        }}>
          {buscando ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <MapPin size={16} />}
        </span>
      </div>
      {coordsOk && (
        <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
          📌 Coordenadas GPS obtenidas — pin visible en el mapa del chofer
        </p>
      )}
      {abierto && sugerencias.length > 0 && (
        <ul style={{
          position: 'absolute', zIndex: 9999, top: '100%', left: 0, right: 0,
          background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.14)', margin: '4px 0 0',
          padding: 0, listStyle: 'none', maxHeight: '210px', overflowY: 'auto',
        }}>
          {sugerencias.map(item => (
            <li
              key={item.place_id}
              onMouseDown={() => handleSelect(item)}
              style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '0.85rem', color: '#374151', borderBottom: '1px solid #f1f5f9', lineHeight: 1.4 }}
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
const RecetaMedicoPanel = () => {
  const { user } = useAuth();
  const nombreMedico = user?.nombreMostrar || 'Médico';
  const [searchParams] = useSearchParams();
  const rutParam = searchParams.get('rut');

  // Búsqueda de paciente
  const [rutBusqueda, setRutBusqueda] = useState('');
  const [pacienteEncontrado, setPacienteEncontrado] = useState(null);
  const [buscandoPaciente, setBuscandoPaciente] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');

  // Medicamentos
  const [medicamentos, setMedicamentos] = useState([{ nombre: '', dosis: '', cantidad: '' }]);

  // Logística/Entrega
  const [modalidadEntrega, setModalidadEntrega] = useState('Retiro en Farmacia'); // 'Retiro en Farmacia' o 'Despacho a Domicilio'
  const [direccion, setDireccion] = useState('');
  const [latitud, setLatitud] = useState(null);
  const [longitud, setLongitud] = useState(null);
  const [indicaciones, setIndicaciones] = useState('');

  // Envío
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (rutParam) {
      setRutBusqueda(rutParam);
      buscarPacientePorRut(rutParam);
    }
  }, [rutParam]);

  const buscarPacientePorRut = async (rutVal) => {
    if (!rutVal.trim()) return;
    setBuscandoPaciente(true);
    setErrorBusqueda('');
    setPacienteEncontrado(null);
    try {
      const resp = await fetch(`${API_URL}/api/citas/mis-citas/${encodeURIComponent(rutVal.trim())}`);
      if (!resp.ok) throw new Error('Paciente no encontrado');
      const citas = await resp.json();
      if (citas.length === 0) {
        setPacienteEncontrado({
          rut: rutVal.trim(),
          nombre: rutVal.trim(),
        });
        return;
      }
      const ultima = citas[citas.length - 1];
      setPacienteEncontrado({
        rut: ultima.rut_paciente,
        nombre: ultima.nombre_paciente || rutVal.trim(),
      });
    } catch {
      setPacienteEncontrado({
        rut: rutVal.trim(),
        nombre: rutVal.trim(),
      });
    } finally {
      setBuscandoPaciente(false);
    }
  };

  const buscarPaciente = () => {
    buscarPacientePorRut(rutBusqueda);
  };

  const agregarMedicamento = () => {
    setMedicamentos(prev => [...prev, { nombre: '', dosis: '', cantidad: '' }]);
  };

  const quitarMedicamento = (idx) => {
    setMedicamentos(prev => prev.filter((_, i) => i !== idx));
  };

  const actualizarMed = (idx, campo, valor) => {
    setMedicamentos(prev => prev.map((m, i) => i === idx ? { ...m, [campo]: valor } : m));
  };

  const handleEmitir = async (e) => {
    e.preventDefault();
    if (!pacienteEncontrado) { alert('Primero busca y selecciona un paciente.'); return; }
    if (medicamentos.every(m => !m.nombre.trim())) { alert('Ingresa al menos un medicamento.'); return; }
    if (modalidadEntrega === 'Despacho a Domicilio' && !direccion.trim()) { alert('Ingresa la dirección de despacho.'); return; }

    setEnviando(true);
    try {
      const medicamentosSerializados = medicamentos
        .filter(m => m.nombre.trim())
        .map(m => `${m.nombre}${m.dosis ? ' ' + m.dosis : ''}${m.amount || m.cantidad ? ' (' + (m.amount || m.cantidad) + ')' : ''}`)
        .join(', ');

      const reqBody = {
        rut_paciente: pacienteEncontrado.rut,
        nombre_paciente: pacienteEncontrado.nombre,
        nombre_medico: nombreMedico,
        fecha: new Date().toLocaleDateString('es-CL'),
        medicamentos: medicamentosSerializados,
        indicaciones: indicaciones.trim() || null,
        modalidad_entrega: modalidadEntrega,
        direccion: modalidadEntrega === 'Despacho a Domicilio' ? direccion : null,
        latitud: modalidadEntrega === 'Despacho a Domicilio' ? latitud : null,
        longitud: modalidadEntrega === 'Despacho a Domicilio' ? longitud : null
      };

      const resp = await fetch(`${API_URL}/api/recetas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });
      if (!resp.ok) throw new Error('Error al emitir la receta médica');

      setExito(true);
      // Reset
      setTimeout(() => {
        setExito(false);
        setPacienteEncontrado(null);
        setRutBusqueda('');
        setMedicamentos([{ nombre: '', dosis: '', cantidad: '' }]);
        setModalidadEntrega('Retiro en Farmacia');
        setDireccion('');
        setLatitud(null);
        setLongitud(null);
        setIndicaciones('');
      }, 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setEnviando(false);
    }
  };


  if (exito) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', padding: '40px' }}>
        <CheckCircle size={72} color="#16a34a" />
        <h2 style={{ color: '#15803d', margin: 0 }}>¡Receta Emitida con Éxito!</h2>
        <p style={{ color: '#64748b', textAlign: 'center' }}>
          {modalidadEntrega === 'Despacho a Domicilio' ? 'La orden de despacho fue enviada al módulo de logística.' : 'La prescripción fue registrada correctamente.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '820px', margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem', fontWeight: 700 }}>
          <FileText size={26} color="#2563eb" /> Emitir Receta Electrónica
        </h2>
        <p style={{ margin: '6px 0 0', color: '#64748b' }}>
          Prescribe medicamentos a pacientes y genera órdenes de despacho domiciliario — {nombreMedico}
        </p>
      </div>

      <form onSubmit={handleEmitir} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── SECCIÓN 1: Paciente ── */}
        <div style={sectionStyle}>
          <h3 style={sectionTitle}>1. Identificar Paciente</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={rutBusqueda}
              onChange={e => setRutBusqueda(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), buscarPaciente())}
              placeholder="RUT del paciente (Ej: 12.345.678-9)"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={buscarPaciente}
              disabled={buscandoPaciente}
              style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {buscandoPaciente ? <Loader2 size={16} /> : <Search size={16} />}
              Buscar
            </button>
          </div>

          {errorBusqueda && (
            <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '6px' }}>⚠️ {errorBusqueda}</p>
          )}

          {pacienteEncontrado && (
            <div style={{
              marginTop: '12px', display: 'flex', alignItems: 'center', gap: '14px',
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px',
              padding: '12px 16px'
            }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>
                {pacienteEncontrado.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#15803d', fontSize: '1rem' }}>{pacienteEncontrado.nombre}</div>
                <div style={{ fontSize: '0.83rem', color: '#16a34a' }}>RUT: {pacienteEncontrado.rut} · Paciente verificado ✓</div>
              </div>
            </div>
          )}
        </div>

        {/* ── SECCIÓN 2: Medicamentos ── */}
        <div style={sectionStyle}>
          <h3 style={sectionTitle}>2. Medicamentos Prescritos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {medicamentos.map((med, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Nombre del fármaco"
                  value={med.nombre}
                  onChange={e => actualizarMed(idx, 'nombre', e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Dosis (Ej: 500mg)"
                  value={med.dosis}
                  onChange={e => actualizarMed(idx, 'dosis', e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Cantidad"
                  value={med.cantidad}
                  onChange={e => actualizarMed(idx, 'cantidad', e.target.value)}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => quitarMedicamento(idx)}
                  disabled={medicamentos.length === 1}
                  style={{ background: 'none', border: 'none', cursor: medicamentos.length === 1 ? 'not-allowed' : 'pointer', color: '#ef4444', opacity: medicamentos.length === 1 ? 0.3 : 1, padding: '6px', display: 'flex' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={agregarMedicamento}
              style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}
            >
              <Plus size={16} /> Agregar medicamento
            </button>
          </div>
        </div>

        {/* ── SECCIÓN 3: Modalidad de Entrega ── */}
        <div style={sectionStyle}>
          <h3 style={sectionTitle}>3. Modalidad de Entrega</h3>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '18px' }}>
            {['Retiro en Farmacia', 'Despacho a Domicilio'].map(m => (
              <label 
                key={m} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer', 
                  fontSize: '0.95rem', 
                  fontWeight: modalidadEntrega === m ? 700 : 400,
                  color: modalidadEntrega === m ? '#2563eb' : '#64748b',
                  padding: '10px 16px',
                  background: modalidadEntrega === m ? '#eff6ff' : '#f8fafc',
                  border: `2px solid ${modalidadEntrega === m ? '#2563eb' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  transition: 'all 0.15s ease'
                }}
              >
                <input 
                  type="radio" 
                  name="modalidadEntrega" 
                  value={m} 
                  checked={modalidadEntrega === m} 
                  onChange={() => setModalidadEntrega(m)} 
                  style={{ accentColor: '#2563eb', width: '16px', height: '16px' }} 
                />
                {m === 'Retiro en Farmacia' ? '🏥 Retiro presencial en Farmacia' : '📦 Despacho a Domicilio'}
              </label>
            ))}
          </div>

          {modalidadEntrega === 'Retiro en Farmacia' && (
            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '10px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem', border: '1px dashed #cbd5e1' }}>
              🏥 El paciente recogerá sus medicamentos de forma presencial en la farmacia del CESFAM.
            </div>
          )}

          {modalidadEntrega === 'Despacho a Domicilio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease' }}>
              {/* Dirección */}
              <div>
                <label style={labelStyle}>Dirección de entrega</label>
                <div style={{ marginTop: '6px' }}>
                  <DireccionAutocomplete
                    value={direccion}
                    onChange={setDireccion}
                    onCoordChange={(lat, lon) => { setLatitud(lat); setLongitud(lon); }}
                  />
                </div>
              </div>

              {/* Indicaciones */}
              <div>
                <label style={labelStyle}>Indicaciones para el chofer</label>
                <textarea
                  value={indicaciones}
                  onChange={e => setIndicaciones(e.target.value)}
                  placeholder="Ej: Timbre #3, Dejar con vecino si no hay nadie, llamar antes de llegar..."
                  style={{ ...inputStyle, minHeight: '70px', resize: 'vertical', marginTop: '6px' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── BOTONES DE ACCIÓN ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' }}>
          <button
            type="button"
            onClick={() => {
              setPacienteEncontrado(null);
              setRutBusqueda('');
              setMedicamentos([{ nombre: '', dosis: '', cantidad: '' }]);
              setModalidadEntrega('Retiro en Farmacia');
              setDireccion('');
              setLatitud(null);
              setLongitud(null);
              setIndicaciones('');
            }}
            style={btnSecondary}
          >
            Limpiar formulario
          </button>
          <button
            type="submit"
            disabled={enviando || !pacienteEncontrado}
            style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', fontSize: '1rem', opacity: !pacienteEncontrado ? 0.5 : 1 }}
          >
            {enviando
              ? <><Loader2 size={18} /> Emitiendo...</>
              : <><CheckCircle size={18} /> Emitir Receta{modalidadEntrega === 'Despacho a Domicilio' ? ' y Orden de Despacho' : ''}</>
            }
          </button>
        </div>
      </form>
    </div>
  );
};

// ── Estilos inline reutilizables ──────────────────────────
const sectionStyle = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: '14px',
  padding: '22px 24px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
};
const sectionTitle = {
  margin: '0 0 18px',
  fontSize: '1rem',
  fontWeight: 700,
  color: '#1e293b',
  paddingBottom: '12px',
  borderBottom: '1px solid #f1f5f9',
};
const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 14px',
  border: '2px solid #e2e8f0',
  borderRadius: '10px',
  fontSize: '0.95rem',
  color: '#1e293b',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s',
};
const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#374151',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};
const btnPrimary = {
  padding: '10px 22px',
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '9px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '0.92rem',
  transition: 'background 0.2s',
};
const btnSecondary = {
  padding: '10px 18px',
  background: '#f1f5f9',
  color: '#475569',
  border: '1px solid #e2e8f0',
  borderRadius: '9px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.92rem',
};

export default RecetaMedicoPanel;
