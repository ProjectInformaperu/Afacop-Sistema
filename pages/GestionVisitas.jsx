import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

const initialForm = { id_cliente: '', id_asesor: '', resultado: 'GESTIONADO', monto_recaudado: '', observaciones: '' };

export default function GestionVisitas() {
  const { api } = useContext(AuthContext);
  const [visitas, setVisitas] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const response = await api.get('/api/visitas');
      setVisitas(response.data.data || []);
    } catch {
      setMessage('No se pudieron cargar las visitas. Verifica la conexión con el servidor.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/api/visitas').then(response => setVisitas(response.data.data || []))
      .catch(() => setMessage('No se pudieron cargar las visitas. Verifica la conexión con el servidor.'))
      .finally(() => setLoading(false));
  }, [api]);

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await api.post('/api/visitas', { ...form, id_cliente: Number(form.id_cliente), id_asesor: Number(form.id_asesor) });
      setForm(initialForm);
      setMessage('Visita registrada correctamente.');
      load();
    } catch (error) { setMessage(error.response?.data?.mensaje || 'No se pudo registrar la visita.'); }
  };

  const visible = visitas.filter((visit) => `${visit.cliente?.nombres || ''} ${visit.resultado}`.toLowerCase().includes(filter.toLowerCase()));
  const total = visitas.reduce((sum, visit) => sum + Number(visit.monto_recaudado || 0), 0);

  return <div className="module-page">
    <div className="module-heading"><div><span className="eyebrow">OPERACION</span><h1>Visitas</h1><p>Registra gestiones de campo y consulta su resultado en un solo lugar.</p></div><span className="module-status">Actualizado hoy</span></div>
    <div className="module-kpis"><div><strong>{visitas.length}</strong><span>Visitas registradas</span></div><div><strong>{visitas.filter(v => v.es_efectiva).length}</strong><span>Gestiones efectivas</span></div><div><strong>S/ {total.toFixed(2)}</strong><span>Total recaudado</span></div></div>
    <div className="module-columns">
      <section className="module-card"><div className="section-title"><div><h2>Registrar visita</h2><p>Completa los datos mínimos de la gestión.</p></div></div>
        <form onSubmit={submit} className="module-form">
          <label>ID cliente<input required type="number" min="1" value={form.id_cliente} onChange={e => setForm({ ...form, id_cliente: e.target.value })} /></label>
          <label>ID asesor<input required type="number" min="1" value={form.id_asesor} onChange={e => setForm({ ...form, id_asesor: e.target.value })} /></label>
          <label>Resultado<select value={form.resultado} onChange={e => setForm({ ...form, resultado: e.target.value })}><option>GESTIONADO</option><option>PROMESA DE PAGO</option><option>NO CONTACTADO</option><option>REPROGRAMADO</option></select></label>
          <label>Monto recaudado<input type="number" min="0" step="0.01" value={form.monto_recaudado} onChange={e => setForm({ ...form, monto_recaudado: e.target.value })} /></label>
          <label className="full">Observaciones<textarea rows="3" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} /></label>
          <button className="btn btn-primary full" type="submit">Guardar visita</button>
        </form>
        {message && <p className="form-message">{message}</p>}
      </section>
      <section className="module-card"><div className="section-title"><div><h2>Historial reciente</h2><p>{loading ? 'Cargando...' : `${visible.length} resultados`}</p></div><input className="module-search" placeholder="Buscar resultado" value={filter} onChange={e => setFilter(e.target.value)} /></div>
        <div className="module-table-wrap"><table><thead><tr><th>Cliente</th><th>Resultado</th><th>Fecha</th><th>Monto</th></tr></thead><tbody>{visible.map(visit => <tr key={visit.id_visita}><td>{visit.cliente ? `${visit.cliente.nombres} ${visit.cliente.apellido_paterno}` : `Cliente #${visit.id_cliente}`}</td><td><span className="status-pill">{visit.resultado}</span></td><td>{new Date(visit.fecha_hora_checkin).toLocaleDateString('es-PE')}</td><td>S/ {Number(visit.monto_recaudado || 0).toFixed(2)}</td></tr>)}{!loading && !visible.length && <tr><td colSpan="4" className="empty-state">Aún no hay visitas registradas.</td></tr>}</tbody></table></div>
      </section>
    </div>
  </div>;
}
