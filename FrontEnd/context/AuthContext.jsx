import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const isAuthenticated = !!token;

  const [sedeActual, setSedeActual] = useState(() => {
    const saved = localStorage.getItem('sedeActual');
    return saved ? JSON.parse(saved) : { id: '11111111-1111-1111-1111-000000000001', nombre: 'Lima' };
  });

  // useMemo for the api instance so it recreates only when token or sedeActual changes
  const apiData = React.useMemo(() => {
    // Lógica de URLs para Producción vs Local
    const isProd = window.location.hostname !== 'localhost' && !window.location.hostname.includes('192.168');
    const API_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const PROD_URL = import.meta.env.VITE_API_URL || 'https://afacop-backend.onrender.com';
    
    // Exportamos la URL base para sockets y otros componentes
    const BASE_URL = import.meta.env.VITE_API_URL || (isProd ? PROD_URL : `http://${API_HOST}:4000`);

    console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
  const instance = axios.create({
      baseURL: BASE_URL,
      headers: { 
        Authorization: token ? `Bearer ${token}` : undefined,
        'x-sede-id': sedeActual?.id
      },
    });
    return { instance, BASE_URL };
  }, [token, sedeActual]);

  const api = apiData.instance;
  const API_BASE_URL = apiData.BASE_URL;

  const radarApi = React.useMemo(() => {
    const API_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const RADAR_BASE_URL = import.meta.env.VITE_RADAR_API_URL || `http://${API_HOST}:4001`;

    return axios.create({
      baseURL: RADAR_BASE_URL,
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
        'x-sede-id': sedeActual?.id
      },
    });
  }, [token, sedeActual]);

  const login = async (username, password) => {
    const response = await radarApi.post('/api/auth/login', { username, password });
    const { token: accessToken, user: loggedUser } = response.data;

    // BLOQUEO: Los WORKERS no pueden entrar a la plataforma web
    if (loggedUser.rol === 'WORKER') {
      throw new Error('Solo los administradores pueden acceder a este portal web.');
    }

    setToken(accessToken);
    setUser(loggedUser);
    localStorage.setItem('token', accessToken);
    return response.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  // optional: verify token on mount
  useEffect(() => {
    const verify = async () => {
      if (token) {
        try {
          const res = await radarApi.get('/api/auth/me');
          if (res.data.user.rol === 'WORKER') {
            logout();
          } else {
            setUser(res.data.user);
          }
        } catch {
          logout();
        }
      }
    };
    verify();
  }, [token, radarApi]); // depend on radarApi

  const cambiarSede = (sede) => {
    setSedeActual(sede);
    localStorage.setItem('sedeActual', JSON.stringify(sede));
  };

  // ── TEMA FIJO (personalización temporalmente desactivada) ────────────────
  // Para reactivar la personalización: cambiar THEME_LOCKED a false
  const THEME_LOCKED = true;

  const FIXED_THEME_VARS = {
    '--c-sidebar-bg':  '#0B22A1',
    '--c-sidebar-text':'#FFFFFF',
    '--c-bg':          '#F5F7FB',
    '--c-surface':     '#FFFFFF',
    '--c-surface-2':   '#F8F9FA',
    '--c-border':      '#DEE2E6',
    '--c-text':        '#212529',
    '--c-muted':       '#6C757D',
    '--c-muted-2':     '#9CA3AF',
    '--c-primary':     '#0B22A1',
    '--c-primary-h':   '#233CC4',
    '--c-primary-rgb': '11, 34, 161',
    '--c-on-primary':  '#FFFFFF',
    '--logo-filter':   'none',
    '--font-main':     'Inter',
  };

  // Tema predeterminado como referencia segura (usado cuando THEME_LOCKED = false)
  const PREDETERMINADO_THEME = {
    sidebar_bg: '#0B22A1',
    sidebar_text: '#FFFFFF',
    main_bg: '#F5F7FB',
    main_text: '#212529',
    primary_color: '#0B22A1',
    font_family: 'Inter',
    logo_filter: 'none'
  };

  const applyStyles = () => {
    // Cuando THEME_LOCKED = true, siempre aplica el tema fijo independientemente del parámetro
    const root = document.documentElement;
    Object.entries(FIXED_THEME_VARS).forEach(([k, v]) => root.style.setProperty(k, v));
    root.setAttribute('data-theme', 'light');
    // No guardar en localStorage para que el siguiente reload también use el tema fijo
  };

  // Fetch and apply theme on mount/auth
  const fetchAndApplyTheme = async () => {
    // Mientras THEME_LOCKED = true: ignorar DB y aplicar tema fijo directamente
    if (THEME_LOCKED) {
      applyStyles(null);
      return;
    }
    // ── Código original (se activa cuando THEME_LOCKED = false) ──────────────
    try {
      const cached = localStorage.getItem('cachedTheme');
      if (cached) applyStyles(JSON.parse(cached));
    } catch { /* ignore */ }
    try {
      const res = await api.get('/api/config');
      const s = res.data;
      if (s && s.sidebar_bg) {
        applyStyles(s);
      } else {
        applyStyles(PREDETERMINADO_THEME);
      }
    } catch (err) {
      console.error('Error applying theme:', err);
      applyStyles(PREDETERMINADO_THEME);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchAndApplyTheme();
  }, [isAuthenticated, sedeActual.id]);

  return (
    <AuthContext.Provider value={{ 
      token, user, isAuthenticated, login, logout, api, radarApi, sedeActual, cambiarSede, 
      applyStyles, fetchAndApplyTheme 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
