import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import { ChevronRight, MapPin, FileText, Calendar, User as UserIcon, X, Search as SearchIcon, WifiOff } from 'lucide-react';
import { getAvatarUrl } from '../utils/avatar.js';

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
      const res = await radarApi.post('/api/asesores/importar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', transition: 'all 0.3s' }}>
      
      {/* MAIN TABLE */}
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h1 className="text-2xl font-bold">Gestión de Workers - {sedeActual?.nombre || 'General'}</h1>
          <p className="text-muted">Visualiza el estado de tus trabajadores en campo y su productividad en esta sede.</p>
        </div>

        <div className="filter-bar" style={{ gap: '32px' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '300px' }}>
            <SearchIcon size={16} color="var(--c-muted)"/>
            <input type="text" placeholder="Buscar worker..." />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".xlsx, .xls"
              onChange={handleFileChange}
            />
            <button className="btn btn-ghost" style={{ border: '1px solid var(--c-border)' }} onClick={handleImportExcel} disabled={creating}>
              Importar Excel
            </button>
            <button className="btn btn-primary" style={{ padding: '12px 24px' }} onClick={() => setShowModal(true)}>
              + Adicionar Colaborador
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
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
                <tr><td colSpan="5" className="text-center"><div className="spinner"></div></td></tr>
              ) : workers.map(w => (
                <tr key={w.id} 
                  onClick={() => handleSelectWorker(w)} 
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ borderLeft: `6px solid ${getWorkerStatusColor(w)}`, paddingLeft: '16px' }}>
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
                  <td>{w.dni} <br/> <small className="text-muted">{w.telefono}</small></td>
                  <td>{w.distrito || '--'}</td>
                  <td>
                    <span className={`badge ${w.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'}`}>
                      {w.estado}
                    </span>
                  </td>
                  <td className="table-col-final" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
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
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--c-text)', margin: 0 }}>Editar Worker</h2>
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
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>Ubicación (Latitud / Longitud)</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input 
                      type="number" 
                      step="any" 
                      placeholder="Latitud (ej: -12.0463)" 
                      className="form-input" 
                      style={{ background: 'var(--c-surface)', flex: 1 }} 
                      value={editingWorker.latitud ?? ''} 
                      onChange={e => setEditingWorker({...editingWorker, latitud: e.target.value})} 
                    />
                    <input 
                      type="number" 
                      step="any" 
                      placeholder="Longitud (ej: -77.0427)" 
                      className="form-input" 
                      style={{ background: 'var(--c-surface)', flex: 1 }} 
                      value={editingWorker.longitud ?? ''} 
                      onChange={e => setEditingWorker({...editingWorker, longitud: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '24px 40px', background: 'var(--c-surface-2)', borderTop: '1px solid var(--c-border)', display: 'flex', gap: '16px', justifyContent: 'flex-end', flexShrink: 0 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingWorker(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: '12px' }} disabled={creating}>{creating ? 'Guardando...' : 'Actualizar Worker'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <span className="modal-title">Registrar Nuevo Worker</span>
              <button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateWorker}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombres</label>
                  <input className="form-input" required value={newWorker.nombres} onChange={e => setNewWorker({...newWorker, nombres: e.target.value})} />
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group"><label className="form-label">Apellido Paterno</label><input className="form-input" required value={newWorker.apellido_paterno} onChange={e => setNewWorker({...newWorker, apellido_paterno: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Apellido Materno</label><input className="form-input" required value={newWorker.apellido_materno} onChange={e => setNewWorker({...newWorker, apellido_materno: e.target.value})} /></div>
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group"><label className="form-label">DNI</label><input className="form-input" required value={newWorker.dni} onChange={e => setNewWorker({...newWorker, dni: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={newWorker.telefono} onChange={e => setNewWorker({...newWorker, telefono: e.target.value})} /></div>
                </div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={newWorker.email} onChange={e => setNewWorker({...newWorker, email: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Distrito Base</label><input className="form-input" value={newWorker.distrito} onChange={e => setNewWorker({...newWorker, distrito: e.target.value})} /></div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>Ubicación (Latitud / Longitud)</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input 
                      type="number" 
                      step="any" 
                      placeholder="Latitud (ej: -12.0463)" 
                      className="form-input" 
                      style={{ background: 'var(--c-surface)', flex: 1 }} 
                      value={newWorker.latitud} 
                      onChange={e => setNewWorker({...newWorker, latitud: e.target.value})} 
                    />
                    <input 
                      type="number" 
                      step="any" 
                      placeholder="Longitud (ej: -77.0427)" 
                      className="form-input" 
                      style={{ background: 'var(--c-surface)', flex: 1 }} 
                      value={newWorker.longitud} 
                      onChange={e => setNewWorker({...newWorker, longitud: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Guardando...' : 'Crear Worker'}</button>
              </div>
            </form>
          </div>
        </div>
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
