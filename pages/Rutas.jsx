import React, { useEffect, useState, useContext, useCallback, useRef, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import { X, Users, Map as MapIcon, Trash2 } from 'lucide-react';
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

// Componente de Marcador memoizado para evitar re-renderizados innecesarios de pines
const ClientMarker = React.memo(({ client, isSelected, selectedIndex, onClick }) => {
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

  const handleClick = useCallback(() => {
    onClick(client.id_cliente);
  }, [onClick, client.id_cliente]);

  return (
    <Marker
      position={[parseFloat(client.latitud), parseFloat(client.longitud)]}
      icon={pinIcon}
      eventHandlers={{
        click: handleClick
      }}
    >
      <Popup>
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
            className={`btn ${isSelected ? 'btn-danger' : 'btn-primary'}`}
            style={{ width: '100%', padding: '6px', fontSize: '11px', fontWeight: 'bold', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', background: isSelected ? '#ef4444' : 'var(--c-primary)' }}
            onClick={(e) => { e.stopPropagation(); handleClick(); }}
          >
            {isSelected ? 'QUITAR DE RUTA' : 'ASIGNAR A RUTA'}
          </button>
        </div>
      </Popup>
    </Marker>
  );
});

const RouteCard = ({ route, onEdit, onDelete }) => {
  const [showAll, setShowAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const clientes = route.rutas_clientes || [];
  
  // Mostrar solo los primeros 3 clientes por defecto
  const clientesToShow = showAll ? clientes : clientes.slice(0, 3);
  const extraClientsCount = clientes.length - 3;

  const handleDelete = async () => {
    if (window.confirm('¿Está seguro de eliminar esta ruta? Esta acción no se puede deshacer.')) {
      setIsDeleting(true);
      try {
        await onDelete(route.id_ruta);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const fechaFormateada = new Date(route.fecha_programada).toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
  const asesorNombre = route.asesor ? `${route.asesor.nombres} ${route.asesor.apellido_paterno}` : 'Desconocido';

  return (
    <div className="card" style={{ padding: '16px', marginBottom: '16px', border: '1px solid var(--c-border)', borderRadius: '12px', background: 'var(--c-surface)', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
        {/* Columna Izquierda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
          <div><strong>Asesor:</strong> {asesorNombre}</div>
          <div><strong>Fecha:</strong> {fechaFormateada}</div>
          <div><strong>Estado:</strong> {route.estado}</div>
        </div>

        {/* Columna Derecha */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '14px', margin: '0 0 8px 0', color: 'var(--c-text-muted)' }}>Clientes</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', color: 'var(--c-text)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {clientesToShow.map(rc => (
              <li key={rc.id_ruta_cliente}>
                • {rc.cliente.nombres} {rc.cliente.apellido_paterno}
              </li>
            ))}
          </ul>
          
          {extraClientsCount > 0 && (
            <div 
              onClick={() => setShowAll(!showAll)}
              style={{ 
                color: 'var(--c-primary)', 
                fontSize: '13px', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                marginTop: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                userSelect: 'none'
              }}
            >
              +{extraClientsCount} clientes más {showAll ? '▲' : '▼'}
            </div>
          )}
        </div>
      </div>

      {/* Botones alineados a la esquina inferior derecha */}
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button 
          className="btn btn-primary" 
          style={{ fontSize: '12px' }}
          onClick={() => onEdit(route)}
        >
          Editar
        </button>
        <button 
          className="btn btn-danger" 
          style={{ fontSize: '12px', opacity: isDeleting ? 0.7 : 1, cursor: isDeleting ? 'not-allowed' : 'pointer' }} 
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? 'Eliminando...' : 'Eliminar'}
        </button>
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
    fecha_programada: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  });
  // Estado para controlar qué ruta se está editando (null si es creación)
  const [editingRouteId, setEditingRouteId] = useState(null);
  // Estado que controla si se está mostrando el formulario
  const [showPlanner, setShowPlanner] = useState(false);
  // Rutas programadas
  const [routes, setRoutes] = useState([]);

  const [polylineCoords, setPolylineCoords] = useState([]);

// Obtener la información del asesor seleccionado actualmente
  const selectedAdvisor = useMemo(() => {
    console.log('DIAGNOSTICO selectedAdvisor useMemo: nuevaRuta.id_asesor =', nuevaRuta.id_asesor, 'asesores =', asesores);
    if (!nuevaRuta.id_asesor) return null;
    const found = asesores.find(a => String(a.id_asesor) === String(nuevaRuta.id_asesor) || String(a.id) === String(nuevaRuta.id_asesor));
    console.log('DIAGNOSTICO selectedAdvisor useMemo: found =', found);
    return found;
  }, [asesores, nuevaRuta.id_asesor]);

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
      showToast('Error al eliminar la ruta', 'error');
      throw err; // Propagar el error para que setIsDeleting(false) se ejecute correctamente y no cierre un modal inexistente
    }
  };

  const handleEditRoute = useCallback(async (route) => {
    // Formatear la fecha a YYYY-MM-DD
    const dateObj = new Date(route.fecha_programada);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    
    const formattedDate = `${yyyy}-${mm}-${dd}`;
    
    // Extraer los clientes manteniendo la secuencia de rutas_clientes
    const clientesOrdenados = [...(route.rutas_clientes || [])].sort((a, b) => a.secuencia - b.secuencia);
    const cliente_ids = clientesOrdenados.map(rc => rc.id_cliente);

    const selectedId = String(route.id_asesor);

    // Configurar coordenadas del asesor
    const a = asesores.find(x => String(x.id_asesor) === selectedId || String(x.id) === selectedId);
    if (a && a.latitud != null && a.longitud != null) {
      setAdvisorCoords([parseFloat(a.latitud), parseFloat(a.longitud)]);
      
      try {
        const resClientes = await radarApi.get('/api/clientes?limit=9999');
        const data = resClientes.data.data || resClientes.data.clientes || [];
        const filtered = data.filter(c => c.latitud != null && c.longitud != null);
        setClientes(filtered);
      } catch (err) {
        console.error('Error al cargar clientes en modo edición:', err);
      }
    } else {
      setAdvisorCoords(null);
      setClientes([]);
    }

    setNuevaRuta({
      id_asesor: selectedId,
      cliente_ids,
      fecha_programada: formattedDate
    });

    setEditingRouteId(route.id_ruta);
    setShowPlanner(true);
  }, [asesores, radarApi]);
  const handleAsesorChange = async (e) => {
    const selectedId = e.target.value;
    console.log('DIAGNOSTICO handleAsesorChange: selectedId (e.target.value) =', selectedId);

    // Abortar cualquier petición de clientes en vuelo previa
    if (activeRequestControllerRef.current) {
      activeRequestControllerRef.current.abort();
    }

    // Limpiar selección de clientes y foco
    setNuevaRuta(prev => ({ ...prev, id_asesor: selectedId, cliente_ids: [] }));
    setFocusCoords(null);

    if (!selectedId) {
      console.log('DIAGNOSTICO handleAsesorChange: selectedId is empty, resetting');
      setClientes([]);
      setAdvisorCoords(null);
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

    if (a.latitud !== null && a.latitud !== undefined && a.latitud !== null && a.latitud !== undefined) {
      const lat = parseFloat(a.latitud);
      const lng = parseFloat(a.longitud);
      console.log('DIAGNOSTICO handleAsesorChange: advisor coords =', [lat, lng]);
      setAdvisorCoords([lat, lng]);

      // Reactivar carga de todos los clientes (Fase 2)
      try {
        const resClientes = await radarApi.get('/api/clientes?limit=9999');
        const data = resClientes.data.data || resClientes.data.clientes || [];
        const filtered = data.filter(c => c.latitud != null && c.longitud != null);
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
useEffect(() => {
  console.log('DIAGNOSTICO polylineCoords useEffect: building coords');
  if (!advisorCoords) {
    setPolylineCoords([]);
    return;
  }

  // Coordenadas base (línea recta)
  const baseCoords = [advisorCoords];
  nuevaRuta.cliente_ids.forEach(cid => {
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
}, [advisorCoords, nuevaRuta.cliente_ids, clientes, radarApi]);
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

console.log('advisorCoords', advisorCoords);
console.log('cliente_ids', nuevaRuta.cliente_ids);
console.log('polylineCoords', polylineCoords);

return (
  <> 
    {!showPlanner ? (
      // Vista de gestión de rutas programadas
      <div className="dashboard-page" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-main), Serimi, sans-serif', fontSize: '32px', margin: 0, color: 'var(--c-text)', letterSpacing: '-0.5px' }}>Gestión de Rutas</h1>
          <button className="btn btn-primary" style={{ height: '38px', padding: '0 24px', fontSize: '12px', fontWeight: 'bold' }}
            onClick={() => setShowPlanner(true)}>+ Crear Ruta</button>
        </div>
        <p style={{ margin: 0, color: 'var(--c-muted)', fontSize: '14px' }}>Gestiona las rutas programadas.</p>
        <hr />
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
          routes.map(route => (
            <RouteCard key={route.id_ruta} route={route} onEdit={handleEditRoute} onDelete={handleDeleteRoute} />
          ))
        )}
      </div>
    ) : (
      // Planificador existente (mantener lógica actual)

    <div className="dashboard-page" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>

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
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', padding: '16px 24px', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '16px', flexShrink: 0 }}>

        {/* Asesor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '220px' }}>
          <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--c-muted)', letterSpacing: '0.5px' }}>ASESOR RESPONSABLE:</span>
          <select
            className="form-input"
            style={{ width: '100%', height: '38px', fontSize: '12px' }}
            value={nuevaRuta.id_asesor}
            onChange={handleAsesorChange}
          >
            <option value="">-- Seleccionar Asesor --</option>
            {asesores.map(a => (
              <option key={a.id_asesor} value={a.id_asesor}>
                {a.nombres} {a.apellido_paterno}
              </option>
            ))}
          </select>
        </div>


        {/* Clientes seleccionados */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
          <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--c-muted)', letterSpacing: '0.5px' }}>CLIENTES SELECCIONADOS:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px', padding: '0 12px', background: 'var(--c-surface-2)', borderRadius: '8px', border: '1px solid var(--c-border)' }}>
            <Users size={16} color="var(--c-primary)" />
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--c-text)' }}>
              {nuevaRuta.cliente_ids.length} seleccionados
            </span>
          </div>
        </div>

        {/* Botón Guardar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: 'auto' }}>
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
                      fecha_programada: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
                    });
                    setEditingRouteId(null);
                    setClientes([]);
                    setAdvisorCoords(null);
                    setPolylineCoords([]);
                    setShowPlanner(false);
                    fetchRutas();
                  } catch (error) {
                    console.error("Error al guardar ruta:", error);
                    // Capturar y mostrar 404
                    if (error.response && error.response.status === 404) {
                      showToast("La ruta que intentas actualizar no existe o fue eliminada.", "error");
                    } else {
                      showToast("Error al guardar la ruta. Revisa la consola para más detalles.", "error");
                    }
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
                  setShowPlanner(false);
                  // Resetear estado temporal de la ruta
                  setNuevaRuta({
                    id_asesor: '',
                    cliente_ids: [],
                    fecha_programada: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
                  });
                  setEditingRouteId(null);
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
      <div style={{ display: 'flex', flex: 1, gap: '20px', minHeight: '300px', overflow: 'hidden' }}>

        {/* Mapa (75-80% si hay asesor, 100% si no) */}
        <div
          className="card"
          style={{ flex: nuevaRuta.id_asesor ? 3.5 : 1, padding: 0, overflow: 'hidden', position: 'relative', border: '1px solid var(--c-border)', borderRadius: '16px', transition: 'flex 0.3s ease' }}

        >
          <MapContainer
            center={advisorCoords || [-12.0464, -77.0428]}
            zoom={19}
            style={{ height: '100%', width: '100%', zIndex: 1 }}
          >
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
              
              const isSelected = nuevaRuta.cliente_ids.includes(c.id_cliente);
              const selectedIndex = isSelected ? nuevaRuta.cliente_ids.indexOf(c.id_cliente) + 1 : 0;

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
          <div style={{
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
          const advisorName = `${selectedAdvisor.nombres} ${selectedAdvisor.apellido_paterno}`;

          return (
            <div className="card" style={{ flex: 1.2, display: 'flex', flexDirection: 'column', padding: '16px', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '16px', overflow: 'hidden' }}>

              {/* Tarjeta de Resumen de Ruta */}
              <div style={{
                background: 'var(--c-surface-2)',
                border: '1px solid var(--c-border)',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--c-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Ruta Actual</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: 'var(--c-muted)' }}>Asesor</span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{advisorName}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: 'var(--c-muted)' }}>Clientes seleccionados</span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--c-text)' }}>{nuevaRuta.cliente_ids.length}</span>
                  </div>
                </div>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: '800', borderBottom: '1px solid var(--c-border)', paddingBottom: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--c-text)' }}>
                <span>Clientes Seleccionados</span>
                <span style={{ fontSize: '12px', background: 'var(--c-primary-soft)', color: 'var(--c-primary)', padding: '2px 8px', borderRadius: '12px' }}>
                  {nuevaRuta.cliente_ids.length} seleccionados
                </span>
              </h3>

              {/* Indicador de capacidad */}
              <div style={{ fontSize: '12px', color: 'var(--c-muted)', marginBottom: '12px', fontWeight: '500' }}>
                Clientes seleccionados: <strong style={{ color: 'var(--c-text)' }}>{nuevaRuta.cliente_ids.length}</strong> / {clientes.length}
              </div>

              {/* ESTRUCTURA PREPARADA PARA FUTURAS MEJORAS:
                  // FUTURO: Barra de búsqueda
                  // FUTURO: Filtro por distrito
                  // FUTURO: Filtro por distancia
                  // FUTURO: Ordenar por prioridad
              */}

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {nuevaRuta.cliente_ids.length === 0 ? (
            
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--c-muted)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                    <Users size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <span>No hay clientes seleccionados.</span>
                  </div>
                ) : (
                  nuevaRuta.cliente_ids.map((id_cliente) => {
                    const c = clientes.find(cli => cli.id_cliente === id_cliente);
                    if (!c) return null;
                    const order = nuevaRuta.cliente_ids.indexOf(c.id_cliente) + 1;
                    return (
                      <div
                        key={c.id_cliente}
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
                            📏 {c.distancia_km !== null && c.distancia_km !== undefined ? `${c.distancia_km} Km` : '— Km'}
                          </span>
                        </div>
                        <Trash2 size={16} style={{ cursor: 'pointer', color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); toggleCliente(c.id_cliente); }} />
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
