import React, { useEffect, useState, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import {
  Users, Wallet, Activity, Map as MapIcon,
  CheckCircle, AlertCircle, Calendar, TrendingUp,
  Download, ArrowRight, Clock, X,
  Route, RefreshCw, MapPin
} from 'lucide-react';
import { getAvatarUrl } from '../utils/avatar.js';
import CustomDatePicker from '../components/CustomDatePicker';

/* ── Counter ─────────────────────────────────────────────────── */
function AnimatedNumber({ value }) {
  // No animar el KPI: un valor intermedio puede confundirse con el total real.
  const number = Number(value);
  return <span>{Number.isFinite(number) ? number.toLocaleString('es-PE') : '0'}</span>;
}

/* ── Status color & icon map ─────────────────────────────────── */
const estadoMeta = {
  LIBRE: { color: '#28A745', bg: 'rgba(40,167,69,0.08)', Icon: CheckCircle, label: 'Libre' },
  VISITADO_PAGO: { color: '#007BFF', bg: 'rgba(0,123,255,0.08)', Icon: Wallet, label: 'Visitado / Pago' },
  NO_ENCONTRADO: { color: '#DC3545', bg: 'rgba(220,53,69,0.08)', Icon: AlertCircle, label: 'No encontrado' },
  NO_ECONTRADO: { color: '#DC3545', bg: 'rgba(220,53,69,0.08)', Icon: AlertCircle, label: 'No encontrado' },
  DEFAULT: { color: '#FFC107', bg: 'rgba(255,193,7,0.08)', Icon: Calendar, label: 'Pendiente' },
};
const getEstado = (key) => estadoMeta[key] || estadoMeta.DEFAULT;

/* ════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { radarApi, token, sedeActual } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [actividad, setActividad] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStart, setExportStart] = useState('');
  const [exportEnd, setExportEnd] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        radarApi.get('/api/dashboard/stats'),
        radarApi.get('/api/dashboard/actividad?limit=10&offset=0'),
      ]);
      setStats(sRes.data.data);
      setActividad(aRes.data.data || []);
      setPage(0);
    } catch (e) {
      console.error('Error loading dashboard', e);
    } finally {
      setLoading(false);
    }
  }, [radarApi]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const handleLoadMore = async () => {
    setLoadingMore(true);
    const next = page + 1;
    try {
      const res = await radarApi.get(`/api/dashboard/actividad?limit=10&offset=${next * 10}`);
      setActividad(prev => [...prev, ...(res.data.data || [])]);
      setPage(next);
    } catch (e) { console.error(e); }
    finally { setLoadingMore(false); }
  };

  const handleExport = () => {
    const BASE = radarApi.defaults.baseURL || 'http://localhost:4001';
    let url = `${BASE}/api/dashboard/export_actividad?token=${token}`;
    if (exportStart) url += `&fecha_inicio=${exportStart}`;
    if (exportEnd) url += `&fecha_fin=${exportEnd}`;
    window.open(url, '_blank');
    setShowExportModal(false);
  };

  /* ── Loading / Empty states ────────────────────────────────── */
  if (loading) return (
    <div style={S.loadingWrap}>
      <div style={S.skeleton} />
      <div style={{ ...S.skeleton, width: '75%' }} />
      <div style={{ ...S.skeleton, width: '50%' }} />
    </div>
  );
  if (!stats) return (
    <div style={S.emptyState}>
      <AlertCircle size={40} color="#6C757D" strokeWidth={1.5} />
      <p style={{ color: '#6C757D', marginTop: 12 }}>No se pudieron cargar las estadísticas.</p>
    </div>
  );

  /* ── Stat card data ────────────────────────────────────────── */
  const statCards = [
    { label: 'Total clientes', value: stats.totalClientes, sub: 'Cartera total', Icon: Users, bgColor: 'linear-gradient(135deg, var(--c-primary), #3047D8)', shadowColor: '#3047D8' },
    { label: 'Pagos hoy', value: stats.clientesPagoHoy, sub: 'Vencen hoy', Icon: Wallet, bgColor: 'linear-gradient(135deg, #16A34A, #34D399)', shadowColor: '#34D399' },
    { label: 'Asesores Activos', value: stats.workersActivos, sub: 'En jornada', Icon: Activity, bgColor: 'linear-gradient(135deg, #E0A800, #FACC15)', shadowColor: '#FACC15' },
    { label: 'Rutas Programadas', value: stats.rutasHoy, sub: 'Asignadas para hoy', Icon: MapIcon, bgColor: 'linear-gradient(135deg, #DC3545, #F87171)', shadowColor: '#F87171' },
  ];

  return (
    <div style={S.page}>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={S.hero}>
        <div>
          <p style={S.heroEyebrow}>Sede operativa · {sedeActual?.nombre}</p>
          <h1 style={S.heroTitle}>Panel de control - <span style={{ color: 'var(--c-primary)' }}>{sedeActual?.nombre}</span></h1>
          <p style={S.heroSub}>Resumen de operaciones y estado de rutas activas.</p>
        </div>
        <div style={S.heroCtas}>
          <button style={{ ...S.btnPrimary, flex: 1, justifyContent: 'center' }} onClick={() => window.location.href = '/rutas'}>
            <Route size={16} /> Crear Ruta
          </button>
          <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => window.location.href = '/ciclos'}>
            <RefreshCw size={16} /> Ver Ciclos
          </button>
          <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => window.location.href = '/localizar'}>
            <MapPin size={16} /> Localizar Asesor
          </button>
        </div>
      </section>

      {/* ── STAT CARDS ───────────────────────────────────────── */}
      <div style={S.statsGrid}>
        {statCards.map((card, i) => (
          <div
            key={i}
            className="b2b-stat-card group"
            style={{
              '--card-bg': card.bgColor,
              '--hover-shadow-color': card.shadowColor
            }}
          >
            <div className="b2b-stat-card-content">
              {/* Value */}
              <p className="b2b-stat-card-value"><AnimatedNumber value={card.value} /></p>

              {/* Bottom info */}
              <div>
                <p className="b2b-stat-card-label">{card.label}</p>
                <p className="b2b-stat-card-sub">{card.sub}</p>
              </div>

              {/* Icon wrapper */}
              <div className="card-icon-svg-wrapper" style={{ opacity: 0.2 }}>
                <card.Icon size={48} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── LOWER GRID: Activity + Portfolio ─────────────────── */}
      <div style={S.lowerGrid}>

        {/* Activity feed */}
        <div style={{ ...S.card, ...S.cardActividadFade }}>
          <div style={S.cardHeader}>
            <div>
              <h3 style={S.cardTitle}>Actividad reciente</h3>
              <p style={S.cardSub}>Últimas gestiones registradas en campo</p>
            </div>
            <button className="btn-outline" onClick={() => setShowExportModal(true)}>
              <Download size={14} /> Exportar
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {actividad.length === 0 ? (
              <div style={S.emptyFeed}>
                <Clock size={32} color="#9CA3AF" strokeWidth={1.5} />
                <p style={{ color: '#6C757D', marginTop: 8, fontSize: 14 }}>Sin actividad reciente</p>
              </div>
            ) : actividad.map((a, idx) => {
              let flagColor = '#6C757D';
              if (a.tipificacion === 'NO_ENCONTRADO') flagColor = '#EF4444';
              else if (a.tipificacion === 'PAGO') flagColor = '#28A745';
              else if (a.tipificacion === 'REPROGRAMARA') flagColor = '#FFC107';

              return (
                <div key={a.id || idx} style={{ ...S.actItem, borderBottom: '1px solid #E5E7EB', paddingBottom: '12px', marginBottom: '12px', position: 'relative' }}>
                  <div style={S.actAvatar}>
                    <img src={getAvatarUrl(a.worker_nombre, a.worker_id)} alt={a.worker_nombre}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '30px' }}>
                    <p style={S.actMain}>
                      <strong>{a.worker_nombre}</strong> gestionó a <strong>{a.cliente_nombre}</strong>
                    </p>
                    <p style={S.actMeta}>
                      {a.tipificacion} · {new Date(a.created_at).toLocaleString('es-PE')}
                    </p>
                  </div>
                  {/* Flag Icon */}
                  <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: flagColor }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          {actividad.length > 0 && (
            <button style={{ ...S.btnGhost, width: '100%', marginTop: 16, justifyContent: 'center' }}
              onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Cargando...' : 'Cargar más'}
            </button>
          )}
        </div>

        {/* Portfolio status */}
        <div style={{ ...S.card, padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--c-primary), var(--c-primary-h))', padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ ...S.cardTitle, color: '#FFFFFF' }}>Estado de cartera</h3>
              <p style={{ ...S.cardSub, color: 'rgba(255,255,255,0.8)' }}>Resumen de clientes según su gestión</p>
            </div>
            <TrendingUp size={24} color="#FFFFFF" opacity={0.8} />
          </div>

          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
            {/* KPI Chart */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px dashed #E5E7EB' }}>
              {/* Columna Izquierda: Efectividad */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <p style={{ fontSize: '12px', color: '#6C757D', margin: 0, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Efectividad de Cobranza</p>
                <div style={{ position: 'relative', width: 72, height: 72 }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <path stroke="#E5E7EB" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path stroke="var(--c-primary)" strokeWidth="3" strokeDasharray="65, 100" fill="none" strokeLinecap="round" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path stroke="#10B981" strokeWidth="3" strokeDasharray="25, 100" strokeDashoffset="-65" fill="none" strokeLinecap="round" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#212529', lineHeight: 1 }}>65%</span>
                  </div>
                </div>
              </div>

              {/* Línea Divisoria Vertical */}
              <div style={{ width: '1px', height: '64px', backgroundColor: '#E5E7EB' }}></div>

              {/* Columna Derecha: Monto Recuperado */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <p style={{ fontSize: '12px', color: '#6C757D', margin: 0, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monto Recuperado</p>
                <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <h4 style={{ fontSize: '24px', fontWeight: '800', color: '#212529', margin: 0, lineHeight: 1 }}>S/ 124K</h4>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.clientesPorEstado?.map(e => {
                const meta = getEstado(e.estado);
                const total = stats.clientesPorEstado.reduce((s, x) => s + Number(x.total), 0);
                const pct = total > 0 ? Math.round((e.total / total) * 100) : 0;
                return (
                  <div key={e.estado} style={{ ...S.estadoRow, background: meta.bg, borderColor: `${meta.color}22` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <meta.Icon size={18} color={meta.color} strokeWidth={2} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#212529' }}>
                        {({ LIBRE: 'PENDIENTES', VISITADO_PAGO: 'GESTIÓN EXITOSA', REPROGRAMADO: 'REPROGRAMADOS' })[e.estado] ?? e.estado.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={S.miniBar}>
                        <div style={{ ...S.miniBarFill, width: `${pct}%`, background: meta.color }} />
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 700, color: meta.color, minWidth: 32, textAlign: 'right' }}>
                        {e.total}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── EXPORT MODAL ─────────────────────────────────────── */}
      {showExportModal && (
        <div style={S.modalOverlay} onClick={() => setShowExportModal(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#212529', margin: 0 }}>Exportar historial</h3>
              <button style={S.modalClose} onClick={() => setShowExportModal(false)}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>Fecha inicio</label>
                <CustomDatePicker style={S.fieldInput} value={exportStart} onChange={e => setExportStart(e.target.value)} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>Fecha fin</label>
                <CustomDatePicker style={S.fieldInput} value={exportEnd} onChange={e => setExportEnd(e.target.value)} />
              </div>
            </div>
            <div style={S.modalFooter}>
              <button style={S.btnGhost} onClick={() => setShowExportModal(false)}>Cancelar</button>
              <button style={S.btnPrimary} onClick={handleExport}>
                <Download size={14} /> Descargar CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   STYLES — Minimalismo Funcional B2B (design.md)
   ──────────────────────────────────────────────────────────
   Font: Inter | Primary: #007BFF | Dark text: #212529
   Radius: 4px | Shadow: 0 2px 8px rgba(0,0,0,0.06)
   Transitions: 200ms ease-out
   ════════════════════════════════════════════════════════════ */
const S = {
  /* Page */
  page: {
    fontFamily: "'Inter', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    gap: 16, // Reducido a 16px para alinear tarjetas KPI cerca del header
    animation: 'dbFadeIn 420ms ease-out both',
  },

  /* Hero
     El contenedor padre (.page-content--dashboard) ya tiene padding-top: 0,
     por lo que el Hero no necesita márgenes negativos para llegar al borde.
     El padding lateral del Hero coincide con el de .page-content (32px)
     para mantener alineación visual perfecta con las tarjetas KPI. */
  hero: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    padding: '14px 32px 14px 32px',  /* Sin márgenes negativos */
    margin: '0 -32px 0 -32px',       /* Solo lateral: alinea con los bordes del page-content */
    background: '#FEFEFE',
    border: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: 600,
    color: '#007BFF',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: '0 0 6px',
  },
  heroTitle: {
    fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
    fontWeight: 700,
    color: '#212529',
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
    margin: '0 0 8px',
  },
  heroSub: {
    fontSize: 14,
    color: '#6C757D',
    margin: 0,
    lineHeight: 1.5,
  },
  heroCtas: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: '1 1 auto',
    maxWidth: 500, // Constrain width so buttons don't get too large, but still flex
  },

  /* Buttons */
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    background: 'var(--c-primary)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'Inter', sans-serif",
  },
  btnGhost: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 16px',
    background: '#FFFFFF',
    color: '#212529',
    border: '1px solid #D1D5DB',
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 200ms ease',
    fontFamily: "'Inter', sans-serif",
  },
  btnSm: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    background: '#FFFFFF',
    color: '#212529',
    border: '1px solid #D1D5DB',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 16,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#6C757D',
    margin: 0,
    letterSpacing: '0.01em',
  },
  statValue: {
    fontSize: 40,
    fontWeight: 700,
    color: '#212529',
    letterSpacing: '-0.03em',
    lineHeight: 1,
    margin: 0,
  },
  statSub: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: 0,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  /* Lower grid */
  lowerGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },

  /* Card */
  card: {
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 4,
    padding: '24px 28px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  cardActividadFade: {
    background: 'linear-gradient(#FFFFFF, #FFFFFF) padding-box, linear-gradient(to bottom, #4768E9, #dddddd) border-box',
    border: '2px solid transparent',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: '1px solid #F3F4F6',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#212529',
    margin: '0 0 3px',
  },
  cardSub: {
    fontSize: 12,
    color: '#6C757D',
    margin: 0,
  },

  /* Activity feed */
  actItem: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #F3F4F6',
  },
  actAvatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    flexShrink: 0,
    overflow: 'hidden',
    background: '#F3F4F6',
  },
  actMain: {
    fontSize: 13,
    color: '#212529',
    margin: '0 0 2px',
    lineHeight: 1.4,
  },
  actMeta: {
    fontSize: 11,
    color: '#6C757D',
    margin: 0,
    fontWeight: 500,
  },
  emptyFeed: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 0',
  },

  /* Estado rows */
  estadoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: 4,
    border: '1px solid transparent',
  },
  miniBar: {
    width: 80,
    height: 4,
    background: '#E5E7EB',
    borderRadius: 99,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 99,
    transition: 'width 800ms ease-out',
  },

  /* Export modal */
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(33,37,41,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 20,
  },
  modalBox: {
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 4,
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    animation: 'dbFadeIn 200ms ease-out both',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #E5E7EB',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    color: '#6C757D',
    cursor: 'pointer',
    lineHeight: 1,
    padding: 4,
  },
  modalFooter: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    padding: '16px 24px',
    borderTop: '1px solid #E5E7EB',
  },

  /* Form fields inside modal */
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#212529',
  },
  fieldInput: {
    padding: '9px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: 4,
    fontSize: 14,
    color: '#212529',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    width: '100%',
  },

  /* Loading skeletons */
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 32,
  },
  skeleton: {
    height: 20,
    width: '90%',
    background: 'linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 4,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 80,
  },
};
