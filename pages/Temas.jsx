import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { Save, RefreshCw, Palette, Type, Layout, Sun, Moon, Zap, Image as ImageIcon } from 'lucide-react';

const Temas = () => {
  const { api, applyStyles } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    sidebar_bg: '#027BFD',
    sidebar_text: '#FFFFFF',
    main_bg: '#dddddd',
    main_text: '#212529',
    primary_color: '#027BFD',
    font_family: 'Inter',
    logo_filter: 'none'
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/config');
      if (Object.keys(res.data).length > 0) {
        setSettings(prev => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post('/api/config', settings);
      applyStyles(settings); // Usa la función global del AuthContext
      alert('Configuración guardada correctamente.');
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // La función applyStyles viene del AuthContext (fuente única de verdad)

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner"></div></div>;

  return (
    <div className="page-fade-in">

      {/* ─── BANNER: PERSONALIZACIÓN TEMPORALMENTE DESACTIVADA ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        background: 'rgba(2, 123, 253, 0.08)',
        border: '1px solid rgba(2, 123, 253, 0.25)',
        borderRadius: '10px',
        padding: '14px 20px',
        marginBottom: '24px',
        color: 'var(--c-primary)',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <div>
          <div style={{ fontWeight: '800', fontSize: '13px', letterSpacing: '0.3px' }}>
            Personalización de temas temporalmente desactivada
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
            El sistema usa un tema fijo predeterminado. Los ajustes se guardan en la base de datos
            pero no afectan la apariencia hasta que se reactive esta función.
          </div>
        </div>
      </div>

      <div className="dashboard-hero">
        <div className="hero-left">
          <h1>Personalización del Portal</h1>
          <p className="muted">Selecciona un tema predefinido o ajusta los colores manualmente.</p>
        </div>
        <div className="hero-right">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
            title="Personalización temporalmente desactivada"
          >
            <Save size={18} />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* PRESETS — deshabilitados visualmente */}
      <div className="card" style={{ marginBottom: '24px', opacity: 0.5, pointerEvents: 'none' }}>
        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} color="var(--c-primary)" />
          Temas Rápidos
          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--c-muted)', marginLeft: '8px' }}>(desactivado)</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <button className="btn btn-ghost" style={{ justifyContent: 'center', height: '60px', cursor: 'not-allowed' }} disabled>
            <RefreshCw size={18} style={{ marginRight: '10px' }} />
            Predeterminado
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: 'center', height: '60px', cursor: 'not-allowed' }} disabled>
            <Moon size={18} style={{ marginRight: '10px' }} />
            Modo Oscuro
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: 'center', height: '60px', cursor: 'not-allowed' }} disabled>
            <Sun size={18} style={{ marginRight: '10px' }} />
            Modo Claro
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* SIDEBAR CONFIG */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Layout size={20} color="var(--c-primary)" />
            <h3 style={{ margin: 0 }}>Barra Lateral (Sidebar)</h3>
          </div>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Color de Fondo</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input 
                type="color" 
                value={settings.sidebar_bg} 
                onChange={e => setSettings({...settings, sidebar_bg: e.target.value})}
                style={{ width: '50px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              />
              <input 
                type="text" 
                className="form-input" 
                value={settings.sidebar_bg}
                onChange={e => setSettings({...settings, sidebar_bg: e.target.value})}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Color de Texto</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input 
                type="color" 
                value={settings.sidebar_text} 
                onChange={e => setSettings({...settings, sidebar_text: e.target.value})}
                style={{ width: '50px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              />
              <input 
                type="text" 
                className="form-input" 
                value={settings.sidebar_text}
                onChange={e => setSettings({...settings, sidebar_text: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* MAIN AREA CONFIG */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Palette size={20} color="var(--c-primary)" />
            <h3 style={{ margin: 0 }}>Fondo Principal</h3>
          </div>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Color de Fondo General</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input 
                type="color" 
                value={settings.main_bg} 
                onChange={e => setSettings({...settings, main_bg: e.target.value})}
                style={{ width: '50px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              />
              <input 
                type="text" 
                className="form-input" 
                value={settings.main_bg}
                onChange={e => setSettings({...settings, main_bg: e.target.value})}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Color de Texto General</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input 
                type="color" 
                value={settings.main_text} 
                onChange={e => setSettings({...settings, main_text: e.target.value})}
                style={{ width: '50px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              />
              <input 
                type="text" 
                className="form-input" 
                value={settings.main_text}
                onChange={e => setSettings({...settings, main_text: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* ACCENT & FONTS */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Type size={20} color="var(--c-primary)" />
            <h3 style={{ margin: 0 }}>Tipografía y Logo</h3>
          </div>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Color Primario (Acento)</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input 
                type="color" 
                value={settings.primary_color} 
                onChange={e => setSettings({...settings, primary_color: e.target.value})}
                style={{ width: '50px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              />
              <input 
                type="text" 
                className="form-input" 
                value={settings.primary_color}
                onChange={e => setSettings({...settings, primary_color: e.target.value})}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Familia Tipográfica</label>
            <select 
              className="form-input" 
              value={settings.font_family}
              onChange={e => setSettings({...settings, font_family: e.target.value})}
            >
              <option value="Arial">Arial (Sans Serif)</option>
              <option value="Inter">Inter (Moderno)</option>
              <option value="Roboto">Roboto (Google)</option>
              <option value="monospace">Monospace (Técnico)</option>
              <option value="'Courier New', Courier, monospace">Courier New</option>
              <option value="Georgia, serif">Georgia (Serif)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ImageIcon size={14} />
              Invertir Logo (para fondos claros)
            </label>
            <select 
              className="form-input" 
              value={settings.logo_filter === 'none' ? 'no' : 'si'}
              onChange={e => setSettings({...settings, logo_filter: e.target.value === 'si' ? 'invert(1) brightness(0.2)' : 'none'})}
            >
              <option value="no">No (Blanco original)</option>
              <option value="si">Sí (Oscuro/Invertido)</option>
            </select>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Temas;
