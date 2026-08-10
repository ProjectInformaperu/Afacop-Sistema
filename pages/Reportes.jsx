import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

export default function Reportes() {
  const { api } = useContext(AuthContext);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/api/reportes/resumen').then(response => setReport(response.data.data)).catch(() => setError('No se pudo cargar el resumen.')); }, [api]);
  const exportCsv = () => { if (!report) return; const csv = `Indicador,Valor\nVisitas,${report.visitas}\nEfectivas,${report.efectivas}\nRecaudacion,${report.recaudacion}`; const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'reporte-operativo.csv'; link.click(); URL.revokeObjectURL(link.href); };
  return <div className="module-page"><div className="module-heading"><div><span className="eyebrow">CONTROL</span><h1>Reportes</h1><p>Indicadores simples para decidir dónde actuar primero.</p></div><button className="btn btn-primary" onClick={exportCsv}>Exportar CSV</button></div>{error && <p className="form-message">{error}</p>}<div className="report-grid"><div className="report-hero"><span>Resumen operativo</span><strong>{report?.efectividad || 0}%</strong><p>Efectividad de gestiones registradas</p></div><div className="module-card report-list"><h2>Indicadores del periodo</h2>{[['Visitas registradas', report?.visitas || 0], ['Gestiones efectivas', report?.efectivas || 0], ['Recaudación acumulada', `S/ ${Number(report?.recaudacion || 0).toFixed(2)}`]].map(([label, value]) => <div className="report-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></div></div>;
}
