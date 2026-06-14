import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Home, MapPin, User, FileText, CheckCircle2, Clock, Truck, Loader2 } from 'lucide-react';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

const VisitasDomiciliariasPanel = () => {
  const { user } = useAuth();
  const [visitas, setVisitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVisitas();
  }, []);

  const fetchVisitas = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch(`${API_URL}/api/logistica`);
      if (!resp.ok) throw new Error('Error al cargar la lista de logística');
      const data = await resp.json();
      // Filtrar por tipo 'Visita'
      const filtradas = data.filter(item => item.tipo === 'Visita' || item.tipo.toLowerCase().includes('visita'));
      setVisitas(filtradas);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (estado) => {
    const est = estado.toUpperCase();
    if (est === 'COMPLETADO') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600, padding: '4px 10px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
          <CheckCircle2 size={12} /> Realizada
        </span>
      );
    }
    if (est === 'EN_CAMINO') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600, padding: '4px 10px', borderRadius: '12px', background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa' }}>
          <Truck size={12} /> En Camino
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600, padding: '4px 10px', borderRadius: '12px', background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
        <Clock size={12} /> Pendiente
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
        <Loader2 className="spin" size={32} color="#2563eb" />
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Cargando visitas domiciliarias...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', color: '#b91c1c', textAlign: 'center', margin: '20px 0' }}>
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.45rem', fontWeight: 700 }}>
            <Home size={28} color="#2563eb" /> Visitas Domiciliarias
          </h2>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Listado de procedimientos y atenciones programadas en el domicilio del paciente.
          </p>
        </div>
        <button 
          onClick={fetchVisitas}
          style={{
            padding: '8px 16px',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: 600,
            color: '#475569',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
        >
          🔄 Actualizar Lista
        </button>
      </div>

      {visitas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <Home size={48} color="#cbd5e1" style={{ marginBottom: '14px' }} />
          <h3 style={{ margin: '0 0 6px', color: '#475569' }}>No hay visitas domiciliarias registradas</h3>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
            Las visitas se programan automáticamente cuando finalizas una consulta y marcas la opción "Programar Visita Domiciliaria".
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          {visitas.map((visita) => (
            <div 
              key={visita.id} 
              style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 'bold' }}>
                    {visita.nombre_paciente ? visita.nombre_paciente.charAt(0).toUpperCase() : 'P'}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', fontWeight: 700 }}>
                      {visita.nombre_paciente || 'Paciente sin nombre'}
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                      RUT: {visita.rut_paciente}
                    </p>
                  </div>
                </div>
                {getStatusBadge(visita.estado)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <MapPin size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Dirección de Visita</span>
                    <span style={{ fontSize: '0.9rem', color: '#334155', display: 'inline-block', marginTop: '2px' }}>{visita.direccion}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <FileText size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Indicaciones / Procedimiento</span>
                    <span style={{ fontSize: '0.9rem', color: '#334155', display: 'inline-block', marginTop: '2px' }}>
                      {visita.detalle || 'Sin indicaciones clínicas especificadas.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VisitasDomiciliariasPanel;
