import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { env, mfaExemptUsernames } from '../config/env.js';
import { normalizeRole } from '../security/roles.js';
import * as mfaService from './mfa.service.js';

function mapearUsuario(usuario) {
  const asesor = usuario.asesor;
  return {
    id: usuario.id_usuario, username: usuario.username, rol: normalizeRole(usuario.rol),
    nombres: asesor?.nombres || null,
    apellidos: asesor ? `${asesor.apellido_paterno ?? ''} ${asesor.apellido_materno ?? ''}`.trim() : null,
    estado: usuario.estado, id_asesor: usuario.id_asesor,
    sede_id: null, sede_nombre: null, modelo_negocio: null,
  };
}

function issueAccessToken(usuario) {
  return jwt.sign(
    { username: usuario.username, rol: normalizeRole(usuario.rol), id_asesor: usuario.id_asesor, type: 'access', ver: usuario.token_version },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN, algorithm: 'HS256', issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE, subject: usuario.id_usuario, jwtid: crypto.randomUUID(),
    }
  );
}

async function login(username, password) {
  try {
    const normalizedUsername = String(username || '').trim().toLowerCase();
    const usuario = await prisma.usuario.findUnique({ where: { username: normalizedUsername }, include: { asesor: true } });
    // Comparación dummy para reducir diferencias temporales que faciliten enumeración de usuarios.
    const fallbackHash = '$2b$10$C6UzMDM.H6dfI/f/IKcEe.5Y8R6f0QqM6V7CqY2Y5nJzP9D1r7G7K';
    const validPassword = await bcrypt.compare(password, usuario?.password_hash || fallbackHash);
    if (usuario?.bloqueado_hasta && usuario.bloqueado_hasta > new Date()) {
      return { success: false, code: 'ACCOUNT_LOCKED', error: 'Cuenta temporalmente bloqueada por seguridad' };
    }
    if (!usuario || !validPassword) {
      if (usuario) {
        const attempts = usuario.intentos_fallidos + 1;
        const lock = attempts >= env.MAX_LOGIN_FAILURES ? new Date(Date.now() + env.ACCOUNT_LOCK_MINUTES * 60_000) : null;
        await prisma.usuario.update({ where: { id_usuario: usuario.id_usuario }, data: { intentos_fallidos: lock ? 0 : attempts, bloqueado_hasta: lock } });
      }
      return { success: false, code: 'INVALID_CREDENTIALS', error: 'Credenciales incorrectas' };
    }
    if (usuario.estado !== 'ACTIVO') return { success: false, code: 'USER_INACTIVE', error: 'Cuenta inactiva. Contacte al administrador.' };
    await prisma.usuario.update({ where: { id_usuario: usuario.id_usuario }, data: { intentos_fallidos: 0, bloqueado_hasta: null, ultimo_acceso: new Date() } });

    const exemptFromGlobalMfa = mfaExemptUsernames.includes(usuario.username.trim().toLowerCase());
    if (usuario.mfa_habilitado) {
      return { success: true, mfaRequired: true, challengeToken: mfaService.createChallenge(usuario) };
    }
    if (usuario.mfa_requerido || (!exemptFromGlobalMfa && env.REQUIRE_MFA === 'true')) {
      return { success: true, mfaEnrollmentRequired: true, challengeToken: mfaService.createEnrollmentChallenge(usuario) };
    }
    return { success: true, token: issueAccessToken(usuario), user: mapearUsuario(usuario) };
  } catch {
    return { success: false, code: 'INTERNAL_ERROR', error: 'Error interno del servidor al procesar el inicio de sesión' };
  }
}

async function verifyMfa(challengeToken, code) {
  const usuario = await mfaService.verifyChallenge(challengeToken, code);
  return { success: true, token: issueAccessToken(usuario), user: mapearUsuario(usuario) };
}

async function setupMfaEnrollment(challengeToken) {
  return mfaService.setupEnrollment(challengeToken);
}

async function confirmMfaEnrollment(challengeToken, code) {
  const usuario = await mfaService.confirmEnrollment(challengeToken, code);
  return { success: true, token: issueAccessToken(usuario), user: mapearUsuario(usuario) };
}

async function me(idUsuario) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id_usuario: idUsuario }, include: { asesor: true } });
    if (!usuario) return { success: false, code: 'USER_NOT_FOUND', error: 'Usuario no encontrado' };
    if (usuario.estado !== 'ACTIVO') return { success: false, code: 'USER_INACTIVE', error: 'Cuenta inactiva' };
    return { success: true, user: mapearUsuario(usuario) };
  } catch {
    return { success: false, code: 'INTERNAL_ERROR', error: 'Error interno del servidor al obtener la sesión' };
  }
}

async function logout(idUsuario) {
  await prisma.usuario.update({ where: { id_usuario: idUsuario }, data: { token_version: { increment: 1 } } });
}

export default { login, verifyMfa, setupMfaEnrollment, confirmMfaEnrollment, me, logout };
