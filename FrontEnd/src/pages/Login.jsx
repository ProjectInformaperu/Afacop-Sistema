import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { AuthContext } from '../context/AuthContext.jsx';
import logoPixi from '../assets/logo-pixi.png';
import bgVideo from '../assets/fondo.mp4';

import './Login.css';
const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaChallenge, setMfaChallenge] = useState('');
  const [mfaEnrollment, setMfaEnrollment] = useState(null);
  const [mfaQr, setMfaQr] = useState('');
  const [retryAfter, setRetryAfter] = useState(0);

  const { login, verifyMfa, confirmMfaEnrollment } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    if (!mfaEnrollment?.otpauthUri) {
      setMfaQr('');
      return undefined;
    }
    QRCode.toDataURL(mfaEnrollment.otpauthUri, {
      width: 220, margin: 2,
      color: { dark: '#111827', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    }).then(url => { if (active) setMfaQr(url); }).catch(() => { if (active) setMfaQr(''); });
    return () => { active = false; };
  }, [mfaEnrollment]);

  useEffect(() => {
    if (retryAfter <= 0) return undefined;
    const timer = window.setTimeout(() => setRetryAfter(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [retryAfter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mfaChallenge && mfaCode.length !== 6) {
      setError('Ingresa el código completo de 6 dígitos.');
      return;
    }
    setLoading(true);
    try {
      if (mfaChallenge) {
        if (mfaEnrollment) await confirmMfaEnrollment(mfaChallenge, mfaCode);
        else await verifyMfa(mfaChallenge, mfaCode);
      } else {
        const result = await login(username, password);
        if (result.mfaRequired || result.mfaEnrollmentRequired) {
          setMfaChallenge(result.challengeToken);
          if (result.mfaEnrollmentRequired) setMfaEnrollment({ secret: result.secret, otpauthUri: result.otpauthUri });
          return;
        }
      }
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 429) {
        const seconds = Number(data?.retryAfterSeconds || err.response?.headers?.['retry-after'] || 60);
        setRetryAfter(Number.isFinite(seconds) ? Math.max(1, Math.ceil(seconds)) : 60);
        setError('Se alcanzó temporalmente el límite de intentos de acceso.');
      } else {
        setError(data?.error || data?.mensaje || err.message || 'No se pudo completar el inicio de sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* PANE IZQUIERDO: Animación de Rutas y Branding con forma irregular */}
      <div className="login-left-pane">
        <div className="routing-animation">
          <video autoPlay loop muted playsInline className="background-video">
            <source src={bgVideo} type="video/mp4" />
            Tu navegador no soporta videos HTML5.
          </video>
        </div>

        <div className="auth-branding-overlay">
          <h1 className="brand-name-routing">Mi Radar</h1>
          <p className="brand-tagline">La plataforma operativa de campo más avanzada.</p>
          <div className="auth-badges-container">
            <span className="glass-badge">Optimización IA</span>
            <span className="glass-badge">Tiempo Real</span>
            <span className="glass-badge">Control Total</span>
          </div>
        </div>
      </div>

      {/* Logo esquina superior derecha */}
      <img src={logoPixi} alt="Logo Mi Radar" className="login-logo-tr" />

      {/* PANE DERECHO: Formulario de Login */}
      <div className="login-right-pane">
        <div className="auth-form-container">
          <div className="form-header">
            <p className="form-eyebrow">BIENVENIDO</p>
            <h2 className="form-title">Iniciar Sesión</h2>
            <p className="form-subtitle">Supervisa la verificación y asignación de créditos de préstamo de manera eficiente.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="login-form">
            {error && (
              <div className="error-msg">
                <IconAlert />
                {error}
              </div>
            )}

            {!mfaChallenge && <div className="form-group">
              <label htmlFor="username">Usuario</label>
              <input
                type="text"
                id="username"
                autoComplete="off"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                required
              />
            </div>}

            {!mfaChallenge && <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ paddingRight: '46px', width: '100%', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword(value => !value)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    border: 'none', background: 'transparent', color: '#6C757D', cursor: 'pointer',
                    padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-3.2 4.4" />
                      <path d="M6.6 6.6C3.7 8.5 2 12 2 12s3.5 8 10 8a10.8 10.8 0 0 0 3.2-.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>}

            {mfaChallenge && <div className="form-group">
              {mfaEnrollment ? (
                <div style={{ marginBottom: 18, padding: 16, border: '1px solid #DDE3EE', borderRadius: 14, background: '#F8FAFC', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginBottom: 5 }}>Protege tu cuenta</div>
                  <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, marginBottom: 12 }}>
                    Escanea el código con Google Authenticator, Microsoft Authenticator, Authy o 1Password.
                  </div>
                  {mfaQr && <img src={mfaQr} alt="Código QR para configurar el autenticador" width="190" height="190" style={{ display: 'block', margin: '0 auto 12px', borderRadius: 8 }} />}
                  <details style={{ textAlign: 'left', fontSize: 11, color: '#64748B' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Configurar manualmente</summary>
                    <code style={{ display: 'block', marginTop: 8, padding: 8, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, wordBreak: 'break-all', userSelect: 'all', color: '#334155' }}>{mfaEnrollment.secret}</code>
                  </details>
                </div>
              ) : (
                <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: '#EFF6FF', color: '#1E40AF', fontSize: 13, lineHeight: 1.5 }}>
                  Abre tu aplicación autenticadora e ingresa el código actual.
                </div>
              )}
              <label htmlFor="mfaCode">Código de verificación de 6 dígitos</label>
              <input id="mfaCode" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" required autoFocus
                style={{ textAlign: 'center', letterSpacing: '0.45em', fontSize: 20, fontWeight: 800 }} />
            </div>}

            <button type="submit" className="btn-continue" disabled={loading || retryAfter > 0}>
              {loading ? 'Validando...' : retryAfter > 0 ? `INTENTAR EN ${Math.ceil(retryAfter / 60)} MIN` : mfaChallenge ? 'VERIFICAR' : 'INGRESAR'}
            </button>
            {mfaChallenge && (
              <button type="button" onClick={() => { setMfaChallenge(''); setMfaEnrollment(null); setMfaCode(''); setError(''); }}
                style={{ width: '100%', marginTop: 10, padding: 10, border: 'none', background: 'transparent', color: '#64748B', fontWeight: 700, cursor: 'pointer' }}>
                Volver al inicio de sesión
              </button>
            )}
          </form>

        </div>
      </div>
    </div>
  );
}
