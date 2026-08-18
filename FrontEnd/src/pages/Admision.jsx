import React, { useState, useEffect, useMemo, useContext } from 'react';
import { createPortal } from 'react-dom';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AuthContext } from '../context/AuthContext.jsx';
import { ClipboardX } from 'lucide-react';
const FILAS_POR_PAGINA = 12;
const getEstadoStyle = (estado) => {
  if (estado === 'APTO') {
    return { bg: 'rgba(12, 166, 120, 0.15)', color: '#0CA678' };
  }
  if (estado === 'PENDIENTE') {
    return { bg: 'rgba(240, 180, 0, 0.15)', color: '#D97706' };
  }
  return { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' };
};

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '—';
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return fechaStr;

  const datePart = d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
      <span style={{ whiteSpace: 'nowrap' }}>{datePart}</span>
      <span style={{ fontSize: '11px', color: 'var(--c-muted)', whiteSpace: 'nowrap' }}>{timePart}</span>
    </div>
  );
};

const formatLinea = (linea) => {
  if (linea === null || linea === undefined || linea === '') return '—';
  const num = Number(linea);
  if (!isNaN(num)) {
    return num.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });
  }
  return linea;
};

const PRODUCT_PATTERN = [
  'Préstamo MYPE',
  'Préstamo Vehicular',
  'Préstamo MYPE',
  'Préstamo Personal',
  'Préstamo MYPE',
  'Préstamo Vehicular',
  'Préstamo MYPE',
  'Préstamo MYPE',
  'Préstamo Vehicular',
  'Préstamo Personal'
];

const LINEAS_TEMPORALES = [
  2500,
  2750,
  3100,
  3450,
  3800,
  4250,
  4700,
  5200,
  5850,
  6400,
  7100,
  7850,
  8600,
  9250,
  10000
];

const getProductoVisible = (ev, index) => {
  return ev?.producto || 'Sin producto registrado';
};

const getLineaNumericaVisible = (ev, index) => {
  if (ev?.linea !== null && ev?.linea !== undefined && ev?.linea !== '') {
    return Number(ev.linea);
  }
  return null;
};

const normalizarEstado = (estado) => {
  const value = String(estado || 'PENDIENTE').trim().toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  if (value === 'NOAPTO' || value === 'NO APTO') return 'NO APTO';
  return value;
};

const getEstadoVisible = (ev) => normalizarEstado(ev?.estado);

export default function Admision() {
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [dniSearch, setDniSearch] = useState('');
  const [loadingEval, setLoadingEval] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [selectedClientInfo, setSelectedClientInfo] = useState(null);
  const [approvalData, setApprovalData] = useState({ condicion: 'APTO', lineaCredito: 'Préstamo MYPE', apePat: '', apeMat: '', nombre: '', dni: '' });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedClientInfo(null);
        setShowEvalModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { radarApi } = useContext(AuthContext);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [admSearch, setAdmSearch] = useState('');
  const [admFiltroEstado, setAdmFiltroEstado] = useState('TODOS');
  const [admFiltroProducto, setAdmFiltroProducto] = useState('TODOS');
  const [paginaTabla, setPaginaTabla] = useState(1);

  const evaluacionesVisibles = useMemo(() => {
    return evaluaciones.map((ev, index) => {
      const lineaVisible = getLineaNumericaVisible(ev, index);
      return {
        ...ev,
        productoVisible: getProductoVisible(ev, index),
        lineaVisible,
        estadoVisible: getEstadoVisible(ev),
      };
    });
  }, [evaluaciones]);

  const evaluacionesFiltradas = useMemo(() => {
    const q = admSearch.toLowerCase();
    return evaluacionesVisibles.filter(ev => {
      const nombre = `${ev.nombres || ''} ${ev.apellido_paterno || ''} ${ev.apellido_materno || ''}`.toLowerCase();
      const dni = (ev.dni || '').toLowerCase();
      const matchSearch = !q || nombre.includes(q) || dni.includes(q) || (ev.asesor_nombre || '').toLowerCase().includes(q);
      const matchEstado = admFiltroEstado === 'TODOS' || ev.estadoVisible === normalizarEstado(admFiltroEstado);
      const matchProducto = admFiltroProducto === 'TODOS' || (ev.productoVisible || '').includes(admFiltroProducto);
      return matchSearch && matchEstado && matchProducto;
    });
  }, [evaluacionesVisibles, admSearch, admFiltroEstado, admFiltroProducto]);

  const totalPaginasTabla = Math.max(1, Math.ceil(evaluacionesFiltradas.length / FILAS_POR_PAGINA));
  const evaluacionesPaginadas = useMemo(() => {
    const inicio = (paginaTabla - 1) * FILAS_POR_PAGINA;
    return evaluacionesFiltradas.slice(inicio, inicio + FILAS_POR_PAGINA);
  }, [evaluacionesFiltradas, paginaTabla]);

  useEffect(() => {
    setPaginaTabla(1);
  }, [admSearch, admFiltroEstado, admFiltroProducto]);

  useEffect(() => {
    setPaginaTabla(actual => Math.min(actual, totalPaginasTabla));
  }, [totalPaginasTabla]);

  const fetchEvaluaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await radarApi.get('/api/admision?page=1&limit=100');
      const data = Array.isArray(res.data?.data)
        ? res.data.data
        : [];
      const sorted = [...data].sort((a, b) => {
        const da = new Date(a.fecha_evaluacion || a.created_at || 0);
        const db = new Date(b.fecha_evaluacion || b.created_at || 0);
        return db - da;
      });
      setEvaluaciones(sorted);
    } catch (err) {
      console.error('Error fetching evaluations:', err);
      setError('Error al cargar las evaluaciones de admisión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluaciones();
  }, [radarApi]);

  const handleBuscarSBS = () => {
    if (!dniSearch || dniSearch.length < 8) return;
    setLoadingEval(true);
    setEvalResult(null);

    // Simular tiempo de consulta a la SBS
    setTimeout(() => {
      setEvalResult({
        nombre: 'JUAN PEREZ GONZALES',
        dni: dniSearch,
        fechaConsulta: new Date().toLocaleString('es-PE'),
        periodo: 'Diciembre-2025',
        rating: {
          normal: 0,
          problemas: 0,
          deficiente: 0,
          dudoso: 0,
          perdida: 100
        },
        deudas: [
          { entidad: 'BANCO FALABELLA', calificacion: '4: Perdida', capital: 100, intereses: 31, total: 130 },
          { entidad: 'BBVA', calificacion: '4: Perdida', capital: 64, intereses: 30, total: 94 }
        ],
        lineas: [
          { entidad: 'BANCO FALABELLA', tipo: 'Líneas de crédito en tarjetas de crédito de consumo', total: 100 }
        ]
      });
      setLoadingEval(false);
    }, 2000);
  };

  return (
    <div className="page fade-in admission-page" style={{ padding: '20px' }}>
      <div className="admission-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--c-text)' }}>Evaluaciones y Admisión</h1>
          <p style={{ color: 'var(--c-muted)', fontSize: '14px', marginTop: '4px' }}>Visualiza las evaluaciones de campo y realiza consultas manuales en la SBS.</p>
        </div>
        <button className="admission-manual-button"
          onClick={() => { setShowEvalModal(true); setEvalResult(null); setDniSearch(''); }}
          style={{
            backgroundColor: 'var(--c-primary)', color: 'white', border: 'none', padding: '10px 20px', 
            borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 10px rgba(66, 99, 235, 0.3)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14"/></svg>
          Evaluar Manualmente
        </button>
      </div>

      <div className="admission-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        {(() => {
          const aptos = evaluacionesVisibles.filter(e => e.estadoVisible === 'APTO').length;
          const noAptos = evaluacionesVisibles.filter(e => e.estadoVisible === 'NO APTO').length;
          const total = evaluacionesVisibles.length;
          const pct = total > 0 ? Math.round((aptos / total) * 100) : 0;
          const pieData = [
            { name: 'Aptos', value: aptos || 0 },
            { name: 'No aptos', value: noAptos || 0 },
          ];
          return (
            <div style={{ backgroundColor: 'var(--c-surface)', borderRadius: '14px', padding: '18px 20px', border: '1px solid var(--c-border)', height: '180px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tasa de Aprobación</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Dona */}
                <div className="approval-donut" style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart accessibilityLayer={false} focusable="false">
                      <Pie
                        data={total === 0 ? [{ name: 'Sin datos', value: 1 }] : pieData}
                        dataKey="value" cx="50%" cy="50%" innerRadius={32} outerRadius={46}
                        paddingAngle={total === 0 ? 0 : 3} startAngle={90} endAngle={-270} stroke="none"
                      >
                        {total === 0
                          ? <Cell key="empty" fill="#e2e8f0" />
                          : [<Cell key="aptos" fill="#10b981" />, <Cell key="noaptos" fill="#ef4444" />]
                        }
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '17px', fontWeight: '800', color: total === 0 ? 'var(--c-muted)' : '#10b981', lineHeight: 1 }}>{pct}%</span>
                    <span style={{ fontSize: '8px', fontWeight: '600', color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>aptos</span>
                  </div>
                </div>
                {/* Leyenda */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: 'var(--c-muted)', fontWeight: '500' }}>Aptos</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#10b981' }}>{aptos}</span>
                  </div>
                  <div style={{ height: 1, background: 'var(--c-border)', opacity: 0.5 }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: 'var(--c-muted)', fontWeight: '500' }}>No aptos</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#ef4444' }}>{noAptos}</span>
                  </div>
                  <div style={{ height: 1, background: 'var(--c-border)', opacity: 0.5 }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--c-muted)', fontWeight: '500' }}>Total</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--c-text)' }}>{total}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        
        <div style={{ backgroundColor: 'var(--c-surface)', borderRadius: '12px', padding: '15px', border: '1px solid var(--c-border)', height: '180px' }}>
          <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--c-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Evaluaciones por Producto</h3>
          <div
            className="product-evaluations-chart"
            style={{ width: '100%', height: 'calc(100% - 23px)' }}
            onMouseDownCapture={(event) => event.preventDefault()}
            onPointerDownCapture={(event) => event.preventDefault()}
            onFocusCapture={(event) => event.target.blur()}
          >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer={false} focusable="false" data={[
              { name: 'MYPE', val: evaluacionesVisibles.filter(e => e.productoVisible?.includes('MYPE')).length },
              { name: 'Vehicular', val: evaluacionesVisibles.filter(e => e.productoVisible?.includes('Vehicular')).length },
              { name: 'Personal', val: evaluacionesVisibles.filter(e => e.productoVisible?.includes('Personal')).length }
            ]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--c-border)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--c-muted)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--c-muted)' }} />
              <RechartsTooltip cursor={false} contentStyle={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)', color: 'var(--c-text)', fontSize: '12px', borderRadius: '8px' }} />
              <Bar dataKey="val" fill="var(--c-primary)" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--c-surface)', borderRadius: '12px', padding: '15px', border: '1px solid var(--c-border)', height: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <h3 style={{ fontSize: '13px', margin: '0 0 5px 0', color: 'var(--c-muted)', textTransform: 'uppercase', fontWeight: '800', width: '100%' }}>Total Evaluados Hoy</h3>
          <div style={{ fontSize: '48px', fontWeight: '900', color: 'var(--c-text)', lineHeight: '1' }}>{evaluacionesVisibles.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--c-muted)', marginTop: '5px' }}>Clientes procesados</div>
          <div style={{ fontSize: '11px', color: 'var(--c-success)', marginTop: '5px', fontWeight: 'bold' }}>+12% respecto a ayer</div>
        </div>
      </div>

      <div className="admission-results-card" style={{ backgroundColor: 'var(--c-surface)', borderRadius: '12px', padding: '20px', border: '1px solid var(--c-border)' }}>
        {/* Barra de búsqueda y filtros */}
        <div className="admission-filter-bar" style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={admSearch} onChange={e => setAdmSearch(e.target.value)} placeholder="Buscar por nombre, DNI o asesor..."
              style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--c-border)', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter,sans-serif', color: 'var(--c-text)', outline: 'none', background: 'var(--c-surface-2)', boxSizing: 'border-box' }} />
          </div>
          <select className="admission-filter-select professional-select" value={admFiltroEstado} onChange={e => setAdmFiltroEstado(e.target.value)}
            style={{ flex: '0 0 200px', width: '200px', padding: '8px 42px 8px 12px', border: '1px solid var(--c-border)', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter,sans-serif', color: 'var(--c-text)', backgroundColor: 'var(--c-surface-2)', cursor: 'pointer' }}>
            <option value="TODOS">Todos los estados</option>
            <option value="APTO">Apto</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="NO APTO">No Apto</option>
          </select>
          <select className="admission-filter-select professional-select" value={admFiltroProducto} onChange={e => setAdmFiltroProducto(e.target.value)}
            style={{ flex: '0 0 220px', width: '220px', padding: '8px 42px 8px 12px', border: '1px solid var(--c-border)', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter,sans-serif', color: 'var(--c-text)', backgroundColor: 'var(--c-surface-2)', cursor: 'pointer' }}>
            <option value="TODOS">Todos los productos</option>
            <option value="MYPE">Préstamo MYPE</option>
            <option value="Vehicular">Préstamo Vehicular</option>
            <option value="Personal">Préstamo Personal</option>
          </select>
          <span style={{ fontSize: '12px', color: 'var(--c-muted)', whiteSpace: 'nowrap' }}>
            {evaluacionesFiltradas.length} resultado{evaluacionesFiltradas.length !== 1 ? 's' : ''}
          </span>
        </div>

        <table className="admission-results-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--c-border)', color: 'var(--c-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px', fontWeight: 'bold' }}>DNI</th>
              <th style={{ padding: '12px', fontWeight: 'bold' }}>Ape. Paterno</th>
              <th style={{ padding: '12px', fontWeight: 'bold' }}>Ape. Materno</th>
              <th style={{ padding: '12px', fontWeight: 'bold' }}>Nombres</th>
              <th style={{ padding: '12px', fontWeight: 'bold' }}>Producto</th>
              <th style={{ padding: '12px', fontWeight: 'bold' }}>Línea Crédito</th>
              <th style={{ padding: '12px', fontWeight: 'bold' }}>Estado</th>
              <th aria-hidden="true" style={{ display: 'none', padding: '12px', fontWeight: 'bold' }}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: 'var(--c-muted)' }}>
                  Cargando evaluaciones...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: 'var(--c-danger)', fontWeight: 'bold' }}>
                  {error}
                </td>
              </tr>
            ) : evaluacionesFiltradas.length === 0 ? (
              <tr className="table-empty-row">
                <td colSpan="8">
                  <div className="table-empty-state">
                    <div className="table-empty-icon"><ClipboardX size={26} strokeWidth={1.8} /></div>
                    <strong>
                      {admSearch || admFiltroEstado !== 'TODOS' || admFiltroProducto !== 'TODOS'
                        ? 'No encontramos evaluaciones'
                        : 'Aún no hay evaluaciones registradas'}
                    </strong>
                    <p>
                      {admSearch || admFiltroEstado !== 'TODOS' || admFiltroProducto !== 'TODOS'
                        ? 'Prueba modificando la búsqueda o limpiando los filtros seleccionados.'
                        : 'Las evaluaciones aparecerán aquí cuando sean registradas en el sistema.'}
                    </p>
                    {(admSearch || admFiltroEstado !== 'TODOS' || admFiltroProducto !== 'TODOS') && (
                      <button
                        type="button"
                        className="btn btn-ghost table-empty-action"
                        onClick={() => {
                          setAdmSearch('');
                          setAdmFiltroEstado('TODOS');
                          setAdmFiltroProducto('TODOS');
                        }}
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              evaluacionesPaginadas.map((ev) => (
                <tr 
                  key={ev.id} 
                  onClick={() => setSelectedClientInfo(ev)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--c-border)', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td data-label="DNI" style={{ padding: '12px', fontWeight: 'bold', color: 'var(--c-text)' }}>{ev.dni}</td>
                  <td data-label="Apellido paterno" style={{ padding: '12px', color: 'var(--c-text)' }}>{ev.ape_pat || '—'}</td>
                  <td data-label="Apellido materno" style={{ padding: '12px', color: 'var(--c-text)' }}>{ev.ape_mat || '—'}</td>
                  <td data-label="Nombres" style={{ padding: '12px', color: 'var(--c-text)' }}>{ev.nombres || '—'}</td>
                  <td data-label="Producto" style={{ padding: '12px', color: 'var(--c-text)' }}>{ev.productoVisible || '—'}</td>
                  <td data-label="Línea de crédito" style={{ padding: '12px', color: 'var(--c-text)', fontWeight: 'bold' }}>{formatLinea(ev.lineaVisible)}</td>
                  <td data-label="Estado" style={{ padding: '12px' }}>
                    <span style={{
                      backgroundColor: getEstadoStyle(ev.estadoVisible).bg,
                      color: getEstadoStyle(ev.estadoVisible).color,
                      padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}>
                      {ev.estadoVisible}
                    </span>
                  </td>
                  <td aria-hidden="true" style={{ display: 'none', padding: '12px', color: 'var(--c-muted)', fontSize: '13px' }}>{formatFecha(ev.fecha)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && !error && evaluacionesFiltradas.length > FILAS_POR_PAGINA && (
          <nav className="pagination clients-pagination" aria-label="Paginación de evaluaciones">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={paginaTabla === 1}
              onClick={() => setPaginaTabla(actual => Math.max(1, actual - 1))}
            >
              Anterior
            </button>
            <span className="text-sm">Página {paginaTabla} de {totalPaginasTabla}</span>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={paginaTabla === totalPaginasTabla}
              onClick={() => setPaginaTabla(actual => Math.min(totalPaginasTabla, actual + 1))}
            >
              Siguiente
            </button>
          </nav>
        )}
      </div>

      {/* Modal de Evaluación Manual */}
      {showEvalModal && createPortal((
        <div 
          className="sbs-modal-overlay"
          onClick={() => setShowEvalModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 9999, padding: '40px 20px', overflowY: 'auto'
          }}
        >
          <div 
            className="sbs-modal"
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--c-surface)', borderRadius: '12px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto',
              display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid var(--c-border)'
            }}
          >
            <div className="sbs-modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--c-surface-2)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--c-text)', margin: 0 }}>Consulta de Calificación Crediticia (SBS)</h2>
              <button 
                onClick={() => setShowEvalModal(false)} 
                style={{ 
                  background: 'var(--c-surface)', 
                  border: '1px solid var(--c-border)', 
                  cursor: 'pointer', 
                  color: 'var(--c-text)', 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  fontWeight: 'bold', 
                  fontSize: '13px',
                  transition: 'all 0.2s' 
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--c-surface-2)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--c-surface)'}
              >
                Cerrar
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="sbs-modal-body" style={{ padding: '24px' }}>
              {/* Buscador */}
              <div className="sbs-search-row" style={{ display: 'flex', gap: '12px', marginBottom: '30px' }}>
                <input
                  type="text"
                  placeholder="Ingrese DNI del cliente..."
                  value={dniSearch}
                  onChange={e => setDniSearch(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={e => { if (e.key === 'Enter') handleBuscarSBS(); }}
                  maxLength={8}
                  autoFocus
                  style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--c-border)', backgroundColor: 'var(--c-surface-2)', color: 'var(--c-text)', fontSize: '16px', outline: 'none' }}
                />
                <button 
                  onClick={handleBuscarSBS}
                  disabled={loadingEval || dniSearch.length < 8}
                  style={{
                    backgroundColor: '#0CA678', color: 'white', border: 'none', padding: '0 24px', borderRadius: '8px', 
                    fontWeight: 'bold', cursor: (loadingEval || dniSearch.length < 8) ? 'not-allowed' : 'pointer', fontSize: '16px',
                    opacity: (loadingEval || dniSearch.length < 8) ? 0.6 : 1
                  }}
                >
                  {loadingEval ? 'Consultando...' : 'Buscar en SBS'}
                </button>
              </div>

              {/* Loading State */}
              {loadingEval && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #E2E8F0', borderTopColor: '#0CA678', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <p style={{ color: '#64748B', marginTop: '16px', fontWeight: '500' }}>Conectando con la Superintendencia de Banca, Seguros y AFP...</p>
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {/* Resultados */}
              {evalResult && !loadingEval && (() => {
                const RATING_COLS = [
                  { key: 'normal',    label: 'Normal',               color: '#10B981' },
                  { key: 'problemas', label: 'Prob. Potenciales',    color: '#84CC16' },
                  { key: 'deficiente',label: 'Deficiente',           color: '#EAB308' },
                  { key: 'dudoso',    label: 'Dudoso',               color: '#F97316' },
                  { key: 'perdida',   label: 'Pérdida',              color: '#DC2626' },
                ];
                const thStyle = { padding: '8px 10px', fontSize: '11px', fontWeight: '700', color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', borderBottom: '1px solid var(--c-border)', whiteSpace: 'nowrap' };
                const tdStyle = { padding: '8px 10px', fontSize: '12px', color: 'var(--c-text)', borderBottom: '1px solid var(--c-border)' };
                const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: '6px', fontSize: '13px', color: 'var(--c-text)', backgroundColor: 'var(--c-surface-2)', outline: 'none', boxSizing: 'border-box' };
                const labelStyle = { fontSize: '11px', fontWeight: '700', color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '5px' };
                return (
                  <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Fila de metadatos */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {[
                        { label: 'DNI', value: evalResult.dni },
                        { label: 'Nombre', value: evalResult.nombre },
                        { label: 'Consulta', value: evalResult.fechaConsulta },
                        { label: 'Período', value: evalResult.periodo },
                      ].map(m => (
                        <div key={m.label} style={{ flex: 1, minWidth: 120, background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', borderRadius: '8px', padding: '8px 12px' }}>
                          <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--c-text)', marginTop: 2 }}>{m.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Calificación crediticia — barra compacta */}
                    <div className="sbs-rating-card" style={{ border: '1px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ padding: '8px 14px', background: 'var(--c-surface-2)', borderBottom: '1px solid var(--c-border)', fontSize: '11px', fontWeight: '700', color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Calificación Crediticia
                      </div>
                      <div style={{ display: 'flex', height: 6 }}>
                        {RATING_COLS.map(c => (
                          <div key={c.key} style={{ flex: evalResult.rating[c.key] || 0.5, background: c.color, minWidth: 4 }} />
                        ))}
                      </div>
                      <div className="sbs-rating-grid" style={{ display: 'flex' }}>
                        {RATING_COLS.map(c => (
                          <div key={c.key} style={{ flex: 1, padding: '8px 10px', borderRight: '1px solid var(--c-border)' }}>
                            <div style={{ fontSize: '10px', color: 'var(--c-muted)', fontWeight: '600' }}>{c.label}</div>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: c.color, marginTop: 2 }}>{evalResult.rating[c.key]}%</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: '5px 14px', fontSize: '10px', color: 'var(--c-muted)', borderTop: '1px solid var(--c-border)' }}>
                        Cifras redondeadas. No se muestra información menor a 0.5%
                      </div>
                    </div>

                    {/* Detalle de deuda */}
                    <div className="sbs-result-section" style={{ border: '1px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ padding: '8px 14px', background: 'var(--c-surface-2)', borderBottom: '1px solid var(--c-border)', fontSize: '11px', fontWeight: '700', color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Detalle de Deuda
                      </div>
                      <table className="sbs-result-table sbs-debt-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={thStyle}>#</th>
                            <th style={thStyle}>Entidad</th>
                            <th style={thStyle}>Calificación</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Capital</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Intereses</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {evalResult.deudas.map((d, i) => (
                            <tr key={i} style={{ background: i % 2 === 1 ? 'var(--c-surface-2)' : 'transparent' }}>
                              <td data-label="Registro" style={tdStyle}>{i + 1}</td>
                              <td data-label="Entidad" style={{ ...tdStyle, fontWeight: '600' }}>{d.entidad}</td>
                              <td data-label="Calificación" style={{ ...tdStyle }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '11px', fontWeight: '700', color: '#DC2626', background: 'rgba(220,38,38,0.08)', padding: '2px 8px', borderRadius: 99 }}>
                                  ● {d.calificacion}
                                </span>
                              </td>
                              <td data-label="Capital" style={{ ...tdStyle, textAlign: 'right' }}>S/. {d.capital}</td>
                              <td data-label="Intereses" style={{ ...tdStyle, textAlign: 'right' }}>S/. {d.intereses}</td>
                              <td data-label="Total" style={{ ...tdStyle, textAlign: 'right', fontWeight: '700' }}>S/. {d.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Líneas de crédito */}
                    <div className="sbs-result-section" style={{ border: '1px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ padding: '8px 14px', background: 'var(--c-surface-2)', borderBottom: '1px solid var(--c-border)', fontSize: '11px', fontWeight: '700', color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Líneas de Crédito <span style={{ fontWeight: '400', textTransform: 'none', fontSize: '10px' }}>— otorgadas y no utilizadas</span>
                      </div>
                      <table className="sbs-result-table sbs-credit-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={thStyle}>#</th>
                            <th style={thStyle}>Entidad Reportante</th>
                            <th style={thStyle}>Tipo de Línea</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Total Línea</th>
                          </tr>
                        </thead>
                        <tbody>
                          {evalResult.lineas.map((l, i) => (
                            <tr key={i} style={{ background: i % 2 === 1 ? 'var(--c-surface-2)' : 'transparent' }}>
                              <td data-label="Registro" style={tdStyle}>{i + 1}</td>
                              <td data-label="Entidad reportante" style={{ ...tdStyle, fontWeight: '600' }}>{l.entidad}</td>
                              <td data-label="Tipo de línea" style={tdStyle}>{l.tipo}</td>
                              <td data-label="Total de línea" style={{ ...tdStyle, textAlign: 'right', fontWeight: '700' }}>S/. {l.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Cerrar */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setShowEvalModal(false)}
                        style={{ padding: '9px 24px', background: 'var(--c-surface-2)', color: 'var(--c-text)', border: '1px solid var(--c-border)', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                        Cerrar
                      </button>
                    </div>

                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Modal de Detalle del Cliente */}
      {selectedClientInfo && (
        <div 
          className="admission-detail-overlay"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px'
          }}
          onClick={() => setSelectedClientInfo(null)}
        >
          <div 
            className="admission-detail-modal"
            style={{
              backgroundColor: 'var(--c-surface)', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', border: '1px solid var(--c-border)', overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="admission-detail-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--c-surface-2)', flexShrink: 0, gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--c-text)', margin: 0 }}>{selectedClientInfo.nombres} {selectedClientInfo.ape_pat} {selectedClientInfo.ape_mat}</h2>
                <p style={{ color: 'var(--c-muted)', fontSize: '13px', marginTop: '4px', margin: 0 }}>DNI: {selectedClientInfo.dni} • Estado: <strong style={{ color: selectedClientInfo.estadoVisible === 'APTO' ? '#0CA678' : '#EF4444' }}>{selectedClientInfo.estadoVisible}</strong></p>
              </div>
              <button 
                onClick={() => setSelectedClientInfo(null)} 
                style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', cursor: 'pointer', color: 'var(--c-text)', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--c-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--c-surface)'}
              >
                Cerrar
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="admission-detail-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', overflowX: 'hidden', flex: '1 1 auto', minHeight: 0, overscrollBehavior: 'contain' }}>
              
              {/* Sección 1 */}
              <div style={{ border: '1px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ backgroundColor: 'var(--c-surface-2)', padding: '12px 16px', fontWeight: 'bold', color: 'var(--c-text)', borderBottom: '1px solid var(--c-border)' }}>
                  👤 Datos de Identidad y Demográficos
                </div>
                <div className="admission-detail-grid" style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <InfoItem label="Edad actual" value="34 años" />
                  <InfoItem label="Estado civil" value="Casado(a)" />
                  <InfoItem label="Número de dependientes" value="2" />
                  <InfoItem label="Tipo de residencia" value="Familiar" />
                  <InfoItem label="Tiempo de residencia" value="5 años" />
                </div>
              </div>

              {/* Sección 2 */}
              <div style={{ border: '1px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ backgroundColor: 'var(--c-surface-2)', padding: '12px 16px', fontWeight: 'bold', color: 'var(--c-text)', borderBottom: '1px solid var(--c-border)' }}>
                  💰 Ingresos Detallados
                </div>
                <div className="admission-detail-grid" style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <InfoItem label="Ingreso neto mensual fijo" value="S/ 3,500.00" />
                  <InfoItem label="Ingresos variables promedio" value="S/ 500.00" />
                  <InfoItem label="Ingresos de la sociedad conyugal" value="S/ 2,000.00" />
                  <InfoItem label="Otros ingresos comprobables" value="S/ 0.00" />
                </div>
              </div>

              {/* Sección 3 */}
              <div style={{ border: '1px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ backgroundColor: 'var(--c-surface-2)', padding: '12px 16px', fontWeight: 'bold', color: 'var(--c-text)', borderBottom: '1px solid var(--c-border)' }}>
                  📉 Gastos y Obligaciones Mensuales
                </div>
                <div className="admission-detail-grid" style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <InfoItem label="Costo de vivienda mensual" value="S/ 800.00" />
                  <InfoItem label="Gastos de vida estimados" value="S/ 1,200.00" />
                  <InfoItem label="Cuotas de deudas financieras" value="S/ 450.00" />
                  <InfoItem label="Obligaciones legales" value="Ninguna" />
                </div>
              </div>

              {/* Sección 4 */}
              <div style={{ border: '1px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ backgroundColor: 'var(--c-surface-2)', padding: '12px 16px', fontWeight: 'bold', color: 'var(--c-text)', borderBottom: '1px solid var(--c-border)' }}>
                  💼 Situación Laboral y Profesional
                </div>
                <div className="admission-detail-grid" style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <InfoItem label="Tipo de contrato" value="Indefinido" />
                  <InfoItem label="Antigüedad laboral actual" value="3 años y 2 meses" />
                  <InfoItem label="Antigüedad en el giro" value="5 años" />
                  <InfoItem label="Sector económico" value="Tecnología / Servicios" />
                </div>
              </div>

              {/* Sección 5 */}
              <div style={{ border: '1px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ backgroundColor: 'var(--c-surface-2)', padding: '12px 16px', fontWeight: 'bold', color: 'var(--c-text)', borderBottom: '1px solid var(--c-border)' }}>
                  🏛️ Situación Financiera y Patrimonial
                </div>
                <div className="admission-detail-grid" style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <InfoItem label="Patrimonio neto" value="S/ 45,000.00" />
                  <InfoItem label="Saldo promedio en cuentas" value="S/ 2,300.00" />
                  <InfoItem label="Score de crédito numérico" value="750" />
                  <InfoItem label="Número de entidades acreedoras" value="2" />
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente helper para mostrar la información en 2 columnas
function InfoItem({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: '11px', color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{label}</span>
      <span style={{ fontSize: '14px', color: 'var(--c-text)', fontWeight: '500', marginTop: '4px' }}>{value}</span>
    </div>
  );
}
