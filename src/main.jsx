import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import './index.css';

// ── Tema fijo: personalización temporalmente desactivada ────────────────────
// Se aplica de forma síncrona ANTES del primer render de React.
// Limpia cualquier caché de tema anterior (oscuro u otro) del localStorage.
(function forceFixedTheme() {
  try {
    // Limpiar TODOS los residuos de temas anteriores
    localStorage.removeItem('cachedTheme');
    localStorage.removeItem('theme');
  } catch { /* noop */ }

  // Aplicar el único tema permitido directamente en :root
  const root = document.documentElement;
  const FIXED = {
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
  Object.entries(FIXED).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute('data-theme', 'light');
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </AuthProvider>
  </React.StrictMode>
);
