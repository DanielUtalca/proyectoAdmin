import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Calendar, User, ShoppingBag, Truck, ClipboardList, Loader2 } from 'lucide-react';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

const HistorialRecetasPaciente = () => {
  const { user } = useAuth();
  const [recetas, setRecetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const rutPaciente = user?.rut || sessionStorage.getItem('userRut') || '';

  useEffect(() => {
    if (rutPaciente) {
      fetchRecetas();
    } else {
      setLoading(false);
    }
  }, [rutPaciente]);

  const fetchRecetas = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch(`${API_URL}/api/recetas/paciente/${encodeURIComponent(rutPaciente)}`);
      if (!resp.ok) throw new Error('Error al cargar tu historial de recetas');
      const data = await resp.json();
      setRecetas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
        <Loader2 className="spin" size={32} color="#2563eb" />
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Cargando tu historial de recetas...</p>
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
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.45rem', fontWeight: 700 }}>
          <FileText size={28} color="#2563eb" /> Historial de Recetas Médicas
        </h2>
        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.95rem' }}>
          Consulta todas las prescripciones y recetas electrónicas emitidas por tus médicos del CESFAM.
        </p>
      </div>

      {recetas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <FileText size={48} color="#cbd5e1" style={{ marginBottom: '14px' }} />
          <h3 style={{ margin: '0 0 6px', color: '#475569' }}>No registras recetas</h3>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
            Las recetas que te prescriban en tus consultas aparecerán listadas aquí de forma automática.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {recetas.map((receta) => {
            const esDespacho = receta.modalidad_entrega === 'Despacho a Domicilio';
            return (
              <div 
                key={receta.id} 
                style={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                  transition: 'transform 0.2s',
                }}
              >
                {/* Cabecera de la Tarjeta */}
                <div style={{
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#dbeafe', color: '#2563eb', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      #{receta.id}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
                        <Calendar size={12} /> {receta.fecha}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b', fontSize: '0.95rem', fontWeight: 700, marginTop: '2px' }}>
                        <User size={14} color="#64748b" /> {receta.nombre_medico}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: esDespacho ? '#eff6ff' : '#f0fdf4',
                    color: esDespacho ? '#2563eb' : '#16a34a',
                    border: `1px solid ${esDespacho ? '#bfdbfe' : '#bbf7d0'}`
                  }}>
                    {esDespacho ? (
                      <>
                        <Truck size={14} /> Despacho a Domicilio
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={14} /> Retiro en Farmacia
                      </>
                    )}
                  </span>
                </div>

                {/* Contenido de la Tarjeta */}
                <div style={{ padding: '20px' }}>
                  {/* Medicamentos */}
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ClipboardList size={15} color="#2563eb" /> Medicamentos Recetados
                    </h4>
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #f1f5f9',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      color: '#1e293b',
                      fontSize: '0.95rem',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {receta.medicamentos}
                    </div>
                  </div>

                  {/* Indicaciones */}
                  {receta.indicaciones && (
                    <div>
                      <h4 style={{ margin: '0 0 8px', fontSize: '0.83rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Indicaciones Médicas
                      </h4>
                      <p style={{ margin: 0, color: '#334155', fontSize: '0.9rem', lineHeight: 1.4 }}>
                        {receta.indicaciones}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistorialRecetasPaciente;
