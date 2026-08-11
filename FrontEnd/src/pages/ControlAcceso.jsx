import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import { ROLES_CONFIG, MODULOS, DEMO_USERS } from '../context/AuthContext.jsx';
import { Shield, Users, Search, Plus, Edit2, Trash2, Check, X, Lock, Unlock, Key, AlertTriangle, ChevronRight, Save, RotateCcw } from 'lucide-react';

const MODULOS_LIST = Object.values(MODULOS);

// ─── Badges ───────────────────────────────────────────────────
function RoleBadge({ rol, rolesConfig }) {
  const cfg = (rolesConfig || ROLES_CONFIG)[rol] || { label: rol, color: '#6C757D', bg: 'rgba(108,117,125,0.1)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: cfg.color, background: cfg.bg, padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

function EstadoBadge({ estado }) {
  const active = estado === 'ACTIVO';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600', color: active ? '#059669' : '#DC2626', background: active ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.1)', padding: '3px 10px', borderRadius: '20px' }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

// ─── Field helpers ─────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', required, placeholder, error, hint }) {
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPwd ? 'text' : 'password') : type;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '11px', fontWeight: '700', color: '#6C757D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}{required && <span style={{ color: '#DC3545' }}> *</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input type={inputType} value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder} aria-invalid={Boolean(error)}
          style={{ width: '100%', padding: isPassword ? '9px 36px 9px 12px' : '9px 12px', border: `1px solid ${error ? '#DC3545' : '#DEE2E6'}`, borderRadius: '6px', fontSize: '13px', color: '#212529', fontFamily: 'Inter, sans-serif', outline: 'none', background: '#FAFAFA', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = '#0B22A1'}
          onBlur={e => e.target.style.borderColor = '#DEE2E6'} />
        {isPassword && (
          <button type="button" onClick={() => setShowPwd(p => !p)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6C757D', display: 'flex', alignItems: 'center' }}>
            {showPwd
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
          </button>
        )}
      </div>
      {(error || hint) && <span style={{ fontSize: 10, lineHeight: 1.35, color: error ? '#DC3545' : '#6C757D' }}>{error || hint}</span>}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '11px', fontWeight: '700', color: '#6C757D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <select className="professional-select" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', paddingRight: '42px', cursor: 'pointer' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Modal de usuario ─────────────────────────────────────────
function ModalUsuario({ usuario, onClose, onSave, rolesConfig }) {
  const [form, setForm] = useState(usuario || {
    nombres: '', apellidos: '', username: '', password: '', email: '', rol: 'ASESOR', sede: 'Lima', estado: 'ACTIVO', mfa_habilitado: false
  });
  const [errors, setErrors] = useState({});
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.nombres.trim()) nextErrors.nombres = 'Ingresa los nombres.';
    if (!form.apellidos.trim()) nextErrors.apellidos = 'Ingresa los apellidos.';
    if (!/^[A-Za-z0-9._-]+$/.test(form.username.trim())) nextErrors.username = 'Usa letras, números, punto, guion o guion bajo.';
    if (!usuario && !form.password) nextErrors.password = 'La contraseña es obligatoria.';
    if (form.password && form.password.length < 12) nextErrors.password = 'Debe tener al menos 12 caracteres.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = 'Ingresa un correo electrónico válido.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave({ ...form, id: usuario?.id || `u${Date.now()}` });
  };

  return (
    <div className="user-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(11,34,161,0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000, padding: 20 }}>
      <div className="user-modal-card" style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', width: '100%', maxWidth: 540, boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #E5E7EB', background: '#F8FAFF', borderRadius: '16px 16px 0 0' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#212529', letterSpacing: '-0.3px' }}>{usuario ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6C757D' }}>{usuario ? 'Modifica los datos del operador' : 'Registra un nuevo operador en el sistema'}</p>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', cursor: 'pointer', color: '#6C757D', display: 'flex', padding: '6px', borderRadius: '8px' }}><X size={18} /></button>
        </div>
        <form className="user-modal-form" onSubmit={handleSubmit}>
          <div className="user-modal-body" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Nombres" value={form.nombres} onChange={v => handleChange('nombres', v)} required error={errors.nombres} />
              <Field label="Apellidos" value={form.apellidos} onChange={v => handleChange('apellidos', v)} required error={errors.apellidos} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Usuario" value={form.username} onChange={v => handleChange('username', v)} required error={errors.username} />
              <Field label="Contraseña" value={form.password} type="password" onChange={v => handleChange('password', v)} placeholder={usuario ? '(sin cambio)' : ''} required={!usuario} error={errors.password} hint="Mínimo 12 caracteres." />
            </div>
            <Field label="Correo electrónico" value={form.email} type="email" onChange={v => handleChange('email', v)} error={errors.email} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <SelectField label="Rol" value={form.rol} onChange={v => handleChange('rol', v)} options={Object.entries(rolesConfig || ROLES_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} />
              <SelectField label="Sede" value={form.sede} onChange={v => handleChange('sede', v)} options={[{ value: 'Lima', label: 'Lima' }, { value: 'Arequipa', label: 'Arequipa' }]} />
            </div>
            <SelectField label="Estado" value={form.estado} onChange={v => handleChange('estado', v)} options={[{ value: 'ACTIVO', label: 'Activo' }, { value: 'INACTIVO', label: 'Inactivo' }]} />

            {/* MFA */}
            <div
              onClick={() => handleChange('mfa_habilitado', !form.mfa_habilitado)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                border: `1.5px solid ${form.mfa_habilitado ? '#0B22A1' : '#DEE2E6'}`,
                background: form.mfa_habilitado ? '#F0F3FF' : '#FAFAFA',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: form.mfa_habilitado ? '#0B22A1' : '#E5E7EB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                    <circle cx="12" cy="16" r="1" fill="#fff" stroke="none"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#212529' }}>Autenticación de dos factores (MFA)</div>
                  <div style={{ fontSize: 11, color: '#6C757D', marginTop: 1 }}>Requiere verificación adicional al iniciar sesión</div>
                </div>
              </div>
              {/* Toggle */}
              <div style={{
                width: 40, height: 22, borderRadius: 99, flexShrink: 0,
                background: form.mfa_habilitado ? '#0B22A1' : '#CED4DA',
                position: 'relative', transition: 'background 0.2s',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: form.mfa_habilitado ? 21 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
            </div>
          </div>
          <div className="user-modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #E5E7EB', background: '#F8FAFF', borderRadius: '0 0 16px 16px' }}>
            <button type="button" onClick={onClose} style={S.btnGhost}>Cancelar</button>
            <button type="submit" style={S.btnPrimary}>
              <Check size={14} /> {usuario ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Panel de edición de permisos de rol ──────────────────────
function RolPermisoEditor({ rolKey, rolCfg, onSave, onCancel }) {
  const [modulos, setModulos] = useState([...rolCfg.modulos]);

  const toggle = (key) => {
    setModulos(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const hasChanged = JSON.stringify([...modulos].sort()) !== JSON.stringify([...rolCfg.modulos].sort());

  return (
    <div style={{ background: '#F0F4FF', border: `2px solid ${rolCfg.color}`, borderRadius: '12px', padding: '20px', marginBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: rolCfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: rolCfg.color }}>
            <Key size={16} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#212529' }}>{rolCfg.label}</div>
            <div style={{ fontSize: '11px', color: '#6C757D' }}>{rolCfg.descripcion}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCancel} style={{ ...S.btnGhost, padding: '6px 12px', fontSize: '12px' }}>
            <X size={13} /> Cancelar
          </button>
          <button onClick={() => onSave(modulos)} disabled={!hasChanged} style={{ ...S.btnPrimary, padding: '6px 12px', fontSize: '12px', opacity: hasChanged ? 1 : 0.4 }}>
            <Save size={13} /> Guardar
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
        {MODULOS_LIST.map(m => {
          const active = modulos.includes(m.key);
          return (
            <button key={m.key} onClick={() => toggle(m.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px',
                border: `1.5px solid ${active ? rolCfg.color : '#DEE2E6'}`,
                borderRadius: '8px', background: active ? rolCfg.bg : '#FFFFFF',
                cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                color: active ? rolCfg.color : '#9CA3AF', transition: 'all 0.15s', textAlign: 'left',
              }}>
              <div style={{
                width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                border: `2px solid ${active ? rolCfg.color : '#DEE2E6'}`,
                background: active ? rolCfg.color : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {active && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
              </div>
              {m.label}
            </button>
          );
        })}
      </div>

      {!hasChanged && (
        <p style={{ margin: '12px 0 0', fontSize: '11px', color: '#6C757D', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <AlertTriangle size={12} /> Modifica los permisos para habilitar el guardado
        </p>
      )}
    </div>
  );
}

// ─── ControlAcceso ────────────────────────────────────────────
export default function ControlAcceso() {
  const { api, usuarios, setUsuarios, rolesConfig, updateRoleModulos, saveRole, deleteRole } = useContext(AuthContext);
  const { showToast } = useNotification();
  const [tab, setTab] = useState('usuarios');
  const [search, setSearch] = useState('');
  const [filtroRol, setFiltroRol] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingRol, setEditingRol] = useState(null);
  const [savedMsg, setSavedMsg] = useState('');
  const [rolModal, setRolModal] = useState(null); // null | { mode: 'create'|'edit', rolKey, rolData }
  const [auditLog, setAuditLog] = useState([]);

  const currentRolesConfig = rolesConfig || ROLES_CONFIG;
  const localUsuarios = usuarios || DEMO_USERS;

  useEffect(() => {
    if (tab !== 'auditoria') return;
    api.get('/api/seguridad/auditoria', { params: { limit: 50 } }).then(response => {
      setAuditLog((response.data.data || []).map(entry => ({
        id: entry.id_auditoria,
        desc: `${entry.metodo} ${entry.ruta} · HTTP ${entry.estado_http}`,
        user: entry.actor || 'anonymous',
        fecha: new Date(entry.fecha).toLocaleString('es-PE'),
        tipo: entry.estado_http >= 400 ? 'ALERTA' : 'OPERACIÓN',
        color: entry.estado_http >= 400 ? '#DC2626' : '#059669',
        icon: entry.estado_http >= 400 ? <AlertTriangle size={15}/> : <Unlock size={15}/>,
      })));
    }).catch(error => showToast(error.response?.data?.error || 'No se pudo cargar la auditoría.', 'error'));
  }, [tab, api, showToast]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return localUsuarios.filter(u => {
      const matchSearch = !q || (u.nombres || '').toLowerCase().includes(q) || (u.apellidos || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
      const matchRol = filtroRol === 'TODOS' || u.rol === filtroRol;
      const matchEstado = filtroEstado === 'TODOS' || u.estado === filtroEstado;
      return matchSearch && matchRol && matchEstado;
    });
  }, [localUsuarios, search, filtroRol, filtroEstado]);

  const handleSave = async (usuario) => {
    try {
      const payload = {
        username: usuario.username,
        password: usuario.password || undefined,
        rol: usuario.rol,
        estado: usuario.estado,
        mfa_habilitado: Boolean(usuario.mfa_habilitado),
      };
      const response = usuario.id && !usuario.id.startsWith('u')
        ? await api.put(`/api/usuarios/${usuario.id}`, payload)
        : await api.post('/api/usuarios', payload);
      const saved = response.data.data;
      setUsuarios(localUsuarios.find(u => u.id === saved.id)
        ? localUsuarios.map(u => u.id === saved.id ? saved : u)
        : [...localUsuarios, saved]);
    } catch (error) {
      const data = error.response?.data;
      const details = Array.isArray(data?.details) ? data.details.map(item => item.message).join(' ') : '';
      showToast(details || data?.mensaje || data?.error || 'No se pudo guardar el usuario.', 'error');
      return;
    }
    setModal(null);
    showToast('Usuario guardado correctamente.', 'success');
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/api/usuarios/${id}`); }
    catch (error) { showToast(error.response?.data?.mensaje || error.response?.data?.error || 'No se pudo eliminar el usuario.', 'error'); return; }
    setUsuarios(localUsuarios.filter(u => u.id !== id));
    setConfirmDelete(null);
    showToast('Usuario eliminado correctamente.', 'success');
  };

  const toggleEstado = async (usuario) => {
    const updated = { ...usuario, estado: usuario.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' };
    try { await api.patch(`/api/usuarios/${usuario.id}`, { estado: updated.estado }); }
    catch (error) { showToast(error.response?.data?.mensaje || error.response?.data?.error || 'No se pudo actualizar el estado.', 'error'); return; }
    setUsuarios(localUsuarios.map(u => u.id === usuario.id ? updated : u));
    showToast(`Usuario ${updated.estado === 'ACTIVO' ? 'activado' : 'desactivado'} correctamente.`, 'success');
  };

  const handleSavePermisos = (rolKey, newModulos) => {
    updateRoleModulos(rolKey, newModulos);
    setEditingRol(null);
    setSavedMsg(`Permisos de ${currentRolesConfig[rolKey].label} actualizados`);
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const resetRolPermisos = (rolKey) => {
    updateRoleModulos(rolKey, [...ROLES_CONFIG[rolKey].modulos]);
    setSavedMsg(`Permisos de ${currentRolesConfig[rolKey].label} restaurados al valor por defecto`);
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const statCards = [
    { label: 'Total usuarios', value: localUsuarios.length, color: '#0B22A1', bg: 'rgba(11,34,161,0.08)', icon: <Users size={18} /> },
    { label: 'Activos', value: localUsuarios.filter(u => u.estado === 'ACTIVO').length, color: '#059669', bg: 'rgba(5,150,105,0.08)', icon: <Unlock size={18} /> },
    { label: 'Inactivos', value: localUsuarios.filter(u => u.estado !== 'ACTIVO').length, color: '#DC2626', bg: 'rgba(220,38,38,0.08)', icon: <Lock size={18} /> },
    { label: 'Roles configurados', value: Object.keys(currentRolesConfig).length, color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', icon: <Shield size={18} /> },
  ];

  const TABS = [
    { key: 'usuarios', label: 'Usuarios y Operadores' },
    { key: 'roles', label: 'Roles y Permisos' },
    { key: 'auditoria', label: 'Auditoría de Accesos' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Shield size={18} color="#0B22A1" />
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#0B22A1', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Administración</span>
          </div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#212529', letterSpacing: '-0.5px' }}>Control de Acceso</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6C757D' }}>Gestión de usuarios, roles y permisos de módulos del sistema</p>
        </div>
        <button onClick={() => setModal({ mode: 'create' })} style={S.btnPrimary}>
          <Plus size={15} /> Nuevo usuario
        </button>
      </div>

      {/* ── Toast ──────────────────────────────────────────── */}
      {savedMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.25)', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#059669' }}>
          <Check size={15} /> {savedMsg}
        </div>
      )}

      {/* ── KPI cards ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {statCards.map((c, i) => (
          <div key={i} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, flexShrink: 0 }}>
              {c.icon}
            </div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#212529', lineHeight: 1, letterSpacing: '-1px' }}>{c.value}</div>
              <div style={{ fontSize: '12px', color: '#6C757D', marginTop: '2px' }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #E5E7EB' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '10px 20px', fontSize: '13px', fontWeight: tab === t.key ? '700' : '500', color: tab === t.key ? '#0B22A1' : '#6C757D', background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid #0B22A1' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.15s', marginBottom: '-2px', letterSpacing: '-0.1px' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════ TAB: USUARIOS ════════════════════════════════ */}
      {tab === 'usuarios' && (
        <>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, usuario o correo..."
                style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #DEE2E6', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter, sans-serif', color: '#212529', outline: 'none', background: '#FFFFFF', boxSizing: 'border-box' }} />
            </div>
            <select className="professional-select" value={filtroRol} onChange={e => setFiltroRol(e.target.value)} style={{ ...S.select, flex: '0 0 180px', width: '180px', paddingRight: '42px' }}>
              <option value="TODOS">Todos los roles</option>
              {Object.entries(currentRolesConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="professional-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ ...S.select, flex: '0 0 190px', width: '190px', paddingRight: '42px' }}>
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
            </select>
            {(search || filtroRol !== 'TODOS' || filtroEstado !== 'TODOS') && (
              <button onClick={() => { setSearch(''); setFiltroRol('TODOS'); setFiltroEstado('TODOS'); }}
                style={{ padding: '9px 14px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#6C757D', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <X size={13} /> Limpiar
              </button>
            )}
            <span style={{ fontSize: '12px', color: '#6C757D', marginLeft: 'auto' }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Tabla */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8F9FA' }}>
                  {['Operador', 'Correo', 'Rol', 'Sede', 'Módulos', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '800', color: '#6C757D', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                    <Shield size={28} color="#DEE2E6" style={{ display: 'block', margin: '0 auto 10px' }} />
                    No se encontraron operadores
                  </td></tr>
                ) : filtered.map((u, i) => {
                  const rolCfg = currentRolesConfig[u.rol] || { modulos: [] };
                  return (
                    <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F3F4F6' : 'none', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: (currentRolesConfig[u.rol] || ROLES_CONFIG.ASESOR).bg, color: (currentRolesConfig[u.rol] || ROLES_CONFIG.ASESOR).color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', flexShrink: 0 }}>
                            {(u.nombres || '?')[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#212529' }}>{u.nombres} {u.apellidos}</div>
                            <div style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace' }}>@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6C757D' }}>{u.email || '—'}</td>
                      <td style={{ padding: '12px 16px' }}><RoleBadge rol={u.rol} rolesConfig={currentRolesConfig} /></td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#212529', fontWeight: '600' }}>{u.sede || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', maxWidth: '200px' }}>
                          {rolCfg.modulos.slice(0, 3).map(m => (
                            <span key={m} style={{ fontSize: '9px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: '#EEF2FF', color: '#3730A3', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                              {MODULOS[m]?.label || m}
                            </span>
                          ))}
                          {rolCfg.modulos.length > 3 && (
                            <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: '#F3F4F6', color: '#9CA3AF' }}>
                              +{rolCfg.modulos.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}><EstadoBadge estado={u.estado} /></td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => toggleEstado(u)} title={u.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                            style={{ ...S.iconBtn, color: u.estado === 'ACTIVO' ? '#DC2626' : '#059669' }}>
                            {u.estado === 'ACTIVO' ? <Lock size={13} /> : <Unlock size={13} />}
                          </button>
                          <button onClick={() => setModal({ mode: 'edit', usuario: u })} style={{ ...S.iconBtn, color: '#0B22A1' }}>
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => setConfirmDelete(u)} style={{ ...S.iconBtn, color: '#DC2626' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ════ TAB: ROLES Y PERMISOS ════════════════════════ */}
      {tab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#6C757D' }}>
              Configura qué módulos puede acceder cada rol. Haz clic en <strong>Editar</strong> para modificar o crear nuevos roles.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { Object.keys(ROLES_CONFIG).forEach(k => resetRolPermisos(k)); setEditingRol(null); }}
                style={{ ...S.btnGhost, padding: '7px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RotateCcw size={13} /> Restaurar por defecto
              </button>
              <button onClick={() => setRolModal({ mode: 'create', rolKey: '', rolData: { label: '', descripcion: '', color: '#2563eb', bg: 'rgba(37,99,235,0.1)', modulos: [] } })}
                style={{ ...S.btnPrimary, padding: '7px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={13} /> Crear Rol
              </button>
            </div>
          </div>

          {/* Tabla de permisos */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#F8F9FA' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '800', color: '#6C757D', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid #E5E7EB', width: '200px' }}>ROL</th>
                  {MODULOS_LIST.map(m => (
                    <th key={m.key} style={{ padding: '12px 10px', textAlign: 'center', fontSize: '10px', fontWeight: '800', color: '#6C757D', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid #E5E7EB' }}>{m.label}</th>
                  ))}
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '10px', fontWeight: '800', color: '#6C757D', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid #E5E7EB' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(currentRolesConfig).map(([rolKey, rolCfg], i, arr) => (
                  <tr key={rolKey} style={{ borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none', background: editingRol === rolKey ? '#FAFBFF' : 'transparent' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <RoleBadge rol={rolKey} rolesConfig={currentRolesConfig} />
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '3px' }}>
                        {localUsuarios.filter(u => u.rol === rolKey).length} usuario{localUsuarios.filter(u => u.rol === rolKey).length !== 1 ? 's' : ''}
                      </div>
                    </td>
                    {MODULOS_LIST.map(m => {
                      const tiene = rolCfg.modulos.includes(m.key);
                      return (
                        <td key={m.key} style={{ padding: '14px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: tiene ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.06)', color: tiene ? '#059669' : '#DC2626' }}>
                            {tiene ? <Check size={12} strokeWidth={2.5} /> : <X size={12} strokeWidth={2.5} />}
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button onClick={() => setEditingRol(editingRol === rolKey ? null : rolKey)}
                          style={{ ...S.btnGhost, padding: '5px 10px', fontSize: '11px', fontWeight: '700', color: '#0B22A1', borderColor: '#0B22A1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Edit2 size={11} /> Permisos
                        </button>
                        <button onClick={() => setRolModal({ mode: 'edit', rolKey, rolData: { label: rolCfg.label, descripcion: rolCfg.descripcion || '', color: rolCfg.color, bg: rolCfg.bg, modulos: rolCfg.modulos } })}
                          style={{ ...S.btnGhost, padding: '5px 10px', fontSize: '11px', fontWeight: '700', color: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Edit2 size={11} /> Editar
                        </button>
                        <button onClick={() => resetRolPermisos(rolKey)} title="Restaurar permisos"
                          style={{ ...S.iconBtn, color: '#D97706', border: '1px solid #DEE2E6' }}>
                          <RotateCcw size={12} />
                        </button>
                        {!ROLES_CONFIG[rolKey] && (
                          <button onClick={() => setConfirmDelete({ type: 'role', rolKey, label: rolCfg.label })}
                            style={{ ...S.iconBtn, color: '#DC2626', border: '1px solid #DEE2E6' }}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Editor inline de permisos */}
          {editingRol && currentRolesConfig[editingRol] && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <ChevronRight size={14} color="#0B22A1" />
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0B22A1', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Editando permisos — {currentRolesConfig[editingRol].label}
                </span>
              </div>
              <RolPermisoEditor
                key={editingRol}
                rolKey={editingRol}
                rolCfg={currentRolesConfig[editingRol]}
                onSave={(mods) => handleSavePermisos(editingRol, mods)}
                onCancel={() => setEditingRol(null)}
              />
            </div>
          )}

          {/* Tarjetas resumen por rol */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginTop: '4px' }}>
            {Object.entries(currentRolesConfig).map(([rolKey, rolCfg]) => (
              <div key={rolKey} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <RoleBadge rol={rolKey} rolesConfig={currentRolesConfig} />
                  <span style={{ fontSize: '11px', color: '#6C757D' }}>{rolCfg.modulos.length}/{MODULOS_LIST.length} módulos</span>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#6C757D', lineHeight: '1.5' }}>{rolCfg.descripcion}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {MODULOS_LIST.map(m => {
                    const tiene = rolCfg.modulos.includes(m.key);
                    return (
                      <span key={m.key} style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', color: tiene ? rolCfg.color : '#C9CED6', background: tiene ? rolCfg.bg : '#F3F4F6', textTransform: 'uppercase' }}>
                        {m.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ MODAL: CREAR / EDITAR ROL ═════════════════════ */}
      {rolModal && (
        <div className="role-modal-overlay" onClick={() => setRolModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000, padding: 20 }}>
          <div className="role-modal-card" onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.15)', border: '1px solid #E5E7EB' }}>
            {/* Header */}
            <div className="role-modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid #E5E7EB', background: '#F8FAFF', borderRadius: '14px 14px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#212529' }}>{rolModal.mode === 'create' ? 'Crear nuevo rol' : `Editar rol — ${rolModal.rolData.label}`}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6C757D' }}>{rolModal.mode === 'create' ? 'Define el nombre, color y descripción del nuevo rol' : 'Modifica los datos del rol'}</p>
              </div>
              <button onClick={() => setRolModal(null)} style={{ background: '#F3F4F6', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: '#6C757D' }}><X size={18} /></button>
            </div>
            {/* Body */}
            <div className="role-modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {rolModal.mode === 'create' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6C757D', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Clave del rol <span style={{ color: '#DC3545' }}>*</span></label>
                  <input value={rolModal.rolKey} onChange={e => setRolModal(m => ({ ...m, rolKey: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))}
                    placeholder="Ej: SUPERVISOR"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #DEE2E6', borderRadius: 6, fontSize: 13, color: '#212529', outline: 'none', background: '#FAFAFA', boxSizing: 'border-box', fontFamily: 'monospace' }} />
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Solo letras mayúsculas, números y guión bajo.</p>
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6C757D', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Nombre del rol <span style={{ color: '#DC3545' }}>*</span></label>
                <input value={rolModal.rolData.label} onChange={e => setRolModal(m => ({ ...m, rolData: { ...m.rolData, label: e.target.value } }))}
                  placeholder="Ej: Supervisor de Campo"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #DEE2E6', borderRadius: 6, fontSize: 13, color: '#212529', outline: 'none', background: '#FAFAFA', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6C757D', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Descripción</label>
                <textarea value={rolModal.rolData.descripcion} onChange={e => setRolModal(m => ({ ...m, rolData: { ...m.rolData, descripcion: e.target.value } }))}
                  placeholder="Describe las responsabilidades de este rol..."
                  rows={2}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #DEE2E6', borderRadius: 6, fontSize: 13, color: '#212529', outline: 'none', background: '#FAFAFA', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6C757D', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Color del rol</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { color: '#2563eb', bg: 'rgba(37,99,235,0.1)', label: 'Azul' },
                    { color: '#059669', bg: 'rgba(5,150,105,0.1)', label: 'Verde' },
                    { color: '#DC2626', bg: 'rgba(220,38,38,0.1)', label: 'Rojo' },
                    { color: '#D97706', bg: 'rgba(217,119,6,0.1)', label: 'Naranja' },
                    { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)', label: 'Violeta' },
                    { color: '#0891B2', bg: 'rgba(8,145,178,0.1)', label: 'Cian' },
                    { color: '#BE185D', bg: 'rgba(190,24,93,0.1)', label: 'Rosa' },
                    { color: '#374151', bg: 'rgba(55,65,81,0.1)', label: 'Gris' },
                  ].map(c => (
                    <button key={c.color} type="button" onClick={() => setRolModal(m => ({ ...m, rolData: { ...m.rolData, color: c.color, bg: c.bg } }))}
                      title={c.label}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c.color, border: rolModal.rolData.color === c.color ? `3px solid #212529` : '3px solid transparent', cursor: 'pointer', transition: 'transform 0.1s', transform: rolModal.rolData.color === c.color ? 'scale(1.2)' : 'scale(1)' }} />
                  ))}
                </div>
              </div>
              {rolModal.mode === 'create' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6C757D', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Módulos con acceso</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {MODULOS_LIST.map(m => {
                      const selected = rolModal.rolData.modulos.includes(m.key);
                      return (
                        <button key={m.key} type="button"
                          onClick={() => setRolModal(prev => ({ ...prev, rolData: { ...prev.rolData, modulos: selected ? prev.rolData.modulos.filter(x => x !== m.key) : [...prev.rolData.modulos, m.key] } }))}
                          style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, border: `1px solid ${selected ? rolModal.rolData.color : '#DEE2E6'}`, background: selected ? rolModal.rolData.bg : '#F9FAFB', color: selected ? rolModal.rolData.color : '#6C757D', cursor: 'pointer', transition: 'all 0.15s' }}>
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="role-modal-footer" style={{ padding: '14px 24px', borderTop: '1px solid #E5E7EB', background: '#F8FAFF', borderRadius: '0 0 14px 14px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setRolModal(null)} style={S.btnGhost}>Cancelar</button>
              <button onClick={() => {
                const { mode, rolKey, rolData } = rolModal;
                if (!rolData.label.trim()) return showToast('Ingresa el nombre del rol.', 'warning');
                if (mode === 'create' && !rolKey.trim()) return showToast('Ingresa la clave del rol.', 'warning');
                if (mode === 'create' && currentRolesConfig[rolKey]) return showToast('La clave del rol ya existe. Usa una clave diferente.', 'warning');
                if (mode === 'create' && rolData.modulos.length === 0) return showToast('Selecciona al menos un módulo para el nuevo rol.', 'warning');
                const key = mode === 'create' ? rolKey : rolModal.rolKey;
                saveRole(key, rolData, mode === 'create');
                setSavedMsg(mode === 'create' ? `Rol "${rolData.label}" creado` : `Rol "${rolData.label}" actualizado`);
                setTimeout(() => setSavedMsg(''), 3000);
                setRolModal(null);
              }} style={{ ...S.btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Save size={13} /> {rolModal.mode === 'create' ? 'Crear rol' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ TAB: AUDITORÍA ════════════════════════════════ */}
      {tab === 'auditoria' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '800', color: '#212529' }}>Registro de Accesos y Cambios</h3>
            <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#6C757D' }}>Historial de operaciones críticas del sistema</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {auditLog.map((entry, i) => (
                <div key={entry.id} style={{ display: 'flex', gap: '14px', padding: '12px 0', borderBottom: i < auditLog.length - 1 ? '1px solid #F3F4F6' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: entry.color + '12', color: entry.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                    {entry.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#212529', marginBottom: '2px' }}>{entry.desc}</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{entry.user} · {entry.fecha}</div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px', background: entry.color + '14', color: entry.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {entry.tipo}
                  </span>
                </div>
              ))}
              {!auditLog.length && <div style={{ padding: '24px', textAlign: 'center', color: '#6C757D' }}>No hay operaciones auditadas para mostrar.</div>}
            </div>
          </div>

          {/* Resumen por rol */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            {Object.entries(currentRolesConfig).map(([rolKey, rolCfg]) => {
              const count = localUsuarios.filter(u => u.rol === rolKey).length;
              return (
                <div key={rolKey} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <RoleBadge rol={rolKey} rolesConfig={currentRolesConfig} />
                    <span style={{ fontSize: '20px', fontWeight: '800', color: '#212529' }}>{count}</span>
                  </div>
                  <div style={{ height: '4px', background: '#F3F4F6', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${count > 0 ? Math.min((count / localUsuarios.length) * 100, 100) : 0}%`, background: rolCfg.color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px' }}>
                    {count > 0 ? `${Math.round((count / localUsuarios.length) * 100)}% del total` : 'Sin usuarios'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <ModalUsuario
          usuario={modal.mode === 'edit' ? modal.usuario : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
          rolesConfig={currentRolesConfig}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(33,37,41,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', width: '100%', maxWidth: 380, padding: '24px', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#DC2626' }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#212529', letterSpacing: '-0.3px' }}>{confirmDelete.type === 'role' ? 'Eliminar rol' : 'Eliminar usuario'}</h4>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6C757D', lineHeight: '1.5' }}>
                  ¿Confirma la eliminación de <strong style={{ color: '#212529' }}>{confirmDelete.type === 'role' ? confirmDelete.label : `${confirmDelete.nombres} ${confirmDelete.apellidos}`}</strong>? Esta acción es irreversible.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={S.btnGhost}>Cancelar</button>
              <button onClick={() => {
                if (confirmDelete.type === 'role') {
                  deleteRole(confirmDelete.rolKey);
                  showToast(`Rol "${confirmDelete.label}" eliminado.`, 'success');
                  setConfirmDelete(null);
                } else {
                  handleDelete(confirmDelete.id);
                }
              }} style={{ ...S.btnPrimary, background: '#DC2626' }}>
                <Trash2 size={13} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Audit log mock ───────────────────────────────────────────
const AUDIT_LOG = [
  { desc: 'Inicio de sesión exitoso', user: 'Carlos Mendoza (admin)', fecha: 'Hoy, 09:14 am', tipo: 'ACCESO', color: '#059669', icon: <Unlock size={15} /> },
  { desc: 'Permisos de Supervisor modificados — se añadió módulo Admisión', user: 'Carlos Mendoza (admin)', fecha: 'Hoy, 09:02 am', tipo: 'CONFIG', color: '#0B22A1', icon: <Shield size={15} /> },
  { desc: 'Nuevo usuario creado: Sandra Huanca (Asesor)', user: 'Carlos Mendoza (admin)', fecha: 'Ayer, 04:37 pm', tipo: 'CREACIÓN', color: '#7C3AED', icon: <Plus size={15} /> },
  { desc: 'Usuario Roberto Flores desactivado', user: 'Patricia Salcedo (gerente)', fecha: 'Ayer, 02:15 pm', tipo: 'BLOQUEO', color: '#DC2626', icon: <Lock size={15} /> },
  { desc: 'Inicio de sesión fallido — credenciales inválidas', user: 'IP: 192.168.1.45', fecha: 'Ayer, 10:08 am', tipo: 'ALERTA', color: '#D97706', icon: <AlertTriangle size={15} /> },
  { desc: 'Contraseña de auditor@radar360.pe actualizada', user: 'Carlos Mendoza (admin)', fecha: '03/08/2026, 11:30 am', tipo: 'SEGURIDAD', color: '#0891B2', icon: <Key size={15} /> },
  { desc: 'Módulo Rutas deshabilitado para rol Auditor', user: 'Carlos Mendoza (admin)', fecha: '02/08/2026, 03:45 pm', tipo: 'CONFIG', color: '#0B22A1', icon: <Shield size={15} /> },
];

const S = {
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
    background: '#0B22A1', color: '#FFFFFF', border: 'none', borderRadius: '8px',
    fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.1px',
  },
  btnGhost: {
    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
    background: '#FFFFFF', color: '#212529', border: '1px solid #DEE2E6', borderRadius: '8px',
    fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  },
  iconBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '28px', height: '28px', background: 'transparent', border: '1px solid #E5E7EB',
    borderRadius: '6px', cursor: 'pointer', transition: 'background 0.12s',
  },
  select: {
    padding: '9px 12px', border: '1px solid #DEE2E6', borderRadius: '8px', fontSize: '13px',
    color: '#212529', fontFamily: 'Inter, sans-serif', background: '#FFFFFF', cursor: 'pointer',
  },
};
