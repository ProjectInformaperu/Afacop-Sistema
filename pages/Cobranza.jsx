import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

export default function Cobranza() {
  const { api } = useContext(AuthContext);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  useEffect(() => { api.get('/api/clientes').then(response => setClients(response.data.data || response.data.clientes || [])).catch(() => setClients([])); }, [api]);
  const rows = clients.filter(client => `${client.nombres} ${client.apellido_paterno} ${client.dni}`.toLowerCase().includes(search.toLowerCase()));
  const total = clients.reduce((sum, client) => sum + Number(client.deuda_vigente || 0), 0);
  return <div className="module-page"><div className="module-heading"><div><span className="eyebrow">CARTERA</span><h1>Cobranza</h1><p>Prioriza clientes y consulta el saldo vigente de la cartera.</p></div><span className="module-status">Gestión activa</span></div><div className="module-kpis"><div><strong>{clients.length}</strong><span>Clientes en cartera</span></div><div><strong>S/ {total.toFixed(2)}</strong><span>Deuda vigente</span></div><div><strong>{clients.filter(c => Number(c.deuda_vigente) > 0).length}</strong><span>Con saldo pendiente</span></div></div><section className="module-card"><div className="section-title"><div><h2>Clientes priorizados</h2><p>Ordena tu trabajo por saldo pendiente.</p></div><input className="module-search" placeholder="Buscar por nombre o DNI" value={search} onChange={e => setSearch(e.target.value)} /></div><div className="module-table-wrap"><table><thead><tr><th>Cliente</th><th>DNI</th><th>Distrito</th><th>Deuda vigente</th><th>Estado</th></tr></thead><tbody>{rows.sort((a, b) => Number(b.deuda_vigente || 0) - Number(a.deuda_vigente || 0)).map(client => <tr key={client.id_cliente}><td>{client.nombres} {client.apellido_paterno}</td><td>{client.dni}</td><td>{client.distrito || 'Sin distrito'}</td><td>S/ {Number(client.deuda_vigente || 0).toFixed(2)}</td><td><span className={`status-pill ${Number(client.deuda_vigente || 0) ? 'status-warning' : 'status-success'}`}>{Number(client.deuda_vigente || 0) ? 'Pendiente' : 'Al día'}</span></td></tr>)}{!rows.length && <tr><td colSpan="5" className="empty-state">No hay clientes para mostrar.</td></tr>}</tbody></table></div></section></div>;
}
