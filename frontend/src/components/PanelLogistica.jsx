/**
 * PanelLogistica.jsx
 * Panel del Trabajador / Chofer — Módulo de Logística y Despachos
 *
 * Layout dividido:
 *   Izquierda: tabla de órdenes PENDIENTE / EN_CAMINO con acción para completar
 *   Derecha:   mapa interactivo react-leaflet con un marcador por orden
 *
 * Deps: react-leaflet, leaflet (instalar si no están)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Vincular L globalmente para que leaflet-routing-machine lo extienda en entornos empaquetados
window.L = L;
import 'leaflet-routing-machine';

// ── Fix para los íconos de Leaflet con bundlers (Vite / Webpack) ──
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
});

// Ícono personalizado para órdenes EN_CAMINO
const iconEnCamino = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: markerShadow,
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
  popupAnchor:[1, -34],
  shadowSize: [41, 41],
});

// Ícono personalizado para el CESFAM (Verde)
const iconCesfam = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: markerShadow,
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
  popupAnchor:[1, -34],
  shadowSize: [41, 41],
});

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

// ── Posición inicial: Curicó, Chile (CESFAM) ──────────
const CESFAM_COORDS = [-34.9827, -71.2394];
const DEFAULT_CENTER = [-34.9827, -71.2394];
const DEFAULT_ZOOM   = 14;

// ── Componente de Enrutamiento Vial ─────────────────────
const RoutingControl = ({ from, to }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !from || !to) return;

    // Crear control de enrutamiento
    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(from[0], from[1]),
        L.latLng(to[0], to[1])
      ],
      lineOptions: {
        styles: [{ color: '#2563eb', weight: 5, opacity: 0.85 }]
      },
      addWaypoints: false,
      routeWhileDragging: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false, // Ocultar panel con instrucciones paso a paso
      createMarker: () => null // Desactivar marcadores extras de enrutamiento para evitar duplicados
    }).addTo(map);

    // Limpieza al desmontar o cambiar de ruta
    return () => {
      if (map && routingControl) {
        try {
          map.removeControl(routingControl);
        } catch (e) {
          console.warn("Error al remover control de ruta:", e);
        }
      }
    };
  }, [map, from, to]);

  return null;
};

// ── Componente auxiliar para re-centrar el mapa ─────────
const MapFitter = ({ ordenes }) => {
  const map = useMap();
  useEffect(() => {
    const conCoords = ordenes.filter(o => o.latitud && o.longitud);
    if (conCoords.length > 0) {
      // Incluimos al CESFAM Curicó en los límites para que quepa en el visor de mapa
      const puntos = [[CESFAM_COORDS[0], CESFAM_COORDS[1]], ...conCoords.map(o => [o.latitud, o.longitud])];
      const bounds = L.latLngBounds(puntos);
      map.fitBounds(bounds, { padding: [60, 60] });
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [ordenes, map]);
  return null;
};


// ── Badge de estado ─────────────────────────────────────
const EstadoBadge = ({ estado }) => {
  const config = {
    PENDIENTE: { bg: '#fef3c7', color: '#92400e', label: '⏳ Pendiente' },
    EN_CAMINO: { bg: '#dbeafe', color: '#1e40af', label: '🚐 En camino' },
    COMPLETADO:{ bg: '#dcfce7', color: '#166534', label: '✅ Completado' },
  }[estado] || { bg: '#f1f5f9', color: '#64748b', label: estado };

  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '0.78rem',
      fontWeight: 700,
      background: config.bg,
      color: config.color,
    }}>
      {config.label}
    </span>
  );
};

// ────────────────────────────────────────────────────────
// Componente Principal
// ────────────────────────────────────────────────────────
const PanelLogistica = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [procesando, setProcesando] = useState(null);
  const [filtro, setFiltro] = useState('ACTIVAS'); // 'ACTIVAS' | 'TODAS'
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);

  const fetchOrdenes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch(`${API_URL}/api/logistica`);
      if (!resp.ok) throw new Error('No se pudo cargar las órdenes de logística');
      const data = await resp.json();
      setOrdenes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrdenes(); }, [fetchOrdenes]);

  const handleCambiarEstado = async (id, nuevoEstado) => {
    if (!window.confirm(`¿Confirmas cambiar el estado a "${nuevoEstado}"?`)) return;
    try {
      setProcesando(id);
      const resp = await fetch(
        `${API_URL}/api/logistica/estado/${id}?estado=${nuevoEstado}`,
        { method: 'PUT' }
      );
      if (!resp.ok) throw new Error('Error al actualizar estado');
      await fetchOrdenes();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcesando(null);
    }
  };

  // Órdenes que van al mapa (con coords) y que están activas
  const ordenesMapa = ordenes.filter(
    o => o.latitud && o.longitud && ['PENDIENTE', 'EN_CAMINO'].includes(o.estado)
  );

  // Órdenes visibles en la tabla según el filtro
  const ordenesFiltradas = filtro === 'ACTIVAS'
    ? ordenes.filter(o => ['PENDIENTE', 'EN_CAMINO'].includes(o.estado))
    : ordenes;

  // Si hay alguna orden en camino, se prioriza como activa para enrutamiento. 
  // Si no, se usa la orden seleccionada por el chofer siempre y cuando siga activa.
  const ordenEnCamino = ordenes.find(o => o.estado === 'EN_CAMINO' && o.latitud && o.longitud);
  const ordenActiva = ordenEnCamino || (ordenSeleccionada && ordenes.find(o => o.id === ordenSeleccionada.id && ['PENDIENTE', 'EN_CAMINO'].includes(o.estado)));

  const totalPendientes = ordenes.filter(o => o.estado === 'PENDIENTE').length;
  const totalEnCamino   = ordenes.filter(o => o.estado === 'EN_CAMINO').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', gap: '16px' }}>
      {/* Ocultar el panel flotante de itinerario/instrucciones de Leaflet Routing Machine */}
      <style>{`
        .leaflet-routing-container, .leaflet-routing-error {
          display: none !important;
        }
      `}</style>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.4rem', fontWeight: 700 }}>
            🚐 Panel de Logística y Despachos
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Gestiona los despachos domiciliarios y visualiza las rutas en el mapa
          </p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ padding: '10px 20px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#92400e' }}>{totalPendientes}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#92400e', textTransform: 'uppercase' }}>Pendientes</div>
          </div>
          <div style={{ padding: '10px 20px', background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e40af' }}>{totalEnCamino}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1e40af', textTransform: 'uppercase' }}>En Camino</div>
          </div>
          <div style={{ padding: '10px 20px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#166534' }}>{ordenesMapa.length}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>En Mapa</div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Layout: 2 columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>

        {/* ── COLUMNA IZQUIERDA: Lista/Tabla de Órdenes ── */}
        <div style={{
          background: 'white', borderRadius: '14px',
          border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          {/* Cabecera */}
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid #f1f5f9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
              📋 Órdenes de Despacho
            </span>
            <div style={{ display: 'flex', gap: '6px', background: '#f8fafc', borderRadius: '8px', padding: '4px' }}>
              {['ACTIVAS', 'TODAS'].map(f => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  style={{
                    padding: '5px 14px', border: 'none', borderRadius: '6px',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                    background: filtro === f ? 'white' : 'transparent',
                    color: filtro === f ? '#2563eb' : '#64748b',
                    boxShadow: filtro === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {f === 'ACTIVAS' ? 'Activas' : 'Todas'}
                </button>
              ))}
            </div>
          </div>

          {/* Lista */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Cargando órdenes...</div>
            )}
            {!loading && ordenesFiltradas.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '40px 20px', color: '#94a3b8',
                border: '1px dashed #e2e8f0', borderRadius: '10px', marginTop: '8px'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                No hay órdenes {filtro === 'ACTIVAS' ? 'activas' : ''} en este momento
              </div>
            )}
            {ordenesFiltradas.map(orden => {
              const esActiva = ordenActiva?.id === orden.id;
              return (
                <div
                  key={orden.id}
                  onClick={() => setOrdenSeleccionada(orden)}
                  style={{
                    background: esActiva ? '#eff6ff' : '#f8fafc',
                    borderRadius: '10px',
                    padding: '14px',
                    marginBottom: '10px',
                    border: esActiva ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    borderLeft: esActiva ? '6px solid #2563eb' : `4px solid ${
                      orden.estado === 'PENDIENTE' ? '#f59e0b' :
                      orden.estado === 'EN_CAMINO' ? '#3b82f6' : '#22c55e'
                    }`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    if (!esActiva) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={e => {
                    if (!esActiva) e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                        {orden.nombre_paciente || orden.rut_paciente}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                        RUT: {orden.rut_paciente} · ID #{orden.id}
                      </div>
                    </div>
                    <EstadoBadge estado={orden.estado} />
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600 }}>
                      {orden.tipo === 'Despacho' ? '📦' : '🏠'} {orden.tipo}:
                    </span>{' '}
                    {orden.direccion}
                  </div>

                  {orden.detalle && (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>
                      💊 {orden.detalle}
                    </div>
                  )}

                  {orden.latitud && orden.longitud && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>
                      📍 {orden.latitud.toFixed(4)}, {orden.longitud.toFixed(4)}
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {orden.estado === 'PENDIENTE' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCambiarEstado(orden.id, 'EN_CAMINO');
                        }}
                        disabled={procesando === orden.id}
                        style={{
                          padding: '6px 14px', background: '#3b82f6', color: 'white',
                          border: 'none', borderRadius: '6px', cursor: 'pointer',
                          fontSize: '0.8rem', fontWeight: 600, transition: 'background 0.2s',
                          opacity: procesando === orden.id ? 0.6 : 1,
                        }}
                      >
                        🚐 Iniciar Ruta
                      </button>
                    )}
                    {orden.estado === 'EN_CAMINO' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCambiarEstado(orden.id, 'COMPLETADO');
                        }}
                        disabled={procesando === orden.id}
                        style={{
                          padding: '6px 14px', background: '#16a34a', color: 'white',
                          border: 'none', borderRadius: '6px', cursor: 'pointer',
                          fontSize: '0.8rem', fontWeight: 600, transition: 'background 0.2s',
                          opacity: procesando === orden.id ? 0.6 : 1,
                        }}
                      >
                        ✅ Marcar Entregado
                      </button>
                    )}
                    {orden.estado === 'COMPLETADO' && (
                      <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
                        ✓ Entregado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── COLUMNA DERECHA: Mapa Interactivo ── */}
        <div style={{
          borderRadius: '14px', overflow: 'hidden',
          border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          position: 'relative', minHeight: '400px'
        }}>
          {/* Leyenda del mapa */}
          <div style={{
            position: 'absolute', top: '10px', right: '10px', zIndex: 1000,
            background: 'white', border: '1px solid #e2e8f0',
            borderRadius: '8px', padding: '8px 12px', fontSize: '0.75rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)', lineHeight: 1.8,
          }}>
            <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>Leyenda</div>
            <div>🔵 Pendiente</div>
            <div>🟠 En camino</div>
          </div>

          {/* Aviso si no hay coords */}
          {ordenesMapa.length === 0 && !loading && (
            <div style={{
              position: 'absolute', bottom: '12px', left: '50%',
              transform: 'translateX(-50%)', zIndex: 1000,
              background: 'rgba(255,255,255,0.92)', border: '1px solid #e2e8f0',
              borderRadius: '8px', padding: '8px 16px', fontSize: '0.8rem', color: '#64748b',
              whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
              ℹ️ Sin órdenes activas con coordenadas GPS
            </div>
          )}

          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ width: '100%', height: '100%', minHeight: '400px' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapFitter ordenes={ordenesMapa} />

            {/* Marcador fijo para el CESFAM */}
            <Marker position={CESFAM_COORDS} icon={iconCesfam}>
              <Popup>
                <div style={{ fontFamily: 'sans-serif', fontWeight: 600 }}>
                  🏥 CESFAM Curicó
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', fontWeight: 400 }}>Centro de Despacho y Logística</div>
                </div>
              </Popup>
            </Marker>

            {/* Trazado dinámico de ruta hacia el paciente de la orden activa */}
            {ordenActiva && ordenActiva.latitud && ordenActiva.longitud && (
              <RoutingControl
                from={CESFAM_COORDS}
                to={[ordenActiva.latitud, ordenActiva.longitud]}
              />
            )}

            {ordenesMapa.map(orden => (
              <Marker
                key={orden.id}
                position={[orden.latitud, orden.longitud]}
                icon={orden.estado === 'EN_CAMINO' ? iconEnCamino : new L.Icon.Default()}
              >
                <Popup minWidth={200}>
                  <div style={{ fontFamily: 'sans-serif' }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '0.95rem' }}>
                      {orden.tipo === 'Despacho' ? '📦' : '🏠'} {orden.tipo} #{orden.id}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '4px' }}>
                      <strong>Paciente:</strong> {orden.nombre_paciente || orden.rut_paciente}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '6px' }}>
                      {orden.direccion}
                    </div>
                    {orden.detalle && (
                      <div style={{ fontSize: '0.8rem', color: '#374151', marginBottom: '6px' }}>
                        💊 {orden.detalle}
                      </div>
                    )}
                    <EstadoBadge estado={orden.estado} />
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default PanelLogistica;
