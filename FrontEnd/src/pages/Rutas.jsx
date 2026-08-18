import React, { useEffect, useState, useContext, useCallback, useRef, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import { X, Users, Map as MapIcon, Trash2, Search, ChevronDown, Check } from 'lucide-react';
import CustomDatePicker from '../components/CustomDatePicker';

// Radio de proximidad configurable en kilómetros
const PROXIMITY_RADIUS_KM = 5;

// Simplified RecenterMap component
function RecenterMap({ advisorCoords }) {
  const map = useMap();
  useEffect(() => {
    console.log('advisorCoords', advisorCoords);
    if (!advisorCoords) return;
    map.invalidateSize();
    map.flyTo(advisorCoords, 15, { animate: true, duration: 1 });
  }, [advisorCoords, map]);
  return null;
}

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let animationFrame;
    const refreshSize = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => map.invalidateSize({ animate: false, pan: false }));
    };

    const observer = new ResizeObserver(refreshSize);
    observer.observe(container);
    window.addEventListener('resize', refreshSize);
    refreshSize();
    const transitionRefresh = window.setTimeout(refreshSize, 350);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', refreshSize);
      window.clearTimeout(transitionRefresh);
      cancelAnimationFrame(animationFrame);
    };
  }, [map]);

  return null;
}

// Componente de Marcador memoizado para evitar re-renderizados innecesarios de pines
const ClientMarker = React.memo(({ client, isSelected, selectedIndex, onClick }) => {
  const markerRef = useRef(null);
  const pinIcon = useMemo(() => {
    const fillColor = isSelected ? '#10b981' : '#000000';
    return L.divIcon({
      className: 'custom-pin',
      html: `
        <div style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2)); transition: all 0.2s; transform: scale(${isSelected ? 1.15 : 1});">
          <svg viewBox="0 0 24 24" width="${isSelected ? 48 : 40}" height="${isSelected ? 48 : 40}" fill="${fillColor}" stroke="#ffffff" stroke-width="1.5">
            ${isSelected ? `
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <text x="12" y="12" font-size="8.5" font-family="sans-serif" font-weight="900" fill="#ffffff" text-anchor="middle">${selectedIndex}</text>
            ` : `
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            `}
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -35]
    });
  }, [isSelected, selectedIndex]);

  const handleMarkerClick = useCallback(() => {
    if (!isSelected) onClick(client.id_cliente);
  }, [isSelected, onClick, client.id_cliente]);

  const handlePopupAction = useCallback(() => {
    onClick(client.id_cliente);
    markerRef.current?.closePopup();
  }, [onClick, client.id_cliente]);

  return (
    <Marker
      ref={markerRef}
      position={[parseFloat(client.latitud), parseFloat(client.longitud)]}
      icon={pinIcon}
      eventHandlers={{ click: handleMarkerClick }}
    >
      {isSelected && <Popup>
        <div className="p-2" style={{ minWidth: '160px' }}>
          <h4 style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--c-text)', borderBottom: '1px solid var(--c-border)', paddingBottom: '8px', marginBottom: '8px' }}>
            {client.nombres} {client.apellido_paterno}
          </h4>
          <div style={{ fontSize: '12px', color: 'var(--c-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
            <span><strong>DNI:</strong> {client.dni}</span>
            <span><strong>Deuda Total:</strong> S/ {Number(client.deuda_vigente || 0) + Number(client.deuda_castigada || 0)}</span>
            <span><strong>Estado:</strong> {client.estado}</span>
          </div>
          <button
            className="btn btn-danger"
            style={{ width: '100%', padding: '6px', fontSize: '11px', fontWeight: 'bold', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', background: '#ef4444' }}
            onClick={(e) => { e.stopPropagation(); handlePopupAction(); }}
          >
            QUITAR DE RUTA
          </button>
        </div>
      </Popup>}
    </Marker>
  );
});

const ESTADO_CONFIG = {
  PROGRAMADA: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Programada' },
  EN_PROCESO: { color: '#2563eb', bg: 'rgba(37,99,235,0.12)', label: 'En proceso' },
  FINALIZADA: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Finalizada' },
  CANCELADA:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  label: 'Cancelada' },
};

const CLIENTE_ESTADO_CONFIG = {
  PENDIENTE: { color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  VISITADO: { color: '#059669', bg: 'rgba(16,185,129,0.14)' },
  GESTIONADO: { color: '#059669', bg: 'rgba(16,185,129,0.14)' },
  GESTIONADO_PAGO: { color: '#059669', bg: 'rgba(16,185,129,0.14)' },
  REPROGRAMADO: { color: '#d97706', bg: 'rgba(245,158,11,0.16)' },
  NO_ENCONTRADO: { color: '#dc2626', bg: 'rgba(239,68,68,0.12)' },
};

const RouteCard = ({ route, onEdit, onDelete, onStatusChange, onClientStatusChange }) => {
  const [showAll, setShowAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const clientes = [...(route.rutas_clientes || [])].sort((a, b) => (a.secuencia || 0) - (b.secuencia || 0));
  const VISIBLE = 4;
  const clientesToShow = showAll ? clientes : clientes.slice(0, VISIBLE);
  const extra = clientes.length - VISIBLE;

  const handleConfirmAction = async () => {
    if (confirmAction === 'delete') {
      setIsDeleting(true);
      try { await onDelete(route.id_ruta); } catch { /* El contenedor muestra el error. */ } finally { setIsDeleting(false); setConfirmAction(null); }
      return;
    }
    if (confirmAction === 'cancel') {
      setUpdating(true);
      try { await onStatusChange(route.id_ruta, 'CANCELADA'); } catch { /* El contenedor muestra el error. */ } finally { setUpdating(false); setConfirmAction(null); }
    }
  };

  const estado = (route.estado || '').toUpperCase();
  const estadoCfg = ESTADO_CONFIG[estado] || { color: 'var(--c-muted)', bg: 'var(--c-surface-2)', label: route.estado };
  const asesorNombre = route.asesor ? `${route.asesor.nombres} ${route.asesor.apellido_paterno}` : 'Sin asignar';
  const fecha = (() => {
    const d = new Date(route.fecha_programada);
    return isNaN(d) ? '—' : d.toLocaleDateString('es-PE', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
  })();

  return (
    <div style={{
      border: '1px solid var(--c-border)',
      borderRadius: '14px',
      background: 'var(--c-surface)',
      overflow: 'hidden',
      marginBottom: '14px',
      transition: 'box-shadow 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Franja superior de color por estado */}
      <div style={{ height: '4px', background: estadoCfg.color, width: '100%' }} />

      <div style={{ padding: '18px 20px' }}>
        {/* Cabecera: asesor + badge estado + fecha */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Avatar inicial */}
            <div style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${estadoCfg.color}33, ${estadoCfg.color}88)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: estadoCfg.color
            }}>
              {asesorNombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text)', lineHeight: 1.2 }}>{asesorNombre}</div>
              <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 2 }}>Asesor responsable</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
              background: estadoCfg.bg, color: estadoCfg.color, textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>{estadoCfg.label}</span>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Fecha programada', value: fecha, icon: '📅' },
            { label: 'Total clientes', value: clientes.length, icon: '👥' },
            { label: 'ID Ruta', value: `#${route.id_ruta || '—'}`, icon: '🗺️' },
          ].map(m => (
            <div key={m.label} style={{
              background: 'var(--c-surface-2, rgba(0,0,0,0.03))',
              border: '1px solid var(--c-border)',
              borderRadius: 10, padding: '10px 12px'
            }}>
              <div style={{ fontSize: 10, color: 'var(--c-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{m.icon} {m.label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--c-text)' }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Lista de clientes */}
        {clientes.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Clientes en ruta</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {clientesToShow.map((rc, i) => {
                const estadoCliente = (rc.estado_visita || 'PENDIENTE').toUpperCase();
                const estadoClienteCfg = CLIENTE_ESTADO_CONFIG[estadoCliente] || CLIENTE_ESTADO_CONFIG.PENDIENTE;
                return (
                <div key={rc.id_ruta_cliente} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  background: 'var(--c-surface-2, rgba(0,0,0,0.02))',
                  border: '1px solid var(--c-border)'
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--c-primary)', color: '#fff',
                    fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)', flex: 1 }}>
                    {rc.cliente?.nombres} {rc.cliente?.apellido_paterno}
                  </span>
                  {rc.cliente?.dni && (
                    <span style={{ fontSize: 11, color: 'var(--c-muted)', fontFamily: 'monospace' }}>DNI {rc.cliente.dni}</span>
                  )}
                  {estado === 'EN_PROCESO' ? (
                    <select
                      className="professional-select"
                      aria-label={`Resultado de ${rc.cliente?.nombres || 'cliente'}`}
                      value={rc.estado_visita || 'PENDIENTE'}
                      onChange={event => onClientStatusChange(route.id_ruta, rc.id_cliente, event.target.value)}
                      style={{
                        width: '165px', minWidth: '150px', height: '34px', padding: '5px 34px 5px 10px', fontSize: '11px',
                        color: estadoClienteCfg.color, backgroundColor: estadoClienteCfg.bg,
                        borderColor: `${estadoClienteCfg.color}55`, fontWeight: 700
                      }}
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="VISITADO">Visitado</option>
                      <option value="NO_ENCONTRADO">No encontrado</option>
                      <option value="REPROGRAMADO">Reprogramado</option>
                    </select>
                  ) : (
                    <span style={{
                      fontSize: 10, fontWeight: 800, color: estadoClienteCfg.color,
                      background: estadoClienteCfg.bg, border: `1px solid ${estadoClienteCfg.color}40`,
                      borderRadius: 99, padding: '4px 8px'
                    }}>
                      {(rc.estado_visita || 'PENDIENTE').replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              )})}
            </div>
            {extra > 0 && (
              <button onClick={() => setShowAll(!showAll)} style={{
                marginTop: 8, background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--c-primary)', fontSize: 12, fontWeight: 700, padding: '4px 0',
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                {showAll ? `▲ Ver menos` : `▼ +${extra} clientes más`}
              </button>
            )}
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid var(--c-border)' }}>
          {estado === 'PROGRAMADA' && (
            <button type="button" className="btn btn-primary" disabled={updating} style={{ fontSize: 12, height: 34, padding: '0 16px' }} onClick={async () => { setUpdating(true); try { await onStatusChange(route.id_ruta, 'EN_PROCESO'); } finally { setUpdating(false); } }}>
              {updating ? 'Iniciando...' : 'Iniciar ruta'}
            </button>
          )}
          {estado === 'EN_PROCESO' && (
            <button type="button" className="btn btn-primary" disabled={updating || clientes.some(item => item.estado_visita === 'PENDIENTE')} title={clientes.some(item => item.estado_visita === 'PENDIENTE') ? 'Registra el resultado de todos los clientes' : 'Finalizar ruta'} style={{ fontSize: 12, height: 34, padding: '0 16px' }} onClick={async () => { setUpdating(true); try { await onStatusChange(route.id_ruta, 'FINALIZADA'); } finally { setUpdating(false); } }}>
              {updating ? 'Finalizando...' : 'Finalizar ruta'}
            </button>
          )}
          {['PROGRAMADA', 'EN_PROCESO'].includes(estado) && (
            <button type="button" className="btn btn-ghost" disabled={updating} style={{ fontSize: 12, height: 34, padding: '0 16px', color: 'var(--c-danger)' }} onClick={() => setConfirmAction('cancel')}>
              {updating ? 'Procesando...' : 'Cancelar ruta'}
            </button>
          )}
          <button type="button" className="btn btn-secondary" style={{ fontSize: 12, height: 34, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => onEdit(route)} disabled={['FINALIZADA', 'EN_PROCESO'].includes(estado)} title={estado === 'FINALIZADA' ? 'Una ruta finalizada conserva su historial y no puede editarse' : estado === 'EN_PROCESO' ? 'Finaliza o cancela la ejecución antes de modificar la ruta' : 'Editar ruta'}>
            ✏️ Editar
          </button>
          <button className="btn btn-danger" style={{ fontSize: 12, height: 34, padding: '0 16px', opacity: isDeleting ? 0.7 : 1, cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setConfirmAction('delete')} disabled={isDeleting}>
            {isDeleting ? 'Eliminando…' : '🗑️ Eliminar'}
          </button>
        </div>
        {confirmAction && (
          <div role="dialog" aria-modal="true" aria-labelledby={`route-confirm-title-${route.id_ruta}`} style={{ position: 'fixed', inset: 0, zIndex: 12000, background: 'rgba(15, 23, 42, 0.48)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: 'min(440px, 100%)', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 18, boxShadow: '0 24px 60px rgba(15, 23, 42, 0.24)', padding: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.10)', color: 'var(--c-danger)', fontSize: 22, marginBottom: 16 }}>!</div>
              <h3 id={`route-confirm-title-${route.id_ruta}`} style={{ margin: '0 0 8px', fontSize: 19, color: 'var(--c-text)' }}>
                {confirmAction === 'delete' ? 'Eliminar ruta' : 'Cancelar ruta'}
              </h3>
              <p style={{ margin: '0 0 22px', color: 'var(--c-muted)', fontSize: 14, lineHeight: 1.55 }}>
                {confirmAction === 'delete'
                  ? `Se eliminará la ruta #${route.id_ruta} y sus asignaciones. Esta acción no se puede deshacer.`
                  : `La ruta #${route.id_ruta} quedará cancelada y dejará de estar disponible para su ejecución.`}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary" disabled={isDeleting || updating} onClick={() => setConfirmAction(null)}>Volver</button>
                <button type="button" className="btn btn-danger" disabled={isDeleting || updating} onClick={handleConfirmAction}>
                  {isDeleting || updating ? 'Procesando…' : confirmAction === 'delete' ? 'Sí, eliminar' : 'Sí, cancelar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Rutas() {
  const { radarApi } = useContext(AuthContext);
  const { showToast } = useNotification();
  const [asesores, setAsesores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRutas, setLoadingRutas] = useState(true);
  const [advisorCoords, setAdvisorCoords] = useState(null);
  const [_focusCoords, setFocusCoords] = useState(null);


  // Estado del nuevo planificador
  const [nuevaRuta, setNuevaRuta] = useState({
    id_asesor: '',
    cliente_ids: [],
    fecha_programada: ''
  });
  // Estado para controlar qué ruta se está editando (null si es creación)
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [showPlanner, setShowPlanner] = useState(false);
  const [rutaSearch, setRutaSearch] = useState('');
  const [rutaFiltroEstado, setRutaFiltroEstado] = useState('TODOS');
  const [rutaFiltroFecha, setRutaFiltroFecha] = useState('');
  const [advisorSearch, setAdvisorSearch] = useState('');
  const [advisorDropdownOpen, setAdvisorDropdownOpen] = useState(false);
  const advisorComboboxRef = useRef(null);

  const registerPlannerHistory = useCallback(() => {
    if (window.history.state?.radar360Panel === 'route-planner') return;
    window.history.pushState(
      { ...(window.history.state || {}), radar360Panel: 'route-planner' },
      '',
      window.location.href
    );
  }, []);

  useEffect(() => {
    const handleBrowserBack = () => {
      setShowPlanner(false);
      setNuevaRuta({ id_asesor: '', cliente_ids: [], fecha_programada: '' });
      setHistoricalClientIds([]);
      setEditingRouteId(null);
      setAdvisorSearch('');
      setAdvisorDropdownOpen(false);
      setClientes([]);
      setAdvisorCoords(null);
      setFocusCoords(null);
      setPolylineCoords([]);
    };
    window.addEventListener('popstate', handleBrowserBack);
    return () => window.removeEventListener('popstate', handleBrowserBack);
  }, []);
  // Rutas programadas
  const [routes, setRoutes] = useState([]);
  const [historicalClientIds, setHistoricalClientIds] = useState([]);

  const displayedClientIds = useMemo(
    () => [
      ...historicalClientIds,
      ...nuevaRuta.cliente_ids.filter(id => !historicalClientIds.includes(id)),
    ],
    [historicalClientIds, nuevaRuta.cliente_ids]
  );
  const routeClientIds = useMemo(() => [...new Set(displayedClientIds)], [displayedClientIds]);

  const [polylineCoords, setPolylineCoords] = useState([]);

// Obtener la información del asesor seleccionado actualmente
  const selectedAdvisor = useMemo(() => {
    console.log('DIAGNOSTICO selectedAdvisor useMemo: nuevaRuta.id_asesor =', nuevaRuta.id_asesor, 'asesores =', asesores);
    if (!nuevaRuta.id_asesor) return null;
    const found = asesores.find(a => String(a.id_asesor) === String(nuevaRuta.id_asesor) || String(a.id) === String(nuevaRuta.id_asesor));
    console.log('DIAGNOSTICO selectedAdvisor useMemo: found =', found);
    return found;
  }, [asesores, nuevaRuta.id_asesor]);

  const filteredAdvisors = useMemo(() => {
    const query = advisorSearch.trim().toLocaleLowerCase('es-PE');
    if (!query) return asesores;
    return asesores.filter((advisor) =>
      [advisor.nombres, advisor.apellido_paterno, advisor.apellido_materno, advisor.dni]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es-PE')
        .includes(query)
    );
  }, [asesores, advisorSearch]);

  const filteredRoutes = useMemo(() => {
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE').trim();
    const query = normalize(rutaSearch);
    return routes.filter(route => {
      const advisor = route.asesor || {};
      const clientsText = (route.rutas_clientes || []).map(link => [
        link.cliente?.nombres, link.cliente?.apellido_paterno, link.cliente?.apellido_materno, link.cliente?.dni,
      ].filter(Boolean).join(' ')).join(' ');
      const searchable = normalize([
        route.id_ruta, route.nombre_ruta, route.nombre, route.estado,
        advisor.nombres, advisor.apellido_paterno, advisor.apellido_materno,
        advisor.dni, advisor.distrito, clientsText,
      ].filter(Boolean).join(' '));
      const state = String(route.estado_ruta || route.estado || '').toUpperCase().replace(/\s+/g, '_');
      const date = route.fecha_programada
        ? new Date(route.fecha_programada).toLocaleDateString('en-CA', { timeZone: 'UTC' })
        : '';
      return (!query || searchable.includes(query))
        && (rutaFiltroEstado === 'TODOS' || state === rutaFiltroEstado)
        && (!rutaFiltroFecha || date === rutaFiltroFecha);
    });
  }, [routes, rutaSearch, rutaFiltroEstado, rutaFiltroFecha]);

  useEffect(() => {
    if (selectedAdvisor) {
      setAdvisorSearch(`${selectedAdvisor.nombres || ''} ${selectedAdvisor.apellido_paterno || ''}`.trim());
    }
  }, [selectedAdvisor]);

  useEffect(() => {
    const closeAdvisorDropdown = (event) => {
      if (advisorComboboxRef.current && !advisorComboboxRef.current.contains(event.target)) {
        setAdvisorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', closeAdvisorDropdown);
    return () => document.removeEventListener('mousedown', closeAdvisorDropdown);
  }, []);

  // Referencia para controlar peticiones en vuelo del asesor seleccionado
  const activeRequestControllerRef = useRef(null);

  // Limpiar peticiones en vuelo al desmontar el componente
  useEffect(() => {
    return () => {
      if (activeRequestControllerRef.current) {
        activeRequestControllerRef.current.abort();
      }
    };
  }, []);

  const fetchRutas = useCallback(async (signal) => {
    setLoadingRutas(true);
    try {
      const res = await radarApi.get('/api/rutas', { signal });
      // Hacemos que sea a prueba de fallos:
      // Si el backend devuelve un arreglo directamente, res.data será ese arreglo.
      // Si el backend devuelve { data: [...] }, res.data.data será el arreglo.
      const rutasArray = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setRoutes(rutasArray);
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.error('Error al cargar rutas:', err);
      }
    } finally {
      setLoadingRutas(false);
    }
  }, [radarApi]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchAsesores = async () => {
      try {
        const resAsesores = await radarApi.get('/api/asesores', { signal: controller.signal });
        console.log('DIAGNOSTICO fetchAsesores: resAsesores.data =', resAsesores.data);
        setAsesores(resAsesores.data.data || []);
      } catch (err) {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.error('Error al cargar asesores:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAsesores();
    fetchRutas(controller.signal);
    return () => controller.abort();
  }, [radarApi, fetchRutas]);

  const handleDeleteRoute = async (id_ruta) => {
    try {
      await radarApi.delete(`/api/rutas/${id_ruta}`);
      showToast('Ruta eliminada exitosamente', 'success');
      await fetchRutas();
    } catch (err) {
      console.error('Error al eliminar ruta:', err);
      showToast(err.response?.data?.mensaje || err.response?.data?.error || 'No se pudo eliminar la ruta.', 'error');
      throw err; // Propagar el error para que setIsDeleting(false) se ejecute correctamente y no cierre un modal inexistente
    }
  };

  const handleRouteStatusChange = useCallback(async (routeId, estado) => {
    try {
      const response = await radarApi.patch(`/api/rutas/${routeId}/estado`, { estado });
      const updatedRoute = response.data?.data;
      setRoutes(current => current.map(route => (
        Number(route.id_ruta) === Number(routeId)
          ? { ...route, ...(updatedRoute || {}), estado }
          : route
      )));
      showToast(estado === 'EN_PROCESO' ? 'Ruta iniciada correctamente.' : estado === 'FINALIZADA' ? 'Ruta finalizada correctamente.' : 'Ruta cancelada.', 'success');
    } catch (error) {
      showToast(error.response?.data?.mensaje || error.response?.data?.error || 'No se pudo actualizar el estado de la ruta.', 'error');
      throw error;
    }
  }, [radarApi, showToast]);

  const handleClientStatusChange = useCallback(async (routeId, clientId, estado_visita) => {
    let previousStatus = 'PENDIENTE';
    let previousStatusCaptured = false;
    setRoutes(current => current.map(route => {
      if (Number(route.id_ruta) !== Number(routeId)) return route;
      return {
        ...route,
        rutas_clientes: (route.rutas_clientes || []).map(item => {
          if (Number(item.id_cliente) !== Number(clientId)) return item;
          if (!previousStatusCaptured) {
            previousStatus = item.estado_visita || 'PENDIENTE';
            previousStatusCaptured = true;
          }
          return { ...item, estado_visita };
        }),
      };
    }));

    try {
      await radarApi.patch(`/api/rutas/${routeId}/clientes/${clientId}/estado`, { estado_visita });
      showToast('Resultado del cliente actualizado.', 'success');
    } catch (error) {
      setRoutes(current => current.map(route => (
        Number(route.id_ruta) !== Number(routeId) ? route : {
          ...route,
          rutas_clientes: (route.rutas_clientes || []).map(item => (
            Number(item.id_cliente) === Number(clientId)
              ? { ...item, estado_visita: previousStatus }
              : item
          )),
        }
      )));
      showToast(error.response?.data?.mensaje || error.response?.data?.error || 'No se pudo actualizar el resultado del cliente.', 'error');
    }
  }, [radarApi, showToast]);

  const handleEditRoute = useCallback(async (route) => {
    const formattedDate = new Date(route.fecha_programada)
      .toLocaleDateString('en-CA', { timeZone: 'UTC' });
    
    // Extraer los clientes manteniendo la secuencia de rutas_clientes
    const clientesOrdenados = [...(route.rutas_clientes || [])].sort((a, b) => a.secuencia - b.secuencia);
    const cliente_ids = clientesOrdenados.map(rc => rc.id_cliente);

    const selectedId = String(route.id_asesor);

    setNuevaRuta({ id_asesor: selectedId, cliente_ids, fecha_programada: formattedDate });
    const advisorRouteIds = routes
      .filter(item => String(item.id_asesor) === selectedId)
      .flatMap(item => (item.rutas_clientes || []).map(link => Number(link.id_cliente)));
    setHistoricalClientIds(advisorRouteIds);
    setEditingRouteId(route.id_ruta);
    registerPlannerHistory();
    setShowPlanner(true);

    // Configurar coordenadas del asesor
    const a = asesores.find(x => String(x.id_asesor) === selectedId || String(x.id) === selectedId);
    if (a && a.latitud != null && a.longitud != null) {
      const advisorLat = parseFloat(a.latitud);
      const advisorLng = parseFloat(a.longitud);
      setAdvisorCoords([advisorLat, advisorLng]);
      
      try {
        const resClientes = await radarApi.get('/api/clientes?page=1&limit=1000');
        const data = resClientes.data.data || resClientes.data.clientes || [];
        const filtered = data
          .filter(c => c.latitud != null && c.longitud != null)
          .map(c => ({
            ...c,
            distancia_km: Number(calculateDistance(advisorLat, advisorLng, Number(c.latitud), Number(c.longitud)).toFixed(2)),
          }))
          .sort((first, second) => first.distancia_km - second.distancia_km);
        setClientes(filtered);
      } catch (err) {
        console.error('Error al cargar clientes en modo edición:', err);
      }
    } else {
      setAdvisorCoords(null);
      setClientes([]);
    }

  }, [asesores, radarApi, registerPlannerHistory, routes]);
  const handleAsesorChange = async (e) => {
    const selectedId = e.target.value;
    console.log('DIAGNOSTICO handleAsesorChange: selectedId (e.target.value) =', selectedId);

    // Abortar cualquier petición de clientes en vuelo previa
    if (activeRequestControllerRef.current) {
      activeRequestControllerRef.current.abort();
    }

    const advisorRoutes = routes.filter(route => String(route.id_asesor) === String(selectedId) && Array.isArray(route.rutas_clientes));
    const existingClientIds = advisorRoutes.flatMap(route => route.rutas_clientes
      .slice()
      .sort((first, second) => Number(first.secuencia || 0) - Number(second.secuencia || 0))
      .map(item => Number(item.id_cliente)));
    setHistoricalClientIds(existingClientIds);
    const singleRoute = advisorRoutes.length === 1 ? advisorRoutes[0] : null;
    const existingDate = singleRoute?.fecha_programada
      ? new Date(singleRoute.fecha_programada).toLocaleDateString('en-CA', { timeZone: 'UTC' })
      : '';

    // Recuperar la selección guardada del asesor cuando ya cuenta con una ruta.
    setNuevaRuta(prev => ({
      ...prev,
      id_asesor: selectedId,
      cliente_ids: singleRoute ? existingClientIds : [],
      fecha_programada: singleRoute ? existingDate : '',
    }));
    if (singleRoute) {
      setEditingRouteId(singleRoute.id_ruta ?? singleRoute.id);
      showToast(`Se recuperaron ${existingClientIds.length} clientes de la ruta guardada.`, 'success');
    } else if (advisorRoutes.length > 1) {
      setEditingRouteId(null);
      showToast(`Se recuperaron ${existingClientIds.length} clientes de ${advisorRoutes.length} fechas programadas. Selecciona una fecha para editar su ruta.`, 'success');
    } else setEditingRouteId(null);
    setFocusCoords(null);

    if (!selectedId) {
      console.log('DIAGNOSTICO handleAsesorChange: selectedId is empty, resetting');
      setClientes([]);
      setAdvisorCoords(null);
      setHistoricalClientIds([]);
      return;
    }

    const a = asesores.find(x => String(x.id_asesor) === String(selectedId) || String(x.id) === String(selectedId));
    console.log('DIAGNOSTICO handleAsesorChange: found advisor =', a);
    if (!a) {
      console.log('DIAGNOSTICO handleAsesorChange: no advisor matched for selectedId =', selectedId);
      setClientes([]);
      setAdvisorCoords(null);
      return;
    }

    if (a.latitud !== null && a.latitud !== undefined && a.longitud !== null && a.longitud !== undefined) {
      const lat = parseFloat(a.latitud);
      const lng = parseFloat(a.longitud);
      console.log('DIAGNOSTICO handleAsesorChange: advisor coords =', [lat, lng]);
      setAdvisorCoords([lat, lng]);

      // Reactivar carga de todos los clientes (Fase 2)
      try {
        const resClientes = await radarApi.get('/api/clientes?page=1&limit=1000');
        const data = resClientes.data.data || resClientes.data.clientes || [];
        const filtered = data
          .filter(c => c.latitud != null && c.longitud != null)
          .map(c => ({
            ...c,
            distancia_km: Number(calculateDistance(lat, lng, Number(c.latitud), Number(c.longitud)).toFixed(2)),
          }))
          .sort((first, second) => first.distancia_km - second.distancia_km);
        setClientes(filtered);
      } catch (err) {
        console.error('Error al cargar clientes:', err);
        showToast('Error al cargar clientes.', 'error');
      }
    } else {
      console.log('DIAGNOSTICO handleAsesorChange: advisor has no coordinates:', a.latitud, a.longitud);
      setClientes([]);
      setAdvisorCoords(null);
      showToast('El asesor seleccionado no cuenta con coordenadas geográficas asignadas.', 'warning');
    }
  };

  const toggleCliente = useCallback((id) => {
    setNuevaRuta(prev => {
      const ids = prev.cliente_ids.includes(id)
        ? prev.cliente_ids.filter(cid => cid !== id)
        : [...prev.cliente_ids, id];
      return { ...prev, cliente_ids: ids };
    });
  }, []);

  const removeDisplayedSelection = useCallback(async (id, selectionIndex) => {
    try {
      if (selectionIndex < historicalClientIds.length) {
        const assignment = routes
          .filter(route => String(route.id_asesor) === String(nuevaRuta.id_asesor))
          .flatMap(route => (route.rutas_clientes || []).map(link => ({
            routeId: route.id_ruta ?? route.id,
            clientId: Number(link.id_cliente),
          })))[selectionIndex];
        if (assignment) await radarApi.delete(`/api/rutas/${assignment.routeId}/clientes/${assignment.clientId}`);
      }
      setHistoricalClientIds(previous => previous.filter((_, index) => index !== selectionIndex));
      setNuevaRuta(previous => ({
        ...previous,
        cliente_ids: previous.cliente_ids.filter(clientId => clientId !== id),
      }));
      await fetchRutas();
      showToast('Cliente retirado de la ruta.', 'success');
    } catch (error) {
      showToast(error.response?.data?.mensaje || 'No se pudo retirar el cliente de la ruta.', 'error');
    }
  }, [fetchRutas, historicalClientIds.length, nuevaRuta.id_asesor, radarApi, routes, showToast]);
useEffect(() => {
  console.log('DIAGNOSTICO polylineCoords useEffect: building coords');
  if (!advisorCoords) {
    setPolylineCoords([]);
    return;
  }

  // Coordenadas base (línea recta)
  const baseCoords = [advisorCoords];
  routeClientIds.forEach(cid => {
    const client = clientes.find(c => c.id_cliente === cid);
    if (client && client.latitud && client.longitud) {
      baseCoords.push([parseFloat(client.latitud), parseFloat(client.longitud)]);
    }
  });

  // Si no hay suficientes puntos para trazar ruta, dibujamos lo que hay (solo asesor)
  if (baseCoords.length < 2) {
    setPolylineCoords(baseCoords);
    return;
  }

  // Controlador para poder abortar si hay cambios rápidos
  const controller = new AbortController();

  const fetchRoute = async () => {
    try {
      const response = await radarApi.post('/api/rutas/osrm', { coordinates: baseCoords }, { signal: controller.signal });
      if (response.data && response.data.coordinates && response.data.coordinates.length > 0) {
        setPolylineCoords(response.data.coordinates);
      } else {
        // Fallback si devuelve vacío
        setPolylineCoords(baseCoords);
      }
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        console.error("Error al obtener ruta OSRM desde el backend, usando fallback:", error);
        setPolylineCoords(baseCoords);
      }
    }
  };

  fetchRoute();

  return () => controller.abort();
}, [advisorCoords, routeClientIds, clientes, radarApi]);
  const handleClientListClick = useCallback((c) => {
    // Alternar selección
    toggleCliente(c.id_cliente);

    // Centrar en el mapa
    if (c.latitud && c.longitud) {
      setFocusCoords([parseFloat(c.latitud), parseFloat(c.longitud)]);
    }
  }, [toggleCliente]);

  // Función para calcular distancia aérea usando Haversine en el frontend
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }



  // Cálculo secuencial acumulado: Asesor -> C1 -> C2 -> C3 -> ...
  (() => {
    if (!advisorCoords || nuevaRuta.cliente_ids.length === 0) return 0;
    let distance = 0;
    let prev = advisorCoords;
    for (const cid of nuevaRuta.cliente_ids) {
      const c = clientes.find(item => item.id_cliente === cid);
      if (c && c.latitud && c.longitud) {
        const lat = parseFloat(c.latitud);
        const lng = parseFloat(c.longitud);
        distance += calculateDistance(prev[0], prev[1], lat, lng);
        prev = [lat, lng];
      }
    }
    return parseFloat(distance.toFixed(1));
  })();

  

  if (loading) return <div className="spinner"></div>;

return (
  <> 
    {!showPlanner ? (
      // Vista de gestión de rutas programadas
      <div className="dashboard-page" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-main), Serimi, sans-serif', fontSize: '32px', margin: 0, color: 'var(--c-text)', letterSpacing: '-0.5px' }}>Gestión de Rutas</h1>
          <button className="btn btn-primary" style={{ height: '38px', padding: '0 24px', fontSize: '12px', fontWeight: 'bold' }}
            onClick={() => {
              setNuevaRuta({ id_asesor: '', cliente_ids: [], fecha_programada: '' });
              setHistoricalClientIds([]);
              setEditingRouteId(null);
              setAdvisorSearch('');
              setAdvisorDropdownOpen(false);
              registerPlannerHistory();
              setShowPlanner(true);
            }}>+ Crear Ruta</button>
        </div>
        <p style={{ margin: 0, color: 'var(--c-muted)', fontSize: '14px' }}>Gestiona las rutas programadas.</p>

        {/* Barra de búsqueda */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', width: '100%' }}>
          <div style={{ position: 'relative', flex: '1 1 360px', minWidth: '240px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" value={rutaSearch} onChange={e => setRutaSearch(e.target.value)} placeholder="Buscar por asesor, DNI, cliente o ruta..."
              style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1px solid var(--c-border)', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter,sans-serif', color: 'var(--c-text)', outline: 'none', background: 'var(--c-surface)', boxSizing: 'border-box' }} />
          </div>
          <select className="professional-select" value={rutaFiltroEstado} onChange={e => setRutaFiltroEstado(e.target.value)}
            style={{ flex: '0 1 210px', width: '210px', minWidth: '180px', paddingRight: '42px', cursor: 'pointer' }}>
            <option value="TODOS">Todos los estados</option>
            <option value="PROGRAMADA">Programada</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="FINALIZADA">Finalizada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
          <CustomDatePicker
            name="filtro_fecha_rutas"
            className="form-input"
            value={rutaFiltroFecha}
            onChange={event => setRutaFiltroFecha(event.target.value)}
            style={{ flex: '0 1 180px', width: '180px', minWidth: '165px', height: '40px' }}
          />
          <span style={{ fontSize: '12px', color: 'var(--c-muted)', whiteSpace: 'nowrap' }}>
            {filteredRoutes.length} resultado{filteredRoutes.length !== 1 ? 's' : ''}
          </span>
          {(rutaSearch || rutaFiltroEstado !== 'TODOS' || rutaFiltroFecha) && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setRutaSearch(''); setRutaFiltroEstado('TODOS'); setRutaFiltroFecha(''); }}>
              Limpiar filtros
            </button>
          )}
        </div>
        <hr style={{ margin: '0' }} />

        {loadingRutas ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
            <div className="spinner"></div>
          </div>
        ) : routes.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '40px', background: 'var(--c-surface)', padding: '40px', borderRadius: '12px', border: '1px solid var(--c-border)' }}>
            <MapIcon size={48} style={{ color: 'var(--c-muted)', margin: '0 auto 16px', opacity: 0.5 }} />
            <p style={{ color: 'var(--c-text)', fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Aún no existen rutas programadas.</p>
            <p style={{ color: 'var(--c-text-muted)', fontSize: '14px', marginBottom: '0' }}>Haz clic en <strong>Crear Ruta</strong> para comenzar.</p>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
            {filteredRoutes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '44px 20px', color: 'var(--c-muted)', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '12px' }}>
                <Search size={30} style={{ margin: '0 auto 10px', opacity: 0.55 }} />
                <strong style={{ display: 'block', color: 'var(--c-text)', marginBottom: '6px' }}>No se encontraron rutas</strong>
                <span style={{ fontSize: '13px' }}>Prueba cambiando la búsqueda o limpiando los filtros.</span>
              </div>
            ) : filteredRoutes.map(route => (
                <RouteCard
                  key={route.id_ruta || route.id}
                  route={route}
                  onEdit={handleEditRoute}
                  onDelete={handleDeleteRoute}
                  onStatusChange={handleRouteStatusChange}
                  onClientStatusChange={handleClientStatusChange}
                />
              ))}
          </div>
        )}
      </div>
    ) : (
      // Planificador existente (mantener lógica actual)

    <div className="dashboard-page route-planner-page" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Título */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
        <h1 style={{ fontFamily: 'var(--font-main), Serimi, sans-serif', fontSize: '32px', margin: 0, color: 'var(--c-text)', letterSpacing: '-0.5px' }}>
          {editingRouteId ? 'Editar Ruta' : 'Planificador de Rutas'}
        </h1>
        <p style={{ margin: 0, color: 'var(--c-muted)', fontSize: '14px' }}>
          {editingRouteId ? 'Modifica los datos de la ruta y recalcula su trayecto.' : 'Visualización de clientes y asignación en mapa.'}
        </p>
      </div>

      {/* Controles en fila horizontal */}
      <div className="card route-planner-controls" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', padding: '16px 24px', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '16px', flexShrink: 0 }}>

        {/* Asesor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '220px' }}>
          <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--c-muted)', letterSpacing: '0.5px' }}>ASESOR RESPONSABLE:</span>
          <div className="advisor-combobox" ref={advisorComboboxRef}>
            <Search className="advisor-combobox-search" size={16} aria-hidden="true" />
            <input
              type="text"
              role="combobox"
              aria-expanded={advisorDropdownOpen}
              aria-controls="advisor-options"
              aria-autocomplete="list"
              value={advisorSearch}
              placeholder="Buscar o seleccionar asesor..."
              onFocus={() => setAdvisorDropdownOpen(true)}
              onChange={(event) => {
                setAdvisorSearch(event.target.value);
                setAdvisorDropdownOpen(true);
                if (nuevaRuta.id_asesor) handleAsesorChange({ target: { value: '' } });
              }}
            />
            <button
              type="button"
              className="advisor-combobox-toggle"
              aria-label="Mostrar asesores"
              onClick={() => setAdvisorDropdownOpen(open => !open)}
            >
              <ChevronDown size={16} />
            </button>
            {advisorDropdownOpen && (
              <div id="advisor-options" className="advisor-combobox-options" role="listbox">
                {filteredAdvisors.length > 0 ? filteredAdvisors.map((advisor) => {
                  const advisorId = String(advisor.id_asesor ?? advisor.id);
                  const isSelected = String(nuevaRuta.id_asesor) === advisorId;
                  return (
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`advisor-combobox-option${isSelected ? ' selected' : ''}`}
                      key={advisorId}
                      onClick={() => {
                        setAdvisorSearch(`${advisor.nombres || ''} ${advisor.apellido_paterno || ''}`.trim());
                        setAdvisorDropdownOpen(false);
                        handleAsesorChange({ target: { value: advisorId } });
                      }}
                    >
                      <span>
                        <strong>{advisor.nombres} {advisor.apellido_paterno}</strong>
                        {advisor.dni && <small>DNI {advisor.dni}</small>}
                      </span>
                      {isSelected && <Check size={16} />}
                    </button>
                  );
                }) : (
                  <div className="advisor-combobox-empty">No se encontraron asesores.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Fecha programada */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '0 1 190px', minWidth: '170px' }}>
          <label htmlFor="fecha-programada-ruta" style={{ fontSize: '10px', fontWeight: '900', color: 'var(--c-muted)', letterSpacing: '0.5px' }}>
            FECHA PROGRAMADA:
          </label>
          <CustomDatePicker
            id="fecha-programada-ruta"
            name="fecha_programada"
            className="form-input"
            value={nuevaRuta.fecha_programada}
            onChange={(event) => {
              const selectedDate = event.target.value;
              const routeForDate = routes.find(route =>
                String(route.id_asesor) === String(nuevaRuta.id_asesor)
                && route.fecha_programada
                && new Date(route.fecha_programada).toLocaleDateString('en-CA', { timeZone: 'UTC' }) === selectedDate
              );
              const idsForDate = routeForDate
                ? routeForDate.rutas_clientes
                    .slice()
                    .sort((first, second) => Number(first.secuencia || 0) - Number(second.secuencia || 0))
                    .map(item => Number(item.id_cliente))
                : [];
              setNuevaRuta(actual => ({
                ...actual,
                fecha_programada: selectedDate,
                // Cambiar la fecha nunca debe borrar una selección en curso.
                // Si la fecha ya tiene una ruta, se combinan ambos grupos sin duplicados.
                cliente_ids: [...new Set([...idsForDate, ...actual.cliente_ids.map(Number)])],
              }));
              setEditingRouteId(routeForDate ? (routeForDate.id_ruta ?? routeForDate.id) : null);
              if (routeForDate) {
                showToast(`Se cargaron ${idsForDate.length} clientes de esa fecha y se conservó tu selección actual.`, 'success');
              }
            }}
            style={{ height: '38px', minHeight: '38px', padding: '7px 12px' }}
            required
          />
        </div>


        {/* Clientes seleccionados */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
          <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--c-muted)', letterSpacing: '0.5px' }}>CLIENTES SELECCIONADOS:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px', padding: '0 12px', background: 'var(--c-surface-2)', borderRadius: '8px', border: '1px solid var(--c-border)' }}>
            <Users size={16} color="var(--c-primary)" />
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--c-text)' }}>
              {displayedClientIds.length} seleccionados
            </span>
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="route-planner-actions" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: 'auto' }}>
             <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary"
                style={{ height: '38px', padding: '0 24px', fontSize: '12px', fontWeight: 'bold' }}
                onClick={async () => {
                  if (!nuevaRuta.id_asesor || nuevaRuta.cliente_ids.length === 0 || !nuevaRuta.fecha_programada) {
                    return showToast("Por favor selecciona un asesor, una fecha y al menos un cliente.", "warning");
                  }

                  try {
                    if (editingRouteId) {
                      await radarApi.put(`/api/rutas/${editingRouteId}`, nuevaRuta);
                      showToast("Ruta actualizada exitosamente", "success");
                    } else {
                      await radarApi.post('/api/rutas', nuevaRuta);
                      showToast("Ruta creada exitosamente", "success");
                    }

                    // Limpiar formulario
                    setNuevaRuta({
                      id_asesor: '',
                      cliente_ids: [],
                      fecha_programada: ''
                    });
                    setHistoricalClientIds([]);
                    setEditingRouteId(null);
                    setAdvisorSearch('');
                    setAdvisorDropdownOpen(false);
                    setClientes([]);
                    setAdvisorCoords(null);
                    setPolylineCoords([]);
                    if (window.history.state?.radar360Panel === 'route-planner') window.history.back();
                    setShowPlanner(false);
                    fetchRutas();
                  } catch (error) {
                    console.error("Error al guardar ruta:", error);
                    // Capturar y mostrar 404
                    showToast(error.response?.data?.mensaje || error.response?.data?.error || 'No se pudo guardar la ruta.', 'error');
                  }
                }}
              >
                {editingRouteId ? 'ACTUALIZAR RUTA' : 'GUARDAR RUTA'}
              </button>
              <button
                className="btn btn-secondary"
                style={{ height: '38px', padding: '0 24px', fontSize: '12px', fontWeight: 'bold' }}
                onClick={() => {
                  // Cancelar creación y volver al listado
                  if (window.history.state?.radar360Panel === 'route-planner') window.history.back();
                  setShowPlanner(false);
                  // Resetear estado temporal de la ruta
                  setNuevaRuta({
                    id_asesor: '',
                    cliente_ids: [],
                    fecha_programada: ''
                  });
                  setHistoricalClientIds([]);
                  setEditingRouteId(null);
                  setAdvisorSearch('');
                  setAdvisorDropdownOpen(false);
                  setClientes([]);
                  setAdvisorCoords(null);
                  setFocusCoords(null);
                  setPolylineCoords([]);
                }}
              >
                Cancelar
              </button>
            </div>
        </div>

      </div>

      {/* Contenedor Principal (Mapa + Panel de Clientes Seleccionados si hay asesor) */}
      <div className="route-planner-workspace" style={{ display: 'flex', flex: 1, gap: '20px', minHeight: '300px', overflow: 'hidden' }}>

        {/* Mapa (75-80% si hay asesor, 100% si no) */}
        <div
          className="card route-planner-map"
          style={{ flex: nuevaRuta.id_asesor ? 3.5 : 1, width: '100%', minWidth: 0, padding: 0, overflow: 'hidden', position: 'relative', border: '1px solid var(--c-border)', borderRadius: '16px', transition: 'flex 0.3s ease' }}

        >
          <MapContainer
            center={advisorCoords || [-12.0464, -77.0428]}
            zoom={19}
            style={{ height: '100%', width: '100%', zIndex: 1 }}
          >
            <MapResizeHandler />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            <RecenterMap
              advisorCoords={advisorCoords}
              coords={advisorCoords ? [advisorCoords, ...clientes.filter(c => c.latitud && c.longitud).map(c => [parseFloat(c.latitud), parseFloat(c.longitud)])] : []}
            />

            {/* Controlador dinámico de posición y zoom del mapa (COMENTADO PARA PRUEBA AISLADA)
            <MapController focusCoords={_focusCoords} />
            */}

            {(() => {
              console.log('DIAGNOSTICO MapContainer render: advisorCoords =', advisorCoords, 'selectedAdvisor =', selectedAdvisor);
              return null;
            })()}

            {/* Círculo semitransparente de 5 km alrededor del asesor (COMENTADO TEMPORALMENTE FASE 1)
            {advisorCoords && (
              <Circle
                center={advisorCoords}
                radius={PROXIMITY_RADIUS_KM * 1000}
                pathOptions={{
                  color: '#2563eb',
                  fillColor: '#2563eb',
                  fillOpacity: 0.08,
                  weight: 1.5,
                  dashArray: '5, 5'
                }}
              />
            )}
            */}

            {/* Marcador permanente del asesor */}
            {advisorCoords && selectedAdvisor && (
              <Marker
                position={advisorCoords}
                icon={L.divIcon({
                  className: 'custom-pin-advisor',
                  html: `
                    <div style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.25));">
                      <svg viewBox="0 0 24 24" width="54" height="54" fill="#2563eb" stroke="#ffffff" stroke-width="1.8">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                        <circle cx="12" cy="8" r="2.5" fill="#ffffff" stroke="none" />
                        <path d="M7.5 14.5c0-1.5 2-2 4.5-2s4.5.5 4.5 2v1h-9v-1z" fill="#ffffff" stroke="none" />
                      </svg>
                    </div>
                  `,
                  iconSize: [54, 54],
                  iconAnchor: [27, 54],
                  popupAnchor: [0, -50]
                })}
              >
                <Popup>
                  <div className="p-1" style={{ minWidth: '180px', fontFamily: 'var(--font-main), sans-serif' }}>
                    <h4 style={{
                      fontWeight: '800',
                      fontSize: '11px',
                      color: '#2563eb',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      margin: '0 0 8px 0',
                      borderBottom: '1px solid var(--c-border)',
                      paddingBottom: '4px'
                    }}>
                      Asesor
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--c-text)' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--c-muted)', fontWeight: 'bold' }}>Nombre:</span>
                        <strong style={{ display: 'block', color: 'var(--c-text)' }}>{selectedAdvisor.nombres} {selectedAdvisor.apellido_paterno}</strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--c-muted)', fontWeight: 'bold' }}>Teléfono:</span>
                        <strong style={{ display: 'block', color: 'var(--c-text)' }}>{selectedAdvisor.telefono || '—'}</strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--c-muted)', fontWeight: 'bold' }}>Clientes cercanos:</span>
                        <strong style={{ display: 'block', color: 'var(--c-text)' }}>{clientes.length}</strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--c-muted)', fontWeight: 'bold' }}>Estado:</span>
                        <span style={{
                          display: 'inline-block',
                          fontWeight: 'bold',
                          color: selectedAdvisor.estado === 'ACTIVO' ? '#10b981' : '#ef4444',
                          textTransform: 'uppercase'
                        }}>
                          {selectedAdvisor.estado}
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {polylineCoords.length >= 2 && (
              <Polyline
                positions={polylineCoords}
                pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.9, lineJoin: 'round' }}
              />
            )}

            {clientes.map(c => {
              if (!c.latitud || !c.longitud) return null;
              
              const isSelected = displayedClientIds.includes(c.id_cliente);
              const selectedIndex = isSelected ? displayedClientIds.indexOf(c.id_cliente) + 1 : 0;

              return (
                <ClientMarker
                  key={c.id_cliente}
                  client={c}
                  isSelected={isSelected}
                  selectedIndex={selectedIndex}
                  onClick={toggleCliente}
                />
              );
            })}
          </MapContainer>

          {/* LEYENDA FLOTANTE MINIMALISTA */}
          <div className="route-map-legend" style={{
            position: 'absolute', top: '20px', right: '20px', zIndex: 1000,
            background: 'var(--c-surface)', padding: '12px', borderRadius: '12px',
            boxShadow: 'var(--shadow)', border: '1px solid var(--c-border)',
            display: 'flex', flexDirection: 'column', gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#2563eb' }}></div>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--c-text)' }}>ASESOR (INICIO)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--c-text)' }}>EN RUTA</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#1f2937' }}></div>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--c-text)' }}>DISPONIBLE</span>
            </div>
          </div>
        </div>

        {/* Panel de Clientes Cercanos (solo si hay asesor) */}
        {nuevaRuta.id_asesor && selectedAdvisor && (() => {
          return (
            <div className="card route-selected-clients" style={{ flex: 1.2, display: 'flex', flexDirection: 'column', padding: '16px', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '16px', overflow: 'hidden' }}>

              <h3 style={{ fontSize: '16px', fontWeight: '800', borderBottom: '1px solid var(--c-border)', paddingBottom: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--c-text)' }}>
                <span>Clientes Seleccionados</span>
                <span style={{ fontSize: '12px', background: 'var(--c-primary-soft)', color: 'var(--c-primary)', padding: '2px 8px', borderRadius: '12px' }}>
                  {displayedClientIds.length} seleccionados
                </span>
              </h3>

              {/* Indicador de capacidad */}
              <div style={{ fontSize: '12px', color: 'var(--c-muted)', marginBottom: '12px', fontWeight: '500' }}>
                Clientes seleccionados: <strong style={{ color: 'var(--c-text)' }}>{displayedClientIds.length}</strong> / {clientes.length}
              </div>

              {/* ESTRUCTURA PREPARADA PARA FUTURAS MEJORAS:
                  // FUTURO: Barra de búsqueda
                  // FUTURO: Filtro por distrito
                  // FUTURO: Filtro por distancia
                  // FUTURO: Ordenar por prioridad
              */}

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {displayedClientIds.length === 0 ? (
            
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--c-muted)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                    <Users size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <span>No hay clientes seleccionados.</span>
                  </div>
                ) : (
                  displayedClientIds.map((id_cliente, selectionIndex) => {
                    const c = clientes.find(cli => cli.id_cliente === id_cliente);
                    if (!c) return null;
                    const order = selectionIndex + 1;
                    return (
                      <div
                        key={`${c.id_cliente}-${selectionIndex}`}
                        onClick={() => handleClientListClick(c)}
                        style={{
                          padding: '12px',
                          border: '2px solid #10b981',
                          borderRadius: '12px',
                          background: 'rgba(16, 185, 129, 0.05)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span style={{ background: '#10b981', color: '#fff', borderRadius: '4px', padding: '2px 6px', fontWeight: 'bold', marginRight: '4px' }}>{order}</span>. {c.nombres} {c.apellido_paterno}</span>
                          <span style={{ fontSize: '11px', color: 'var(--c-muted)' }}>DNI: {c.dni}</span>
                          <span style={{ fontSize: '11px', color: 'var(--c-muted)' }}>Distrito: {c.distrito || '—'}</span>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--c-primary)', marginTop: '2px' }}>
                            📏 {Number.isFinite(Number(c.distancia_km)) ? `${Number(c.distancia_km).toFixed(2)} km desde el asesor` : 'Distancia no disponible'}
                          </span>
                        </div>
                        <button
                          type="button"
                          aria-label={`Quitar a ${c.nombres} de la selección`}
                          title="Quitar cliente"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeDisplayedSelection(c.id_cliente, selectionIndex);
                          }}
                          style={{ border: 0, background: 'transparent', padding: '6px', cursor: 'pointer', color: '#ef4444', display: 'grid', placeItems: 'center' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )
        })()}

      </div>
    </div>
    )}
  </>
);
}
