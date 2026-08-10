import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { normalizeRole } from '../security/roles.js';

export async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Token de autorización requerido', code: 'AUTH_REQUIRED', requestId: req.id });
    const [scheme, token, extra] = header.trim().split(/\s+/);
    if (scheme !== 'Bearer' || !token || extra) {
      return res.status(401).json({ error: 'Formato de autorización inválido', code: 'INVALID_AUTH_FORMAT', requestId: req.id });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'], issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE,
      });
    } catch {
      return res.status(401).json({ error: 'Token inválido o expirado', code: 'INVALID_TOKEN', requestId: req.id });
    }

    if (decoded.type !== 'access') {
      return res.status(401).json({ error: 'Token de acceso inválido', code: 'INVALID_TOKEN', requestId: req.id });
    }
    const usuario = await prisma.usuario.findUnique({ where: { id_usuario: decoded.sub } });
    if (!usuario || usuario.username !== decoded.username) {
      return res.status(401).json({ error: 'Sesión no válida', code: 'INVALID_SESSION', requestId: req.id });
    }
    if (decoded.ver !== usuario.token_version) {
      return res.status(401).json({ error: 'Sesión revocada', code: 'SESSION_REVOKED', requestId: req.id });
    }
    if (usuario.estado !== 'ACTIVO') {
      return res.status(403).json({ error: 'Usuario inactivo', code: 'USER_INACTIVE', requestId: req.id });
    }
    req.user = {
      id: usuario.id_usuario, username: usuario.username,
      rol: normalizeRole(usuario.rol), id_asesor: usuario.id_asesor,
    };
    next();
  } catch (error) {
    next(error);
  }
}
