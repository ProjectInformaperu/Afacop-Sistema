import React, { createContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const MODULOS = {
  principal: { key: "principal", label: "Principal", path: "/dashboard" },
  mapa: { key: "mapa", label: "Mapa", path: "/map" },
  clientes: { key: "clientes", label: "Clientes", path: "/clientes" },
  asesores: { key: "asesores", label: "Asesores", path: "/workers" },
  admision: { key: "admision", label: "Admisión", path: "/admision" },
  rutas: { key: "rutas", label: "Rutas", path: "/rutas" },
  acceso: { key: "acceso", label: "Control de Acceso", path: "/acceso" },
  calidad: { key: "calidad", label: "Calidad ISO 9001", path: "/calidad" },
};

export const ROLES_CONFIG = {
  ADMINISTRADOR: { label: "Administrador", color: "#0B22A1", bg: "rgba(11,34,161,0.1)", modulos: Object.keys(MODULOS), descripcion: "Acceso completo a todos los módulos y configuración del sistema." },
  GERENTE: { label: "Gerente", color: "#7C3AED", bg: "rgba(124,58,237,0.1)", modulos: ["principal", "mapa", "clientes", "asesores", "admision", "rutas"], descripcion: "Visibilidad total operativa sin acceso al control de usuarios." },
  SUPERVISOR: { label: "Supervisor", color: "#0891B2", bg: "rgba(8,145,178,0.1)", modulos: ["principal", "mapa", "clientes", "asesores", "rutas"], descripcion: "Supervisión de campo: rutas, asesores y clientes." },
  ASESOR: { label: "Asesor", color: "#059669", bg: "rgba(5,150,105,0.1)", modulos: ["principal", "clientes"], descripcion: "Acceso solo a su cartera de clientes asignada." },
  AUDITOR: { label: "Auditor", color: "#D97706", bg: "rgba(217,119,6,0.1)", modulos: ["principal", "clientes", "admision"], descripcion: "Solo lectura para auditoría de clientes y admisión." },
};

// El SGC es editable por dirección/supervisión y de solo lectura para auditoría.
for (const role of ["GERENTE", "SUPERVISOR", "AUDITOR"]) {
  if (!ROLES_CONFIG[role].modulos.includes("calidad")) ROLES_CONFIG[role].modulos.push("calidad");
}

// Se conserva el export para componentes administrativos antiguos; los usuarios
// visibles ahora siempre provienen del endpoint protegido del backend.
export const DEMO_USERS = [];

const FIXED_THEME_VARS = {
  "--c-sidebar-bg": "#0B22A1", "--c-sidebar-text": "#FFFFFF", "--c-bg": "#F5F7FB",
  "--c-surface": "#FFFFFF", "--c-surface-2": "#F8F9FA", "--c-border": "#DEE2E6",
  "--c-text": "#212529", "--c-muted": "#6C757D", "--c-muted-2": "#9CA3AF",
  "--c-primary": "#0B22A1", "--c-primary-h": "#233CC4", "--c-primary-rgb": "11, 34, 161",
  "--c-on-primary": "#FFFFFF", "--logo-filter": "none", "--font-main": "Inter",
};

const DEFAULT_SEDE = { id: "11111111-1111-1111-1111-000000000001", nombre: "Lima" };
const PRODUCTION_API_URL = "https://afacop-backend.onrender.com";

function getApiUrl() {
  if (typeof window !== "undefined" && window.location.hostname.endsWith('.devtunnels.ms')) {
    // VS Code conserva el identificador del túnel y cambia el sufijo del puerto.
    // Así evitamos HTTPS -> HTTP localhost (CORS/Mixed Content) al abrir el portal remoto.
    const backendHost = window.location.hostname.replace(/-5173(?=\.)/, '-4001');
    return `https://${backendHost}`;
  }
  // Los builds desplegados usan un unico endpoint verificado. Esto impide que
  // una variable antigua del panel de Render vuelva a dirigir el login a otro servicio.
  if (import.meta.env.PROD) return PRODUCTION_API_URL;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/$/, "");
  if (typeof window === "undefined") return "http://localhost:4000";
  return `http://${window.location.hostname}:4000`;
}

function normalizeUser(user) {
  if (!user) return user;
  return { ...user, rol: user.rol === "ADMIN" ? "ADMINISTRADOR" : user.rol === "WORKER" ? "ASESOR" : user.rol };
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(() => Boolean(localStorage.getItem("token")));
  const [usuarios, setUsuarios] = useState([]);
  const [sedeActual, setSedeActual] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sedeActual")) || DEFAULT_SEDE; } catch { return DEFAULT_SEDE; }
  });
  const [rolesConfig, setRolesConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rolesConfig")) || ROLES_CONFIG; } catch { return ROLES_CONFIG; }
  });
  const API_BASE_URL = getApiUrl();

  const api = useMemo(() => axios.create({
    baseURL: API_BASE_URL,
    headers: { "x-sede-id": sedeActual?.id },
  }), [API_BASE_URL, sedeActual?.id]);

  useEffect(() => {
    const interceptor = api.interceptors.request.use(config => {
      if (token) config.headers.Authorization = `Bearer ${token}`;
      if (sedeActual?.id) config.headers["x-sede-id"] = sedeActual.id;
      if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
      return config;
    });
    return () => api.interceptors.request.eject(interceptor);
  }, [api, token, sedeActual?.id]);

  const login = async (username, password) => {
    const response = await api.post("/api/auth/login", { username: username.trim().toLowerCase(), password });
    if (response.data.mfaEnrollmentRequired) {
      const setup = await api.post('/api/auth/mfa/enroll/setup', { challengeToken: response.data.challengeToken });
      return { ...response.data, ...setup.data };
    }
    if (response.data.mfaRequired) return response.data;
    return completeLogin(response.data);
  };

  const completeLogin = data => {
    const loggedUser = normalizeUser(data.user);
    if (data.user?.rol === "WORKER") throw new Error("Solo los administradores pueden acceder a este portal web.");
    setToken(data.token);
    setUser(loggedUser);
    setSessionLoading(false);
    localStorage.setItem("token", data.token);
    return data;
  };

  const verifyMfa = async (challengeToken, code) => {
    const response = await api.post("/api/auth/mfa/verify", { challengeToken, code });
    return completeLogin(response.data);
  };

  const confirmMfaEnrollment = async (challengeToken, code) => {
    const response = await api.post('/api/auth/mfa/enroll/confirm', { challengeToken, code });
    return completeLogin(response.data);
  };

  const logout = () => {
    if (token) api.post('/api/auth/logout').catch(() => {});
    setToken(null); setUser(null); setUsuarios([]); localStorage.removeItem("token");
    setSessionLoading(false);
  };

  useEffect(() => {
    if (!token) {
      setSessionLoading(false);
      return;
    }
    let active = true;
    // En una recarga completa, la validación puede ejecutarse en el mismo ciclo
    // en que se registra el interceptor. Enviamos el token explícitamente para
    // que la restauración de sesión no dependa del orden de esos efectos.
    api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (active) setUser(normalizeUser(res.data.user)); })
      .catch(error => {
        if (!active) return;
        const status = error.response?.status;
        // Solo una sesión realmente inválida debe expulsar al usuario.
        // Errores de red o del servidor conservan el token para poder reintentar.
        if (status === 401 || status === 403) {
          setToken(null);
          setUser(null);
          setUsuarios([]);
          localStorage.removeItem("token");
        }
      })
      .finally(() => { if (active) setSessionLoading(false); });
    return () => { active = false; };
  }, [token, api]);

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(FIXED_THEME_VARS).forEach(([key, value]) => root.style.setProperty(key, value));
    root.setAttribute("data-theme", "light");
  }, []);

  useEffect(() => {
    if (!token || user?.rol !== "ADMINISTRADOR") return;
    api.get("/api/usuarios").then(res => setUsuarios(res.data.data || [])).catch(() => setUsuarios([]));
  }, [token, user?.rol, api]);

  const cambiarSede = sede => { setSedeActual(sede); localStorage.setItem("sedeActual", JSON.stringify(sede)); };
  const tieneAcceso = modulo => Boolean(user && (rolesConfig[user.rol] || ROLES_CONFIG[user.rol])?.modulos.includes(modulo));
  const updateRoleModulos = (rol, modulos) => setRolesConfig(prev => { const next = { ...prev, [rol]: { ...prev[rol], modulos } }; localStorage.setItem("rolesConfig", JSON.stringify(next)); return next; });
  const saveRole = (rol, data, isNew) => setRolesConfig(prev => { const next = isNew ? { ...prev, [rol]: data } : { ...prev, [rol]: { ...prev[rol], ...data } }; localStorage.setItem("rolesConfig", JSON.stringify(next)); return next; });
  const deleteRole = rol => setRolesConfig(prev => { const next = { ...prev }; delete next[rol]; localStorage.setItem("rolesConfig", JSON.stringify(next)); return next; });
  const applyStyles = () => Object.entries(FIXED_THEME_VARS).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));

  return <AuthContext.Provider value={{ token, user, sessionLoading, isAuthenticated: Boolean(token && user), login, verifyMfa, confirmMfaEnrollment, logout, api, radarApi: api, API_BASE_URL, sedeActual, cambiarSede, applyStyles, fetchAndApplyTheme: applyStyles, usuarios, setUsuarios, rolesConfig, updateRoleModulos, saveRole, deleteRole, tieneAcceso, tieneAccesoUser: (u, modulo) => Boolean((rolesConfig[u?.rol] || ROLES_CONFIG[u?.rol])?.modulos.includes(modulo)) }}>
    {children}
  </AuthContext.Provider>;
};
