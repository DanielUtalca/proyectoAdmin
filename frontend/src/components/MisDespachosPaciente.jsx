/**
 * MisDespachosPaciente.jsx
 * Panel del Paciente — Seguimiento de Despachos y Visitas Domiciliarias
 *
 * El paciente ve sus órdenes de logística en tiempo real con estado visual,
 * línea de tiempo de progreso y un mapa simple si hay coordenadas.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Package, Home, CheckCircle, Truck, Clock, RefreshCw, MapPin } from 'lucide-react';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

// Configuración de estado
const ESTADO_CONFIG = {
  PENDIENTE: {
    label: 'Pendiente',
    icon: Clock,
    color: '#f59e0b',
    bgColor: '#fef3c7',
    borderColor: '#fde68a',
    textColor: '#92400e',
    desc: 'Tu pedido ha sido registrado y será asignado pronto a un chofer.',
    step: 1,
  },
  EN_CAMINO: {
    label: 'En Camino',
    icon: Truck,
    color: '#3b82f6',
    bgColor: '#dbeafe',
    borderColor: '#bfdbfe',
    textColor: '#1e40af',
    desc: '¡Tu pedido está en camino! El chofer está dirigiéndose a tu domicilio.',
    step: 2,
  },
  COMPLETADO: {
    label: 'Entregado',
    icon: CheckCircle,
    color: '#22c55e',
    bgColor: '#dcfce7',
    borderColor: '#bbf7d0',
    textColor: '#15803d',
    desc: 'Tu pedido fue entregado correctamente. ¡Que te mejores pronto!',
    step: 3,
  },
};

// Barra de progreso de 3 pasos
const BarraProgreso = ({ estado }) => {
  const pasos = [
    { id: 'PENDIENTE', label: 'Registrado', icon: Clock },
    { id: 'EN_CAMINO', label: 'En Camino', icon: Truck },
    { id: 'COMPLETADO', label: 'Entregado', icon: CheckCircle },
  ];
  const stepActual = ESTADO_CONFIG[estado]?.step || 1;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: '14px' }}>
      {pasos.map((paso, idx) => {
        const Icono = paso.icon;
        const activo = idx + 1 <= stepActual;
        const actual = idx + 1 === stepActual;
        return (
          <React.Fragment key={paso.id}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: activo ? '#2563eb' : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s ease',
                boxShadow: actual ? '0 0 0 4px #bfdbfe' : 'none',
              }}>
                <Icono size={16} color={activo ? 'white' : '#94a3b8'} />
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: actual ? 700 : 500, color: activo ? '#1e40af' : '#94a3b8', whiteSpace: 'nowrap' }}>
                {paso.label}
              </span>
            </div>
            {idx < pasos.length - 1 && (
              <div style={{
                flex: 1, height: '3px', margin: '0 4px',
                background: idx + 1 < stepActual ? '#2563eb' : '#e2e8f0',
                borderRadius: '2px', marginBottom: '20px',
                transition: 'background 0.3s ease',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Tarjeta individual de orden
const TarjetaDespacho = ({ orden }) => {
  const cfg = ESTADO_CONFIG[orden.estado] || ESTADO_CONFIG.PENDIENTE;
  const Icono = cfg.icon;
  const TipoIcono = orden.tipo?.includes('Despacho') ? Package : Home;

  return (
    <div style={{
      background: 'white', borderRadius: '16px', padding: '22px 24px',
      border: `1px solid ${cfg.borderColor}`,
      borderLeft: `5px solid ${cfg.color}`,
      boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.2s ease',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'}
    >
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: cfg.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TipoIcono size={22} color={cfg.color} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
              {orden.tipo?.includes('Despacho') ? '📦 Despacho de Medicamentos' : '🏠 Visita Domiciliaria'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
              Orden #{orden.id}
            </div>
          </div>
        </div>

        {/* Badge de estado */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
          background: cfg.bgColor, color: cfg.textColor, border: `1px solid ${cfg.borderColor}`,
          flexShrink: 0,
        }}>
          <Icono size={13} />
          {cfg.label}
        </span>
      </div>

      {/* Detalle */}
      {orden.detalle && (
        <div style={{
          background: '#f8fafc', borderRadius: '10px', padding: '10px 14px',
          marginBottom: '14px', fontSize: '0.88rem', color: '#374151',
          border: '1px solid #f1f5f9',
        }}>
          <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
            💊 Medicamentos / Indicaciones:
          </span>
          {orden.detalle}
        </div>
      )}

      {/* Dirección */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px', fontSize: '0.88rem', color: '#475569' }}>
        <MapPin size={15} style={{ marginTop: '2px', flexShrink: 0, color: '#64748b' }} />
        <span>{orden.direccion}</span>
      </div>

      {/* Coordenadas si tiene */}
      {orden.latitud && orden.longitud && (
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>📌 Coordenadas GPS registradas — el chofer tiene tu ubicación exacta</span>
        </div>
      )}

      {/* Mensaje de estado */}
      <div style={{
        padding: '10px 14px', borderRadius: '8px',
        background: cfg.bgColor, color: cfg.textColor,
        fontSize: '0.84rem', fontWeight: 500, marginBottom: '14px',
      }}>
        {cfg.desc}
      </div>

      {/* Barra de progreso */}
      <BarraProgreso estado={orden.estado} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────────────────
const MisDespachosPaciente = () => {
  const { user } = useAuth();
  const rut = user?.rut || sessionStorage.getItem('userRut') || '';

  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('ACTIVOS');
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const fetchOrdenes = useCallback(async () => {
    if (!rut) return;
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch(`${API_URL}/api/logistica`);
      if (!resp.ok) throw new Error('No se pudo cargar tus despachos');
      const data = await resp.json();
      // Filtrar solo las órdenes del paciente actual
      const misOrdenes = data.filter(o => o.rut_paciente === rut);
      setOrdenes(misOrdenes);
      setUltimaActualizacion(new Date().toLocaleTimeString('es-CL'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [rut]);

  useEffect(() => {
    fetchOrdenes();
    // Auto-refresh cada 30 segundos si hay órdenes activas
    const interval = setInterval(fetchOrdenes, 30000);
    return () => clearInterval(interval);
  }, [fetchOrdenes]);

  const ordenesFiltradas = filtro === 'ACTIVOS'
    ? ordenes.filter(o => o.estado !== 'COMPLETADO')
    : ordenes;

  const totalActivos = ordenes.filter(o => o.estado !== 'COMPLETADO').length;
  const totalCompletados = ordenes.filter(o => o.estado === 'COMPLETADO').length;

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={26} color="#2563eb" /> Mis Despachos
          </h2>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Seguimiento en tiempo real de tus medicamentos y visitas domiciliarias
          </p>
        </div>
        <button
          onClick={fetchOrdenes}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'En Proceso', value: totalActivos, color: '#f59e0b', bg: '#fef3c7', border: '#fde68a', icon: Truck },
          { label: 'Entregados', value: totalCompletados, color: '#22c55e', bg: '#dcfce7', border: '#bbf7d0', icon: CheckCircle },
          { label: 'Total', value: ordenes.length, color: '#3b82f6', bg: '#dbeafe', border: '#bfdbfe', icon: Package },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: kpi.bg, border: `1px solid ${kpi.border}`,
            borderRadius: '12px', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <kpi.icon size={28} color={kpi.color} />
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: '0.78rem', color: kpi.color, fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {ultimaActualizacion && (
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '14px', textAlign: 'right' }}>
          Última actualización: {ultimaActualizacion} (auto-refresh cada 30s)
        </p>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: '#f8fafc', borderRadius: '10px', padding: '5px', width: 'fit-content' }}>
        {[
          { id: 'ACTIVOS', label: 'En Proceso' },
          { id: 'TODOS', label: 'Todos' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            style={{
              padding: '7px 18px', border: 'none', borderRadius: '7px',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              background: filtro === f.id ? 'white' : 'transparent',
              color: filtro === f.id ? '#2563eb' : '#64748b',
              boxShadow: filtro === f.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
          <p>Cargando tus despachos...</p>
        </div>
      )}

      {error && (
        <div style={{ padding: '14px 18px', background: '#fef2f2', color: '#991b1b', borderRadius: '10px', border: '1px solid #fecaca', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && ordenesFiltradas.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'white', borderRadius: '16px',
          border: '1px dashed #e2e8f0', color: '#94a3b8',
        }}>
          <Package size={56} color="#e2e8f0" style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: '#cbd5e1', fontSize: '1.1rem' }}>
            {filtro === 'ACTIVOS' ? 'Sin despachos en proceso' : 'Sin despachos registrados'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            {filtro === 'ACTIVOS'
              ? 'Cuando tu médico genere una orden de despacho, aparecerá aquí.'
              : 'No tienes órdenes de despacho registradas aún.'
            }
          </p>
        </div>
      )}

      {!loading && ordenesFiltradas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {ordenesFiltradas
            .sort((a, b) => {
              // Primero EN_CAMINO, luego PENDIENTE, luego COMPLETADO
              const order = { EN_CAMINO: 0, PENDIENTE: 1, COMPLETADO: 2 };
              return (order[a.estado] ?? 3) - (order[b.estado] ?? 3);
            })
            .map(orden => (
              <TarjetaDespacho key={orden.id} orden={orden} />
            ))
          }
        </div>
      )}
    </div>
  );
};

export default MisDespachosPaciente;
