import React, { useEffect, useState, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import CustomDatePicker from '../components/CustomDatePicker.jsx';
import { 
  User, MapPin, Phone, Mail, Home, Building2, Shield, 
  AlertTriangle, WifiOff, Calendar, ChevronUp, ChevronDown, 
  ClipboardList, X, Image, Map as MapIcon, UserX
} from 'lucide-react';

// Mapa de estado → color (Premium Light Theme)
const ESTADO_COLORS = {
  LIBRE:         { bg: '#E8F5E9', text: '#2E7D32', label: 'LIBRE' },
  EN_VISITA:     { bg: '#FFF3E0', text: '#EF6C00', label: 'EN CAMINO' },
  VISITADO_PAGO: { bg: '#E3F2FD', text: '#1565C0', label: 'GESTIONADO' },
  REPROGRAMADO:  { bg: '#F3E5F5', text: '#7B1FA2', label: 'REPROGRAMADO' },
  NO_ENCONTRADO: { bg: '#FFEBEE', text: '#C62828', label: 'NO ENCONTRADO' },
  NO_ECONTRADO:  { bg: '#FFEBEE', text: '#C62828', label: 'NO ENCONTRADO (TYPO)' },
};

const escapeHtml = value => String(value ?? '—')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function EstadoBadge({ estado }) {
  const cfg = ESTADO_COLORS[estado] || { bg: 'var(--c-surface-2)', text: 'var(--c-muted)', label: estado };
  return (
    <span style={{
      background: cfg.bg,
      color: cfg.text,
      fontWeight: '600',
      fontSize: '11px',
      padding: '4px 12px',
      borderRadius: '6px',
      whiteSpace: 'nowrap',
      letterSpacing: '0.2px'
    }}>
      {cfg.label}
    </span>
  );
}

function FichaDetallePanel({ g, originalApiBaseUrl }) {
  const fmt = v => (v !== null && v !== undefined && v !== '') ? v : '—';
  const fmtNum = v => (v !== null && v !== undefined) ? parseFloat(v).toLocaleString('es-PE', { minimumFractionDigits: 2 }) : '—';
  const fmtDate = v => v ? new Date(v).toLocaleDateString('es-PE') : '—';
  const evidencias = g?.evidencias ?? [];

  return (
    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>TIPO CRÉDITO</div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--c-text)' }}>{fmt(g.tipo_credito)}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>FECHA DESEMBOLSO</div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--c-text)' }}>{fmtDate(g.fecha_desembolso)}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>MONTO DESEMBOLSO</div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--c-text)' }}>{g.moneda || 'PEN'} {fmtNum(g.monto_desembolso)}</div>
        </div>

        <div>
          <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>N° CUOTAS</div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--c-text)' }}>{fmt(g.nro_cuotas)}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>CUOTAS PAGADAS</div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--c-text)' }}>{fmt(g.nro_cuotas_pagadas)}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>MONTO CUOTA</div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--c-text)' }}>S/ {fmtNum(g.monto_cuota)}</div>
        </div>

        <div>
          <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>SALDO CAPITAL</div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--c-text)' }}>S/ {fmtNum(g.saldo_capital)}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>COND. CONTABLE</div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--c-text)' }}>{fmt(g.condicion_contable)}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>DURACIÓN LLENADO</div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--c-text)' }}>{g.duracion_llenado_seg ? `${g.duracion_llenado_seg}s` : '—'}</div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>OBSERVACIÓN</div>
        <div style={{ fontSize: '13px', color: 'var(--c-text)', fontStyle: 'italic', lineHeight: '1.5' }}>
          "{g.observacion || 'Sin observaciones registradas'}"
        </div>
      </div>

      {evidencias.length > 0 && (
        <div style={{ display: 'flex', gap: '10px' }}>
          {evidencias.map((url, i) => (
            <img key={i} 
              src={url.startsWith('http') ? url : `${originalApiBaseUrl}${url}`} 
              style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--c-border)', cursor: 'pointer' }}
              onClick={() => window.open(url.startsWith('http') ? url : `${originalApiBaseUrl}${url}`, '_blank')}
              onError={e => e.target.style.display = 'none'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Clientes() {
  const { api, radarApi, sedeActual } = useContext(AuthContext);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalPages: 0 });
  const [filters, setFilters] = useState({ 
    search: '', 
    distrito: '', 
    estado: '', 
    fecha_pago: ''
  });
  const [selectedClient, setSelectedClient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [_expandedGestion, setExpandedGestion] = useState(null);

  const gestiones = selectedClient?.gestiones ?? [];

  const handleExportFicha = () => {
    if (!selectedClient || gestiones.length === 0 || loadingDetail) return;
    const formatDate = value => value
      ? new Date(value).toLocaleString('es-PE', { timeZone: 'America/Lima' })
      : '—';
    const rows = gestiones.map(gestion => `
      <tr>
        <td>${escapeHtml(formatDate(gestion.created_at))}</td>
        <td>${escapeHtml(gestion.tipificacion || gestion.resultado || 'GESTIONADO')}</td>
        <td>${escapeHtml(gestion.worker_nombre || 'No registrado')}</td>
        <td>${escapeHtml(gestion.observacion || 'Sin observaciones')}</td>
      </tr>`).join('');
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ficha ${escapeHtml(selectedClient.dni)}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#1f2937;margin:32px}h1{font-size:22px;margin:0 0 4px;color:#0b22a1}p{margin:4px 0;color:#4b5563}
        .meta{margin:22px 0;padding:16px;border:1px solid #d1d5db;border-radius:10px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
        table{width:100%;border-collapse:collapse;margin-top:18px;font-size:12px}th,td{border:1px solid #d1d5db;padding:9px;text-align:left;vertical-align:top}th{background:#f3f4f6}
        .footer{margin-top:20px;font-size:10px;color:#6b7280}@media print{body{margin:18mm}.no-print{display:none}}
      </style></head><body>
      <h1>Ficha de gestiones del cliente</h1><p>${escapeHtml(`${selectedClient.nombres || ''} ${selectedClient.apellidos || ''}`.trim())}</p>
      <div class="meta"><div><b>DNI:</b> ${escapeHtml(selectedClient.dni)}</div><div><b>Teléfono:</b> ${escapeHtml(selectedClient.telefono || 'No registrado')}</div>
      <div><b>Dirección:</b> ${escapeHtml(selectedClient.direccion || 'No registrada')}</div><div><b>Distrito:</b> ${escapeHtml(selectedClient.distrito || 'No registrado')}</div></div>
      <h2>Historial de gestiones (${gestiones.length})</h2><table><thead><tr><th>Fecha y hora</th><th>Resultado</th><th>Asesor</th><th>Observación</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="footer">Documento generado por Mi Radar 360 el ${escapeHtml(new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }))}.</div>
      <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),150));<\/script></body></html>`;
    const frame = document.createElement('iframe');
    frame.setAttribute('title', 'Exportación de ficha');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0;';
    frame.srcdoc = html;
    document.body.appendChild(frame);
    setTimeout(() => frame.remove(), 60000);
  };

  // ── Importar Excel ──────────────────────────────────────────────
  const fileInputRef = useRef(null);

  const handleImportExcel = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await radarApi.post('/api/importaciones/clientes', formData);
      let job;
      let attempts = 0;
      do {
        await new Promise(resolve => setTimeout(resolve, 1500));
        job = (await radarApi.get(`/api/importaciones/${response.data.data.id}`)).data.data;
        attempts++;
        if (attempts >= 1200) throw new Error('La importación continúa en proceso. Puede revisar su estado más tarde.');
      } while (['PENDIENTE', 'PROCESANDO'].includes(job.estado));
      if (job.estado !== 'COMPLETADA') throw new Error(job.detalle_error?.[0]?.mensaje || 'La importación no pudo completarse');
      alert(`Importación completada: ${job.insertadas} nuevos, ${job.actualizadas || 0} actualizados, ${job.omitidas} duplicados internos y ${job.errores} errores.`);
      setFilters({ search: '', distrito: '', estado: '', fecha_pago: '' });
      setPagination(prev => ({ ...prev, page: 1 }));
    } catch (err) {
      console.error('Error importing Excel:', err);
      alert('Error al importar clientes: ' + (err.response?.data?.error || err.response?.data?.message || err.message || 'Error desconocido'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  // ────────────────────────────────────────────────────────────────

  useEffect(() => { 
    fetchClientes(); 
  }, [radarApi, pagination.page, filters]);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const queryParams = { page: pagination.page, limit: pagination.limit };
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) queryParams[key] = value;
      });
      const query = new URLSearchParams(queryParams).toString();
      const res = await radarApi.get(`/api/clientes?${query}`);
      setClients(res.data.data || []);
      setPagination(prev => ({ ...prev, totalPages: res.data.pagination?.totalPages || 1 }));
    } catch (e) { console.error('Error loading clientes', e); }
    finally { setLoading(false); }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleShowDetail = async (client) => {
    setLoadingDetail(true);
    setSelectedClient(client);
    setShowModal(true);
    setExpandedGestion(null);
    try {
      const res = await radarApi.get(`/api/clientes/${client.id}`);
      setSelectedClient(res.data.data);
    } catch (e) { console.error('Error loading client details', e); }
    finally { setLoadingDetail(false); }
  };

  return (
    <div className="clients-page">
      <div style={{ marginBottom: '24px' }}>
        <h1 className="text-2xl font-bold">Gestión de Clientes - {sedeActual?.nombre || 'General'}</h1>
        <p className="text-muted">Administra tu cartera de clientes y visualiza sus deudas en esta sede.</p>
      </div>
      {/* FILTROS - FILA 1: Buscador, Fecha e Importar Excel */}
      <div className="clients-primary-filters" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '32px', marginBottom: '16px' }}>
        <div className="clients-search-date" style={{ display: 'flex', alignItems: 'center', gap: '32px', flex: '1', minWidth: '300px' }}>
          <div className="professional-search" style={{ flex: '1', minWidth: '300px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" name="search" placeholder="Buscar por nombre, apellidos o DNI..." value={filters.search} onChange={handleFilterChange} />
          </div>
          <CustomDatePicker
            name="fecha_pago"
            className="form-input"
            style={{ width: '150px' }}
            value={filters.fecha_pago}
            onChange={handleFilterChange}
          />
        </div>
        <div>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx" onChange={handleFileChange} />
          <button className="btn btn-primary" style={{ padding: '12px 24px' }} onClick={handleImportExcel}>Importar Excel</button>
        </div>
      </div>

      {/* FILTROS - FILA 2: Gestiones y Distritos (sin cambios) */}
      <div className="filter-bar clients-secondary-filters" style={{ flexWrap: 'wrap', gap: '32px' }}>
        <select name="estado" className="form-input professional-select" style={{ width: '230px', paddingRight: '42px' }} value={filters.estado} onChange={handleFilterChange}>
          <option value="">Todas las gestiones</option>
          <option value="LIBRE">Libre</option>
          <option value="EN_VISITA">Asignado</option>
          <option value="VISITADO_PAGO">Gestionado</option>
          <option value="REPROGRAMADO">Reprogramado</option>
          <option value="NO_ENCONTRADO">No encontrado</option>
        </select>

        <select name="distrito" className="form-input professional-select" style={{ width: '230px', paddingRight: '42px' }} value={filters.distrito} onChange={handleFilterChange}>
          <option value="">Todos los distritos</option>
          {sedeActual?.nombre?.toLowerCase().includes('arequipa') ? (
            ['AREQUIPA','CERRO COLORADO','CAYMA','YANAHUARA','JOSE LUIS BUSTAMANTE','PAUCARPATA','MIRAFLORES'].map(d => (
              <option key={d} value={d}>{d.toLowerCase().replace(/\b\w/g, letra => letra.toUpperCase())}</option>
            ))
          ) : (
            ['LIMA','ATE','CALLAO','COMAS','CHORRILLOS','LOS OLIVOS','SAN JUAN DE LURIGANCHO','SAN MARTIN DE PORRES','VILLA EL SALVADOR'].map(d => (
              <option key={d} value={d}>{d.toLowerCase().replace(/\b\w/g, letra => letra.toUpperCase())}</option>
            ))
          )}
        </select>
      </div>

      {/* TABLA */}
      <div className="table-wrap clients-table-wrap">
        <table className="clients-table">
          <thead>
            <tr>
              <th>Cliente</th><th>DNI / Teléfono</th><th>Dirección / Distrito</th>
              <th>Deuda</th><th>Estado</th><th>Última Gestión</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="clients-loading-row"><td colSpan="6" className="text-center"><div className="spinner"></div></td></tr>
            ) : clients.length === 0 ? (
              <tr className="clients-empty-row">
                <td colSpan="6">
                  <div className="clients-empty-state">
                    <div className="clients-empty-icon"><UserX size={26} strokeWidth={1.8} /></div>
                    <strong>{filters.search || filters.estado || filters.distrito ? 'No encontramos coincidencias' : 'Aún no hay clientes registrados'}</strong>
                    <p>
                      {filters.search || filters.estado || filters.distrito
                        ? 'Prueba modificando la búsqueda o limpiando los filtros seleccionados.'
                        : 'Los clientes aparecerán aquí cuando sean registrados o importados.'}
                    </p>
                    {(filters.search || filters.estado || filters.distrito) && (
                      <button
                        type="button"
                        className="btn btn-ghost clients-empty-action"
                        onClick={() => {
                          setFilters(prev => ({ ...prev, search: '', estado: '', distrito: '' }));
                          setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : clients.map((c, index) => (
              <tr 
                key={c.id}
                style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={() => handleShowDetail(c)}
              >
                <td data-label="Cliente">
                  <div className="font-bold">{c.nombres} {c.apellidos}</div>
                </td>
                <td data-label="DNI / Teléfono"><div>{c.dni || '—'}</div><div className="text-sm text-muted">{c.telefono || 'Sin teléfono'}</div></td>
                <td data-label="Dirección / Distrito">
                  <div className="text-sm">{c.direccion}</div>
                  <span className="badge badge-activo" style={{ fontSize: '10px' }}>{c.distrito}</span>
                </td>
                <td data-label="Deuda">
                  <div className="font-bold" style={{ whiteSpace: 'nowrap' }}>S/ {parseFloat(c.deuda_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-xs text-danger" style={{ whiteSpace: 'nowrap', fontSize: '11px', marginTop: '2px' }}>{c.dias_retraso} días retraso</div>
                </td>
                <td data-label="Estado"><EstadoBadge estado={c.estado || 'LIBRE'} /></td>
                <td data-label="Última gestión">{c.fecha_gestion ? new Date(c.fecha_gestion).toLocaleDateString('es-PE') : 'Sin gestión'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      {!loading && clients.length > 0 && pagination.totalPages > 1 && (
        <div className="pagination clients-pagination">
          <button className="btn btn-ghost" disabled={pagination.page === 1} onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}>Anterior</button>
          <span className="text-sm">Página {pagination.page} de {pagination.totalPages}</span>
          <button className="btn btn-ghost" disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}>Siguiente</button>
        </div>
      )}

      {/* MODAL DETALLE PREMIUM */}
      {showModal && selectedClient && createPortal(
        <div className="modal-overlay client-detail-overlay" style={{ backdropFilter: 'blur(5px)' }}>
          <div className="modal client-detail-modal" style={{ maxWidth: '1100px', width: '95vw', background: 'var(--c-bg)', border: '1px solid var(--c-border)', borderRadius: '24px', overflow: 'hidden' }}>
            
            {/* HEADER MODAL */}
            <div className="p-10 flex justify-between items-center client-detail-header" style={{ padding: '24px 32px', background: 'var(--c-primary)', borderBottom: 'none' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#FFFFFF', margin: 0, letterSpacing: '-0.5px' }}>{selectedClient.nombres} {selectedClient.apellidos}</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600', background: 'rgba(255, 255, 255, 0.2)', padding: '4px 8px', borderRadius: '4px' }}>ID: {String(selectedClient.id).substring(0, 8).toUpperCase()}</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>•</span>
                  <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)' }}>Registrado {new Date(selectedClient.created_at || Date.now()).toLocaleDateString('es-PE', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button type="button" className="btn" onClick={handleExportFicha}
                  disabled={loadingDetail || gestiones.length === 0}
                  title={loadingDetail ? 'Cargando historial...' : gestiones.length === 0 ? 'La ficha estará disponible cuando exista al menos una gestión' : 'Exportar ficha en PDF'}
                  style={{ background: '#FFFFFF', color: 'var(--c-primary)', padding: '8px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', gap: '8px', border: 'none', display: 'flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', opacity: loadingDetail || gestiones.length === 0 ? 0.5 : 1, cursor: loadingDetail || gestiones.length === 0 ? 'not-allowed' : 'pointer' }}>
                  <ClipboardList size={16} strokeWidth={2.5}/> Exportar Ficha
                </button>
                <button 
                  onClick={() => setShowModal(false)}
                  style={{ 
                    width: '32px', height: '32px', border: 'none', 
                    background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s', color: '#FFFFFF'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <X size={20}/>
                </button>
              </div>
            </div>

            <div className="modal-body client-detail-body" style={{ padding: '32px', maxHeight: '75vh', overflowY: 'auto', display: 'grid', gridTemplateColumns: '280px 1fr', gap: '32px' }}>
              
              {/* SIDEBAR IZQUIERDO */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', borderRight: '1px solid var(--c-border)', paddingRight: '24px' }}>
                
                {/* ASIGNACIÓN ACTUAL (DINÁMICO) - AHORA ARRIBA */}
                <section style={{ 
                  padding: '12px 16px', 
                  background: 'var(--c-bg)', 
                  border: `1px solid ${selectedClient.worker_nombre ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.15)'}`, 
                  borderRadius: '6px',
                  display: 'flex', alignItems: 'center', gap: '12px'
                }}>
                  {selectedClient.worker_nombre 
                    ? <User size={16} color="#3b82f6"/>
                    : <AlertTriangle size={16} color="#ef4444"/>
                  }
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--c-text)' }}>
                    {selectedClient.worker_nombre 
                      ? `${selectedClient.worker_nombre} (${selectedClient.ruta_nombre})`
                      : 'Sin worker y/o ruta activa'
                    }
                  </span>
                </section>

                {/* UBICACIÓN Y DATOS */}
                <section>
                  <h4 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--c-text)', marginBottom: '16px', textTransform: 'uppercase' }}>UBICACIÓN Y DATOS</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[
                      { icon: <Phone size={18}/>, label: 'TELÉFONO', value: selectedClient.telefono },
                      { icon: <Mail size={18}/>, label: 'EMAIL', value: selectedClient.email || 'No registrado' },
                      { icon: <MapPin size={18}/>, label: 'DIRECCIÓN', value: selectedClient.direccion },
                      { icon: <Building2 size={18}/>, label: 'DISTRITO', value: selectedClient.distrito }
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '36px', height: '36px', background: 'rgba(var(--c-primary-rgb), 0.1)', border: '1px solid rgba(var(--c-primary-rgb), 0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-primary)' }}>{item.icon}</div>
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--c-muted)', fontWeight: '600', marginBottom: '2px', textTransform: 'uppercase' }}>{item.label}</div>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--c-text)' }}>{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

              </div>

              {/* CONTENIDO PRINCIPAL: TIMELINE */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--c-text)', textTransform: 'uppercase', margin: 0 }}>HISTORIAL DE GESTIONES</h4>
                </div>

                {loadingDetail ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner"></div></div>
                ) : gestiones.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', padding: '80px 40px', background: 'var(--c-surface)', border: '1px solid var(--c-border)', 
                    borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px'
                  }}>
                    <ClipboardList size={32} color="var(--c-muted)" />
                    <p style={{ color: 'var(--c-muted)', fontSize: '14px', margin: 0 }}>No hay registros de gestión para este cliente.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative' }}>
                    {/* Línea vertical del timeline */}
                    <div style={{ position: 'absolute', left: '16px', top: '0', bottom: '0', width: '2px', background: 'var(--c-border)', zIndex: 0 }}></div>
                    
                    {gestiones.map((g, idx) => (
                      <div key={g.id || idx} style={{ position: 'relative', paddingLeft: '32px', marginBottom: '32px', zIndex: 1 }}>
                        {/* Círculo del timeline */}
                        <div style={{ 
                          position: 'absolute', left: '-5px', top: '24px', width: '12px', height: '12px', 
                          borderRadius: '50%', background: '#FFFFFF', border: `3px solid var(--c-primary)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2
                        }}>
                        </div>

                        <div className="card" style={{ 
                          background: 'var(--c-surface)', borderRadius: '8px', padding: 0, 
                          border: '1px solid var(--c-border)', transition: 'all 0.3s', overflow: 'hidden'
                        }}>
                          <div style={{ background: 'var(--c-primary)', border: 'none', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '6px 6px 0 0', color: '#FFFFFF' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <EstadoBadge estado={g.tipificacion} />
                              <div style={{ fontWeight: '600', fontSize: '15px' }}>{g.tipificacion === 'PAGO' ? 'Cobro Recaudado' : (g.tipificacion === 'REPROGRAMARA' ? 'Visita Reprogramada' : 'Gestión Fallida')}</div>
                            </div>
                            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                              <Calendar size={14}/> {new Date(g.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date(g.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          <div style={{ padding: '24px' }}>
                            <FichaDetallePanel g={g} originalApiBaseUrl={api.defaults.baseURL} />
                          </div>
                          
                          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--c-border)', fontSize: '12px', color: 'var(--c-text)', display: 'flex', justifyContent: 'space-between', background: 'var(--c-surface)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--c-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                                {g.worker_nombre ? g.worker_nombre[0] : 'W'}
                              </div>
                              <span>Gestionado por <b>{g.worker_nombre}</b></span>
                            </div>
                            {g.es_offline && <span style={{ color: 'var(--c-danger)', fontWeight: '600' }}>MODO OFFLINE</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>,
      document.body
      )}
    </div>
  );
}
