import React, { useEffect, useState, useContext } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { AuthContext } from '../context/AuthContext.jsx';
import pinmanIcon from '../assets/PINMAN.png';
import CustomDatePicker from '../components/CustomDatePicker';

// Fix Leaflet default icon in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const GESTION_META = {
  LIBRE: { label: 'Libre', color: '#334155' },
  EN_VISITA: { label: 'En visita', color: '#2563EB' },
  GESTIONADO: { label: 'Gestionado', color: '#10B981' },
  REPROGRAMADO: { label: 'Reprogramado', color: '#F59E0B' },
  NO_ENCONTRADO: { label: 'No encontrado', color: '#EF4444' },
  MIXTO: { label: 'Agrupación', color: '#37385B' },
};

function MapViewport({ onChange }) {
  const map = useMap();
  const publish = () => {
    const bounds = map.getBounds();
    onChange({ zoom: map.getZoom(), west: bounds.getWest(), east: bounds.getEast(), south: bounds.getSouth(), north: bounds.getNorth() });
  };
  useMapEvents({ moveend: publish, zoomend: publish });
  useEffect(() => { publish(); }, [map]);
  return null;
}

function ClusterMarker({ point }) {
  const map = useMap();
  const meta = GESTION_META[point.estado] || GESTION_META.MIXTO;
  const icon = L.divIcon({
    className: 'client-cluster-icon',
    html: `<div style="width:34px;height:42px;display:flex;align-items:center;justify-content:center">
      <svg viewBox="0 0 24 30" width="34" height="42" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
        <path fill="${meta.color}" stroke="#fff" stroke-width="1.5" d="M12 1C6.9 1 3 4.9 3 10c0 6.2 9 18 9 18s9-11.8 9-18c0-5.1-3.9-9-9-9z"/>
        <circle cx="12" cy="10" r="3.2" fill="#fff"/>
      </svg>
    </div>`,
    iconSize: [34, 42], iconAnchor: [17, 42], popupAnchor: [0, -42],
  });
  return <Marker position={[point.latitud, point.longitud]} icon={icon} eventHandlers={{ click: () => map.setView([point.latitud, point.longitud], Math.min(map.getZoom() + 2, 18)) }}>
    <Popup>
      <div style={{ minWidth: 170 }}>
        <strong>{point.count} clientes en esta zona</strong>
        {point.estados && Object.entries(point.estados).map(([status, count]) => (
          <div key={status} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 5, fontSize: 11 }}>
            <span style={{ color: GESTION_META[status]?.color || '#64748B' }}>{GESTION_META[status]?.label || status}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
    </Popup>
  </Marker>;
}

export default function MapPage() {
  const { radarApi, sedeActual } = useContext(AuthContext);
  const [data, setData] = useState({ clientes: [], workers: [], totalClientes: 0 });
  const [mapView, setMapView] = useState({ zoom: 10 });
  const [, setLoading] = useState(true);



  // Filtros
  const [fechaPago, setFechaPago] = useState('');
  const [tipoGestion, setTipoGestion] = useState('TODOS');

  const fetchMapData = async () => {
    try {
      const params = { ...mapView };
      if (fechaPago) params.fecha_pago = fechaPago;
      if (tipoGestion !== 'TODOS') params.estado = tipoGestion;

      const [clientsRes, workersRes] = await Promise.all([
        radarApi.get('/api/clientes/mapa/puntos', { params }),
        radarApi.get('/api/asesores?limit=1000'),
      ]);
      const allClients = clientsRes.data.data || [];
      const allWorkers = workersRes.data.data || [];

      // Solo mostrar clientes con coordenadas válidas
      setData({
        clientes: allClients,
        workers: allWorkers.filter(w => w.latitud != null && w.longitud != null),
        totalClientes: clientsRes.data.total || 0,
      });
    } catch (e) {
      console.error('Error loading map data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
    const interval = setInterval(fetchMapData, 30000); // Auto-refresh cada 30s
    return () => clearInterval(interval);
  }, [radarApi, fechaPago, tipoGestion, mapView]);

  // Iconos Personalizados - PINES GRANDES
  const getClientIcon = (estado) => {
    const color = (GESTION_META[estado] || GESTION_META.LIBRE).color;

    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="position: relative; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center;">
          <svg viewBox="0 0 24 24" width="30" height="30" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));">
            <path fill="${color}" stroke="var(--c-on-primary)" stroke-width="1.5" d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8z"/>
            <circle cx="12" cy="8" r="3" fill="var(--c-on-primary)" />
          </svg>
        </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    });
  };

  const workerIcon = L.icon({
    iconUrl: pinmanIcon,
    iconSize: [45, 45],
    iconAnchor: [22, 45],
    popupAnchor: [0, -45]
  });

  const center = [-12.0464, -77.0428]; // Lima Metropolitana

  return (
    <div className="map-page" style={{ height: 'calc(100vh - 110px)', margin: '-24px', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .map-filters-input {
          background-color: var(--c-surface-2) !important;
          color: var(--c-text) !important;
          border: 1px solid var(--c-border) !important;
          padding: 8px 12px !important;
          border-radius: var(--radius) !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          outline: none !important;
        }
        .map-filters-input option {
          background-color: var(--c-surface) !important;
          color: var(--c-text) !important;
        }
        /* Fix for date icon color in some browsers */
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: none;
          cursor: pointer;
          opacity: 0.8;
        }
      `}</style>
      <div className="map-topbar" style={{ display: 'flex', alignItems: 'center', padding: '10px 15px', backgroundColor: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)', gap: '15px', flexWrap: 'wrap' }}>
        <div className="map-stat">
          <span className="badge badge-activo" style={{backgroundColor:'var(--c-info)'}}></span>
          <span>{data.totalClientes} Clientes ubicados</span>
        </div>
        <div className="map-filter-controls" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: 'auto' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Filtros:</label>
          <CustomDatePicker 
            className="map-filters-input" 
            value={fechaPago} 
            onChange={(e) => setFechaPago(e.target.value)} 
            style={{ width: '175px', minWidth: '175px', padding: '8px 12px' }}
          />
          <select 
            className="map-filters-input" 
            value={tipoGestion} 
            onChange={(e) => setTipoGestion(e.target.value)}
          >
            <option value="TODOS">Todas las Gestiones</option>
            <option value="LIBRE">LIBRE</option>
            <option value="EN_VISITA">EN VISITA</option>
            <option value="GESTIONADO">GESTIONADO</option>
            <option value="REPROGRAMADO">REPROGRAMADO</option>
            <option value="NO_ENCONTRADO">NO ENCONTRADO</option>
          </select>
        </div>
      </div>
      
      <div className="map-container" style={{ flex: 1, position: 'relative' }}>
        <MapContainer key={sedeActual?.id || 'map'} center={center} zoom={10} style={{ height: '100%', width: '100%' }}>
          <MapViewport onChange={setMapView} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {/* MARCADORES DE CLIENTES */}
          {data.clientes.map((c, index) => c.cluster ? (
            <ClusterMarker key={`cluster-${c.latitud}-${c.longitud}-${index}`} point={c} />
          ) : (
            <Marker key={c.id} position={[parseFloat(c.latitud), parseFloat(c.longitud)]} icon={getClientIcon(c.estado)}>
              <Popup>
                <div style={{minWidth: '150px', color: 'var(--c-text)'}}>
                  <strong style={{fontSize:'14px', color: 'var(--c-text)'}}>{c.nombres} {c.apellidos}</strong>
                  <div style={{color: 'var(--c-danger)', fontWeight: 'bold', fontSize: '13px', margin: '3px 0'}}>
                    DEUDA: S/ {parseFloat(c.deuda_total || 0).toFixed(2)}
                  </div>
                  <div style={{color: 'var(--c-muted)', fontSize:'11px', marginBottom:'5px'}}>{c.direccion}</div>
                  <div className={`badge badge-${c.estado.toLowerCase().replace(/_/g, '-')}`}>
                    {c.estado.replace('_', ' ')}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* MARCADORES DE WORKERS */}
          {data.workers.map((w) => (
            <Marker key={w.id} position={[parseFloat(w.latitud || 0), parseFloat(w.longitud || 0)]} icon={workerIcon}>
              <Popup>
                <div style={{minWidth: '120px', color: 'var(--c-text)'}}>
                  <strong style={{color:'var(--c-text)'}}>{w.nombres} {w.apellidos}</strong>
                  <div style={{marginTop:'5px'}}>
                    <span style={{fontSize:'10px', fontWeight:'bold', color: w.estado_jornada === 'EN_REFRIGERIO' ? 'var(--c-warn)' : 'var(--c-muted)'}}>
                        {w.estado_jornada ? w.estado_jornada.replace('_', ' ') : 'SIN INICIAR DÍA'}
                     </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <div style={{
          position: 'absolute', right: 16, bottom: 16, zIndex: 700,
          background: 'rgba(255,255,255,0.95)', border: '1px solid #E2E8F0', borderRadius: 12,
          padding: '10px 12px', boxShadow: '0 8px 24px rgba(15,23,42,0.14)', backdropFilter: 'blur(6px)'
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 7 }}>Estado de gestión</div>
          {Object.entries(GESTION_META).filter(([key]) => key !== 'MIXTO').map(([key, meta]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#334155', marginTop: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: meta.color, boxShadow: `0 0 0 2px ${meta.color}22` }} />
              {meta.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
