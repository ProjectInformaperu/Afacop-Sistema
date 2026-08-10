import { ROLES } from '../security/roles.js';

export function requireAdvisorLink(req, res, next) {
  if (req.user?.rol === ROLES.ASESOR && !req.user.id_asesor) {
    return res.status(403).json({ error: 'La cuenta no está vinculada a un asesor', code: 'ADVISOR_LINK_REQUIRED', requestId: req.id });
  }
  next();
}
