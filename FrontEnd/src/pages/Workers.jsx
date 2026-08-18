import React, { useEffect, useState, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import { ChevronRight, MapPin, FileText, Calendar, User as UserIcon, X, Search as SearchIcon, WifiOff, UserX } from 'lucide-react';
import { getAvatarUrl } from '../utils/avatar.js';

function parseGoogleMapsLink(url) {
  // Formatos: @lat,lng | ?q=lat,lng | /place/.../@lat,lng | maps?q=lat,lng | ll=lat,lng
  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /maps\/place\/[^/]+\/(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return { lat: m[1], lng: m[2] };
  }
  return null;
}

function LocationInput({ latitud, longitud, onChange, radarApi, onDistrictChange }) {
  const [mode, setMode] = useState('link'); // 'link' | 'address'
  const [linkValue, setLinkValue] = useState('');
  const [addressValue, setAddressValue] = useState('');
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const [resolvingDistrict, setResolvingDistrict] = useState(false);

  const resolveDistrict = async (lat, lng) => {
    setResolvingDistrict(true);
    try {
      const response = await radarApi.post('/api/asesores/geocodificar', { latitud: lat, longitud: lng });
      if (response.data?.data?.distrito) onDistrictChange(response.data.data.distrito);
    } catch (lookupError) {
      console.error('No se pudo obtener el distrito:', lookupError);
      setError('Se obtuvieron las coordenadas, pero no fue posible identificar el distrito. Puedes escribirlo manualmente.');
    } finally {
      setResolvingDistrict(false);
    }
  };

  const handleLinkChange = (val) => {
    setLinkValue(val);
    setError('');
    if (!val.trim()) { onChange('', ''); setParsed(null); return; }
    const result = parseGoogleMapsLink(val);
    if (result) {
      setParsed(result);
      onChange(result.lat, result.lng);
      setError('');
      resolveDistrict(result.lat, result.lng);
    } else if (/^https:\/\/(maps\.app\.goo\.gl|goo\.gl|(?:www\.)?google\.com|maps\.google\.com)\//i.test(val.trim())) {
      setResolvingDistrict(true);
      radarApi.post('/api/asesores/geocodificar', { url: val.trim() }).then(response => {
        const location = response.data?.data;
        if (!location?.latitud || !location?.longitud) throw new Error('Ubicación no reconocida');
        setParsed({ lat: location.latitud, lng: location.longitud });
        onChange(location.latitud, location.longitud);
        if (location.distrito) onDistrictChange(location.distrito);
        setError('');
      }).catch(() => {
        setParsed(null);
        onChange('', '');
        setError('No se pudo resolver el enlace compartido. Verifica que sea un enlace público de Google Maps.');
      }).finally(() => setResolvingDistrict(false));
    } else if (val.length > 10) {
      setParsed(null);
      onChange('', '');
      setError('No se pudo extraer coordenadas. Pega el enlace completo de Google Maps.');
    }
  };

  const tabStyle = (active) => ({
    flex: 1, padding: '7px', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer',
    background: active ? 'var(--c-primary)' : 'var(--c-surface-2)',
    color: active ? '#fff' : 'var(--c-muted)',
    borderRadius: active ? '6px' : '6px', transition: 'all 0.15s',
  });

  return (
    <div>
      {/* Selector de modo */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', background: 'var(--c-surface-2)', padding: '4px', borderRadius: '8px', border: '1px solid var(--c-border)' }}>
        <button type="button" style={tabStyle(mode === 'link')} onClick={() => setMode('link')}>
          🔗 Enlace de Google Maps
        </button>
        <button type="button" style={tabStyle(mode === 'address')} onClick={() => setMode('address')}>
          📍 Dirección exacta
        </button>
      </div>

      {mode === 'link' ? (
        <div>
          <input
            className="form-input"
            style={{ background: 'var(--c-surface)', borderColor: error ? '#ef4444' : undefined }}
            placeholder="Pega el enlace de Google Maps o 'Compartir ubicación'..."
            value={linkValue}
            onChange={e => handleLinkChange(e.target.value)}
          />
          {error && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '5px' }}>{error}</p>}
          {resolvingDistrict && <p style={{ fontSize: '11px', color: 'var(--c-muted)', marginTop: '5px' }}>Identificando distrito...</p>}
          {parsed && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, padding: '8px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', fontSize: '12px', color: '#10b981', fontWeight: '700' }}>
                ✓ Lat: {parsed.lat}
              </div>
              <div style={{ flex: 1, padding: '8px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', fontSize: '12px', color: '#10b981', fontWeight: '700' }}>
                ✓ Lng: {parsed.lng}
              </div>
            </div>
          )}
          <p style={{ fontSize: '11px', color: 'var(--c-muted)', marginTop: '6px' }}>
            En Google Maps: toca el punto → "Compartir" → copia el enlace.
          </p>
        </div>
      ) : (
        <div>
          <input
            className="form-input"
            style={{ background: 'var(--c-surface)' }}
            placeholder="Ej: Av. Javier Prado Este 4200, Lima, Perú"
            value={addressValue}
            onChange={e => { setAddressValue(e.target.value); onChange('', ''); }}
          />
          <p style={{ fontSize: '11px', color: 'var(--c-muted)', marginTop: '6px' }}>
            Escribe la dirección completa incluyendo distrito y ciudad.
          </p>
        </div>
      )}
    </div>
  );
}

export default function Workers() {
  const { radarApi, sedeActual } = useContext(AuthContext);
  const { showToast } = useNotification();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newWorker, setNewWorker] = useState({
    nombres: '', apellido_paterno: '', apellido_materno: '', dni: '', telefono: '', email: '', distrito: '', latitud: '', longitud: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      try {
        const res = await radarApi.get('/api/asesores');
        setWorkers(res.data.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchWorkers();
  }, [radarApi]);

  const navigate = useNavigate();
  const handleSelectWorker = async (w) => {
    navigate(`/workers/${w.id}`, { state: { worker: w } });
  };

  const [editingWorker, setEditingWorker] = useState(null);
  const [deletingWorker, setDeletingWorker] = useState(null);

  const fileInputRef = useRef(null);

  const handleImportExcel = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setCreating(true);

    try {
      const res = await radarApi.post('/api/importaciones/asesores', formData);
      let job;
      let attempts = 0;
      do {
        await new Promise(resolve => setTimeout(resolve, 1500));
        job = (await radarApi.get(`/api/importaciones/${res.data.data.id}`)).data.data;
        attempts++;
        if (attempts >= 1200) throw new Error('La importación continúa en proceso. Puede revisar su estado más tarde.');
      } while (['PENDIENTE', 'PROCESANDO'].includes(job.estado));
      if (job.estado !== 'COMPLETADA') throw new Error(job.detalle_error?.[0]?.mensaje || 'La importación no pudo completarse');
      res.data.insertados = job.insertadas;
      res.data.errores = job.errores;
      showToast(`Importación completada:\n- Insertados: ${res.data.insertados}\n- Errores: ${res.data.errores}`, 'success');
      // Refrescar listado
      const workersRes = await radarApi.get('/api/asesores');
      setWorkers(workersRes.data.data || []);
    } catch (err) {
      console.error('Error importing Excel:', err);
      showToast('Error al importar asesores: ' + (err.response?.data?.error || err.response?.data?.message || err.message), 'error');
    } finally {
      setCreating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteWorker = async (id) => {
    setCreating(true);
    try {
      await radarApi.delete(`/api/asesores/${id}`);
      showToast("Asesor eliminado exitosamente", 'success');
      setDeletingWorker(null);
      const res = await radarApi.get('/api/asesores');
      setWorkers(res.data.data || []);
    } catch (e) {
      showToast('Error: ' + (e.response?.data?.mensaje || e.response?.data?.error || e.message), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateWorker = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await radarApi.post('/api/asesores', {
        ...newWorker,
        correo: newWorker.email
      });
      setShowModal(false);
      setNewWorker({ nombres: '', apellido_paterno: '', apellido_materno: '', dni: '', telefono: '', email: '', distrito: '', latitud: '', longitud: '' });
      showToast("Asesor registrado exitosamente", 'success');
      // Ejecutar fetch de manera asíncrona pero sin cascading render
      const res = await radarApi.get('/api/asesores');
      setWorkers(res.data.data || []);
    } catch (e) { showToast('Error: ' + (e.response?.data?.error || e.response?.data?.mensaje || e.message), 'error'); }
    finally { setCreating(false); }
  };

  const handleEditWorker = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await radarApi.patch(`/api/asesores/${editingWorker.id}`, {
        ...editingWorker,
        correo: editingWorker.email
      });
      setEditingWorker(null);
      showToast("Asesor actualizado exitosamente", 'success');
      // Ejecutar fetch de manera asíncrona
      const res = await radarApi.get('/api/asesores');
      setWorkers(res.data.data || []);
    } catch (e) { showToast('Error: ' + (e.response?.data?.error || e.response?.data?.mensaje || e.message), 'error'); }
    finally { setCreating(false); }
  };

  const getWorkerStatusColor = (w) => {
    if (w.estado === 'INACTIVO') return '#212529';
    const estado = (w.estado_jornada || 'SIN INICIAR').toUpperCase();
    if (estado.includes('FINALIZADA')) return '#845EF7';
    if (estado.includes('REFRIGERIO') || estado.includes('ALMUERZO')) return '#FFC107';
    if (estado.includes('INICIADA')) return '#28A745';
    return '#DC3545';
  };

  const filteredWorkers = workers.filter(w => {
    const q = searchTerm.trim().toLowerCase();
    const matchSearch = !q || `${w.nombres} ${w.apellido_paterno} ${w.apellido_materno} ${w.dni} ${w.email}`.toLowerCase().includes(q);
    const matchEstado = filtroEstado === 'TODOS' || w.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', transition: 'all 0.3s' }}>
      
      {/* MAIN TABLE */}
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h1 className="text-2xl font-bold">Gestión de Asesores - {sedeActual?.nombre || 'General'}</h1>
          <p className="text-muted">Visualiza el estado de tus asesores en campo y su productividad en esta sede.</p>
        </div>

        <div className="filter-bar" style={{ gap: '12px', flexWrap: 'wrap' }}>
          <div className="professional-search" style={{ flex: 1, minWidth: '260px' }}>
            <SearchIcon size={16} color="var(--c-muted)"/>
            <input type="text" placeholder="Buscar por nombre, DNI, email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="form-input professional-select" style={{ width: '200px', paddingRight: '42px' }}>
            <option value="TODOS">Todos los estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
          <div className="workers-toolbar-actions" style={{ display: 'flex', gap: '12px' }}>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx" onChange={handleFileChange} />
            <button className="btn btn-ghost" style={{ border: '1px solid var(--c-border)' }} onClick={handleImportExcel} disabled={creating}>Importar Excel</button>
            <button className="btn btn-primary" style={{ padding: '12px 24px' }} onClick={() => setShowModal(true)}>
              + Adicionar Colaborador
            </button>
          </div>
        </div>

        <div className="table-wrap workers-table-wrap">
          <table className="workers-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>DNI / Teléfono</th>
                <th>Distrito Base</th>
                <th>Estado Jornada</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="workers-loading-row"><td colSpan="5" className="text-center"><div className="spinner"></div></td></tr>
              ) : filteredWorkers.length === 0 ? (
                <tr className="table-empty-row">
                  <td colSpan="5">
                    <div className="table-empty-state">
                      <div className="table-empty-icon"><UserX size={26} strokeWidth={1.8} /></div>
                      <strong>
                        {searchTerm || filtroEstado !== 'TODOS'
                          ? 'No encontramos colaboradores'
                          : 'Aún no hay colaboradores registrados'}
                      </strong>
                      <p>
                        {searchTerm || filtroEstado !== 'TODOS'
                          ? 'Prueba modificando la búsqueda o limpiando el filtro seleccionado.'
                          : 'Los colaboradores aparecerán aquí cuando sean registrados o importados.'}
                      </p>
                      {(searchTerm || filtroEstado !== 'TODOS') && (
                        <button
                          type="button"
                          className="btn btn-ghost table-empty-action"
                          onClick={() => {
                            setSearchTerm('');
                            setFiltroEstado('TODOS');
                          }}
                        >
                          Limpiar filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filteredWorkers.map(w => (
                <tr key={w.id}
                  onClick={() => handleSelectWorker(w)}
                  style={{ cursor: 'pointer' }}
                >
                  <td data-label="Asesor" style={{ '--worker-status-color': getWorkerStatusColor(w), borderLeft: `6px solid ${getWorkerStatusColor(w)}`, paddingLeft: '16px' }}>
                    <div className="flex items-center gap-3">
                      <div className="avatar-small" style={{ width: '48px', height: '48px' }}>
                        <img src={getAvatarUrl(w.nombres, w.id)} alt="avatar" />
                      </div>
                      <div>
                        <div className="font-bold" style={{ fontSize: '15px' }}>{w.nombres} {w.apellidos}</div>
                        <div className="text-sm text-muted">{w.email || 'Sin correo registrado'}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="DNI / Teléfono">{w.dni} <br/> <small className="text-muted">{w.telefono}</small></td>
                  <td data-label="Distrito base">{w.distrito || '--'}</td>
                  <td data-label="Estado">
                    <span className={`badge ${w.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'}`}>
                      {w.estado}
                    </span>
                  </td>
                  <td data-label="Acciones" className="table-col-final" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setEditingWorker(w); }}>Editar</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--c-danger)' }} onClick={(e) => { e.stopPropagation(); setDeletingWorker(w); }}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDITAR / CREAR (Same as before but cleaned up) */}
      {editingWorker && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(5px)' }}>
          <div className="modal" style={{ maxWidth: '600px', width: '95vw', background: 'var(--c-bg)', border: '1px solid var(--c-border)', borderRadius: '24px', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="p-10 flex justify-between items-center" style={{ padding: '32px 40px 20px', borderBottom: '1px solid var(--c-border)', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--c-text)', margin: 0 }}>Editar asesor</h2>
              </div>
              <button 
                className="btn-icon" 
                style={{ background: 'var(--c-surface-2)', borderRadius: '50%', padding: '8px' }}
                onClick={() => setEditingWorker(null)}
              ><X size={20} /></button>
            </div>
            <form onSubmit={handleEditWorker} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div className="modal-body" style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', flex: 1 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>Estado de Cuenta</label>
                  <select className="form-input" style={{ background: 'var(--c-surface)' }} value={editingWorker.estado} onChange={e => setEditingWorker({...editingWorker, estado: e.target.value})}>
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>Nombres</label>
                    <input className="form-input" style={{ background: 'var(--c-surface)' }} value={editingWorker.nombres} onChange={e => setEditingWorker({...editingWorker, nombres: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>DNI</label>
                    <input className="form-input" style={{ background: 'var(--c-surface)' }} value={editingWorker.dni || ''} onChange={e => setEditingWorker({...editingWorker, dni: e.target.value})} />
                  </div>
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>Apellido Paterno</label>
                    <input className="form-input" style={{ background: 'var(--c-surface)' }} value={editingWorker.apellido_paterno || ''} onChange={e => setEditingWorker({...editingWorker, apellido_paterno: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>Apellido Materno</label>
                    <input className="form-input" style={{ background: 'var(--c-surface)' }} value={editingWorker.apellido_materno || ''} onChange={e => setEditingWorker({...editingWorker, apellido_materno: e.target.value})} />
                  </div>
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>Teléfono</label>
                    <input className="form-input" style={{ background: 'var(--c-surface)' }} value={editingWorker.telefono || ''} onChange={e => setEditingWorker({...editingWorker, telefono: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>Email</label>
                    <input className="form-input" style={{ background: 'var(--c-surface)' }} value={editingWorker.email || ''} onChange={e => setEditingWorker({...editingWorker, email: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>Distrito Base</label>
                  <input className="form-input" style={{ background: 'var(--c-surface)' }} value={editingWorker.distrito || ''} onChange={e => setEditingWorker({...editingWorker, distrito: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '24px 40px', background: 'var(--c-surface-2)', borderTop: '1px solid var(--c-border)', display: 'flex', gap: '16px', justifyContent: 'flex-end', flexShrink: 0 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingWorker(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: '12px' }} disabled={creating}>{creating ? 'Guardando...' : 'Actualizar asesor'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && createPortal(
        <div className="modal-overlay worker-create-overlay">
          <div className="modal worker-create-modal">
            <div className="modal-header">
              <span className="modal-title">Registrar nuevo asesor</span>
              <button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form className="worker-create-form" onSubmit={handleCreateWorker}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">DNI</label>
                  <input
                    className="form-input"
                    required
                    inputMode="numeric"
                    autoComplete="off"
                    minLength={8}
                    maxLength={8}
                    pattern="[0-9]{8}"
                    placeholder="Ingrese los 8 dígitos"
                    value={newWorker.dni}
                    onChange={e => setNewWorker({...newWorker, dni: e.target.value.replace(/\D/g, '').slice(0, 8)})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombres</label>
                  <input className="form-input" required value={newWorker.nombres} onChange={e => setNewWorker({...newWorker, nombres: e.target.value})} />
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group"><label className="form-label">Apellido Paterno</label><input className="form-input" required value={newWorker.apellido_paterno} onChange={e => setNewWorker({...newWorker, apellido_paterno: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Apellido Materno</label><input className="form-input" required value={newWorker.apellido_materno} onChange={e => setNewWorker({...newWorker, apellido_materno: e.target.value})} /></div>
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={newWorker.telefono} onChange={e => setNewWorker({...newWorker, telefono: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={newWorker.email} onChange={e => setNewWorker({...newWorker, email: e.target.value})} /></div>
                </div>
                <div className="form-group"><label className="form-label">Distrito Base</label><input className="form-input" value={newWorker.distrito} onChange={e => setNewWorker({...newWorker, distrito: e.target.value})} /></div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>Ubicación</label>
                  <LocationInput
                    latitud={newWorker.latitud}
                    longitud={newWorker.longitud}
                    radarApi={radarApi}
                    onChange={(lat, lng) => setNewWorker(actual => ({...actual, latitud: lat, longitud: lng}))}
                    onDistrictChange={(distrito) => setNewWorker(actual => ({...actual, distrito}))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Guardando...' : 'Crear asesor'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {deletingWorker && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(5px)' }}>
          <div className="modal" style={{ maxWidth: '450px', width: '90vw', background: 'var(--c-bg)', border: '1px solid var(--c-border)', borderRadius: '24px', overflow: 'hidden', padding: '32px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--c-text)', marginTop: 0, marginBottom: '12px' }}>Confirmar Eliminación</h2>
            <p style={{ color: 'var(--c-text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              ¿Está seguro de eliminar al asesor <strong>{deletingWorker.nombres} {deletingWorker.apellidos}</strong>?<br/>
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setDeletingWorker(null)} disabled={creating}>Cancelar</button>
              <button className="btn btn-danger" style={{ background: 'var(--c-danger)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: '700' }} onClick={() => handleDeleteWorker(deletingWorker.id)} disabled={creating}>
                {creating ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
