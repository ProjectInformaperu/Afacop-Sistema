import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateSecret, generateURI, verify } from 'otplib';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { decryptSecret, encryptSecret } from '../security/crypto.js';

const jwtOptions = { algorithms: ['HS256'], issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE };

export function createChallenge(usuario) {
  return jwt.sign({ type: 'mfa_challenge' }, env.JWT_SECRET, {
    algorithm: 'HS256', issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE,
    subject: usuario.id_usuario, expiresIn: '5m',
  });
}

export function createEnrollmentChallenge(usuario) {
  return jwt.sign({ type: 'mfa_enrollment' }, env.JWT_SECRET, {
    algorithm: 'HS256', issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE,
    subject: usuario.id_usuario, expiresIn: '10m',
  });
}

async function enrollmentUser(challengeToken) {
  const decoded = jwt.verify(challengeToken, env.JWT_SECRET, jwtOptions);
  if (decoded.type !== 'mfa_enrollment') throw Object.assign(new Error('Desafío de enrolamiento inválido'), { statusCode: 401 });
  const usuario = await prisma.usuario.findUnique({ where: { id_usuario: decoded.sub }, include: { asesor: true } });
  if (!usuario || usuario.estado !== 'ACTIVO' || usuario.mfa_habilitado) {
    throw Object.assign(new Error('Desafío de enrolamiento inválido'), { statusCode: 401 });
  }
  return usuario;
}

export async function setupEnrollment(challengeToken) {
  const usuario = await enrollmentUser(challengeToken);
  return setup(usuario.id_usuario, usuario.username);
}

export async function confirmEnrollment(challengeToken, code) {
  const usuario = await enrollmentUser(challengeToken);
  await confirm(usuario.id_usuario, code);
  return prisma.usuario.findUnique({ where: { id_usuario: usuario.id_usuario }, include: { asesor: true } });
}

export async function verifyChallenge(challengeToken, code) {
  const decoded = jwt.verify(challengeToken, env.JWT_SECRET, jwtOptions);
  if (decoded.type !== 'mfa_challenge') throw Object.assign(new Error('Desafío MFA inválido'), { statusCode: 401 });
  const usuario = await prisma.usuario.findUnique({ where: { id_usuario: decoded.sub }, include: { asesor: true } });
  if (!usuario || usuario.estado !== 'ACTIVO' || !usuario.mfa_habilitado || !usuario.mfa_secreto) {
    throw Object.assign(new Error('Desafío MFA inválido'), { statusCode: 401 });
  }
  const result = await verify({ secret: decryptSecret(usuario.mfa_secreto), token: code, epochTolerance: 30 });
  if (!result.valid) throw Object.assign(new Error('Código de verificación inválido'), { statusCode: 401 });
  const usedAt = new Date(result.epoch * 1000);
  if (usuario.mfa_ultimo_uso && usuario.mfa_ultimo_uso >= usedAt) {
    throw Object.assign(new Error('El código ya fue utilizado'), { statusCode: 401 });
  }
  const updated = await prisma.usuario.updateMany({
    where: { id_usuario: usuario.id_usuario, OR: [{ mfa_ultimo_uso: null }, { mfa_ultimo_uso: { lt: usedAt } }] },
    data: { mfa_ultimo_uso: usedAt },
  });
  if (updated.count !== 1) throw Object.assign(new Error('El código ya fue utilizado'), { statusCode: 401 });
  return usuario;
}

export async function setup(userId, username) {
  const secret = generateSecret();
  await prisma.usuario.update({ where: { id_usuario: userId }, data: { mfa_secreto: encryptSecret(secret), mfa_habilitado: false } });
  return { secret, otpauthUri: generateURI({ issuer: 'Mi Radar 360', label: username, secret }) };
}

export async function confirm(userId, code) {
  const usuario = await prisma.usuario.findUnique({ where: { id_usuario: userId } });
  if (!usuario?.mfa_secreto) throw Object.assign(new Error('Primero debe iniciar la configuración MFA'), { statusCode: 409 });
  const result = await verify({ secret: decryptSecret(usuario.mfa_secreto), token: code, epochTolerance: 30 });
  if (!result.valid) throw Object.assign(new Error('Código de verificación inválido'), { statusCode: 400 });
  await prisma.usuario.update({ where: { id_usuario: userId }, data: { mfa_habilitado: true, mfa_ultimo_uso: new Date(result.epoch * 1000) } });
}

export async function disable(userId, password) {
  const usuario = await prisma.usuario.findUnique({ where: { id_usuario: userId } });
  if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
    throw Object.assign(new Error('Contraseña incorrecta'), { statusCode: 401 });
  }
  await prisma.usuario.update({ where: { id_usuario: userId }, data: { mfa_habilitado: false, mfa_secreto: null, mfa_ultimo_uso: null } });
}
