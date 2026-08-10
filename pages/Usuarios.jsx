import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

export default function Usuarios() {
  const { user } = useContext(AuthContext);
  return <div className="module-page"><div className="module-heading"><div><span className="eyebrow">ADMINISTRACION</span><h1>Usuarios</h1><p>Consulta el acceso actual y mantén la operación bajo control.</p></div><span className="module-status">Módulo seguro</span></div><section className="module-card user-panel"><div className="user-avatar">{user?.nombres?.[0]?.toUpperCase() || 'A'}</div><div><span className="eyebrow">SESION ACTIVA</span><h2>{user?.nombres || user?.username || 'Administrador'} {user?.apellidos || ''}</h2><p>Rol: <strong>{user?.rol || 'ADMIN'}</strong></p><p className="text-muted">Las credenciales y permisos se validan en el backend al iniciar sesión.</p></div></section><div className="module-kpis"><div><strong>Activo</strong><span>Estado de la cuenta</span></div><div><strong>Admin</strong><span>Nivel de acceso</span></div><div><strong>2</strong><span>Sedes disponibles</span></div></div></div>;
}
