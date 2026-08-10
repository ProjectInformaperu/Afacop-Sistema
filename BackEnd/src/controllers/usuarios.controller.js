import usuariosService from '../services/usuarios.service.js';

async function listar(_req, res, next) {
  try { res.json({ data: await usuariosService.listar() }); } catch (error) { next(error); }
}
async function crear(req, res, next) {
  try { res.status(201).json({ data: await usuariosService.crear(req.body) }); } catch (error) { next(error); }
}
async function actualizar(req, res, next) {
  try { res.json({ data: await usuariosService.actualizar(req.params.id, req.body) }); } catch (error) { next(error); }
}
async function eliminar(req, res, next) {
  try { await usuariosService.eliminar(req.params.id, req.user.id); res.status(204).send(); } catch (error) { next(error); }
}

async function resetMfa(req, res, next) {
  try { await usuariosService.resetMfa(req.params.id); res.json({ message: 'MFA restablecido; el usuario deberá enrolarlo nuevamente' }); } catch (error) { next(error); }
}
export default { listar, crear, actualizar, eliminar, resetMfa };
