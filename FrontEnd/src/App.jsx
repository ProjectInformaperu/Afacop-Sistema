import React, { useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from './context/AuthContext.jsx';
import { ROLES_CONFIG } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MapPage from './pages/Map.jsx';
import Clientes from './pages/Clientes.jsx';
import Workers from './pages/Workers.jsx';
import WorkerDetail from './pages/WorkerDetail.jsx';
import Rutas from './pages/Rutas.jsx';
import Admision from './pages/Admision.jsx';
import ControlAcceso from './pages/ControlAcceso.jsx';
import Calidad from './pages/Calidad.jsx';
import NotificationCenter from './components/NotificationCenter.jsx';
import './index.css';
import './App.css';
import logoRadar from './assets/logo-radar-360.png';

// ─── Icons ────────────────────────────────────────────────────
const Icon = ({ name, size = 16 }) => {
  const icons = {
    dashboard: <path d="M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z" />,
    map: <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11z" />,
    clients: <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />,
    workers: <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />,
    routes: <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />,
    admision: <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />,
    shield: <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />,
    logout: <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4z" />,
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      {icons[name] || icons.dashboard}
    </svg>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────
function Sidebar() {
  const { sedeActual, cambiarSede, user, tieneAcceso, rolesConfig } = useContext(AuthContext);
  const [showSedeMenu, setShowSedeMenu] = React.useState(false);
  const sedeDropdownRef = React.useRef(null);

  const sedesList = [
    { id: '11111111-1111-1111-1111-000000000001', nombre: 'Lima' },
    { id: '11111111-1111-1111-1111-000000000002', nombre: 'Arequipa' },
  ];

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (sedeDropdownRef.current && !sedeDropdownRef.current.contains(event.target)) {
        setShowSedeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const can = (mod) => tieneAcceso(mod);
  const rolCfg = user ? (rolesConfig || ROLES_CONFIG)[user.rol] : null;

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ padding: '20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <img src={logoRadar} alt="Logo Radar 360" style={{ height: '44px', width: 'auto' }} />
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px', lineHeight: 1 }}>
            Mi Radar<span style={{ fontSize: '18px', opacity: 0.9 }}> 360°</span>
          </h2>
        </div>

        <div style={{ position: 'relative' }} ref={sedeDropdownRef}>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginBottom: '5px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>SEDE ACTUAL</div>
          <button onClick={() => setShowSedeMenu(!showSedeMenu)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: '#FEFEFE', fontSize: '11px', fontWeight: '800', height: '34px', padding: '0 12px', border: '1px solid #FEFEFE', borderRadius: '8px', color: 'var(--c-primary)', cursor: 'pointer' }}>
            <span>{sedeActual.nombre}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: showSedeMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.8 }}><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {showSedeMenu && (
            <div style={{ position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, backgroundColor: '#FEFEFE', borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 9999, overflow: 'hidden' }}>
              {sedesList.map(s => (
                <button key={s.id} onClick={() => { cambiarSede(s); setShowSedeMenu(false); }}
                  style={{ display: 'block', width: '100%', padding: '9px 12px', textAlign: 'left', background: s.nombre === sedeActual.nombre ? '#F0F4FF' : 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '800', color: s.nombre === sedeActual.nombre ? 'var(--c-primary)' : '#333333' }}>
                  {s.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-content" style={{ flex: 1, overflowY: 'auto', paddingBottom: '12px' }}>
        <div className="sidebar-subtitle">MONITOREO</div>
        <ul className="sidebar-nav">
          {can('principal') && <li><NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}><Icon name="dashboard" />Principal</NavLink></li>}
          {can('mapa')      && <li><NavLink to="/map"       className={({ isActive }) => isActive ? 'active' : ''}><Icon name="map" />Mapa</NavLink></li>}
        </ul>

        <div className="sidebar-subtitle">CRÉDITO</div>
        <ul className="sidebar-nav">
          {can('admision') && <li><NavLink to="/admision" className={({ isActive }) => isActive ? 'active' : ''}><Icon name="admision" />Evaluación y Admisión</NavLink></li>}
          {can('clientes') && <li><NavLink to="/clientes" className={({ isActive }) => isActive ? 'active' : ''}><Icon name="clients" />Clientes</NavLink></li>}
          {can('rutas')    && <li><NavLink to="/rutas"    className={({ isActive }) => isActive ? 'active' : ''}><Icon name="routes" />Rutas</NavLink></li>}
        </ul>

        <div className="sidebar-subtitle">OPERACIONES</div>
        <ul className="sidebar-nav">
          {can('asesores') && <li><NavLink to="/workers"  className={({ isActive }) => isActive ? 'active' : ''}><Icon name="workers" />Gestión de Asesores</NavLink></li>}
        </ul>

        {can('acceso') && (
          <>
            <div className="sidebar-subtitle">ADMINISTRACIÓN</div>
            <ul className="sidebar-nav">
              <li><NavLink to="/acceso" className={({ isActive }) => isActive ? 'active' : ''}><Icon name="shield" />Control de Acceso</NavLink></li>
            </ul>
          </>
        )}
      </div>

    </aside>
  );
}

// ─── Topbar ───────────────────────────────────────────────────
function Topbar({ title }) {
  const { user, logout, rolesConfig: topbarRolesConfig } = useContext(AuthContext);
  const [showMenu, setShowMenu] = React.useState(false);
  const navigate = useNavigate();
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const rolCfg = user ? (topbarRolesConfig || ROLES_CONFIG)[user.rol] : null;

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-title">{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: '#F8F9FA', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>📅</span>
        <span style={{ fontSize: '11px', fontWeight: '600', color: '#6C757D', letterSpacing: '0.2px' }}>{dateStr}</span>
      </div>
      <div className="topbar-right">
        <div className="profile-container" ref={dropdownRef}>
          <button className="profile-trigger" onClick={() => setShowMenu(!showMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '14px', border: '1px solid var(--c-border)', transition: 'all 0.2s' }}>
            <div className="avatar-small">{user?.nombres ? user.nombres[0].toUpperCase() : 'A'}</div>
            <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--c-text)' }}>
                {user?.nombres ? user.nombres.split(' ')[0] : (user?.username || 'Admin')}
              </div>
              {rolCfg && (
                <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: rolCfg.color }}>
                  {rolCfg.label}
                </div>
              )}
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: showMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.5 }}><path d="M6 9l6 6 6-6" /></svg>
          </button>

          {showMenu && (
            <div className="profile-dropdown" style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: '240px', backgroundColor: 'var(--c-surface)', borderRadius: '16px', border: '1px solid var(--c-border)', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 9999, padding: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '12px', borderBottom: '1px solid var(--c-border)', marginBottom: '4px' }}>
                {rolCfg && (
                  <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: '700', color: rolCfg.color, background: rolCfg.bg, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                    {rolCfg.label}
                  </span>
                )}
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--c-text)' }}>{user?.nombres} {user?.apellidos}</p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--c-muted)' }}>{user?.email || user?.username}</p>
              </div>
              <button onClick={handleLogout}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', color: 'var(--c-danger)', fontSize: '13px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'rgba(220,53,69,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="logout" size={15} />
                </div>
                <span style={{ fontWeight: '700' }}>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Protected layout ─────────────────────────────────────────
function AppLayout({ children, title, pageClass = '' }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area fade-in">
        <Topbar title={title} />
        <main className={`page-content ${pageClass}`.trim()}>{children}</main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, title, pageClass, moduloKey }) {
  const { isAuthenticated, tieneAcceso } = useContext(AuthContext);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (moduloKey && !tieneAcceso(moduloKey)) return <Navigate to="/dashboard" replace />;
  return <AppLayout title={title} pageClass={pageClass}>{children}</AppLayout>;
}

function ModuleRoutes() {
  const location = useLocation();

  return (
    <Routes location={location} key={location.key}>
      <Route path="/login"    element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute title="Principal"  pageClass="page-content--dashboard" moduloKey="principal"><Dashboard /></ProtectedRoute>} />
      <Route path="/map"       element={<ProtectedRoute title="Mapa" pageClass="page-content--map" moduloKey="mapa"><MapPage /></ProtectedRoute>} />
      <Route path="/clientes"  element={<ProtectedRoute title="Clientes"   moduloKey="clientes"><Clientes /></ProtectedRoute>} />
      <Route path="/workers"   element={<ProtectedRoute title="Asesores"   moduloKey="asesores"><Workers /></ProtectedRoute>} />
      <Route path="/workers/:id" element={<ProtectedRoute title="Detalle Asesor" moduloKey="asesores"><WorkerDetail /></ProtectedRoute>} />
      <Route path="/admision"  element={<ProtectedRoute title="Admisión"   moduloKey="admision"><Admision /></ProtectedRoute>} />
      <Route path="/rutas"     element={<ProtectedRoute title="Rutas"      moduloKey="rutas"><Rutas /></ProtectedRoute>} />
      <Route path="/acceso"    element={<ProtectedRoute title="Control de Acceso" moduloKey="acceso"><ControlAcceso /></ProtectedRoute>} />
      <Route path="/calidad"   element={<ProtectedRoute title="Calidad ISO 9001" moduloKey="calidad"><Calidad /></ProtectedRoute>} />
      <Route path="*"          element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <NotificationCenter />
      <ModuleRoutes />
    </Router>
  );
}
