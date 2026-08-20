import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import { ALL_ROLES, normalizeRole } from '../security/roles.js';
import { env, mfaExemptUsernames } from '../config/env.js';

function mapUsuario(usuario) {
  const globallyRequired = env.REQUIRE_MFA === 'true'
    && !usuario.mfa_exento
    && !mfaExemptUsernames.includes(usuario.username.trim().toLowerCase());
  return {
    id: usuario.id_usuario, username: usuario.username, rol: normalizeRole(usuario.rol),
    estado: usuario.estado, id_asesor: usuario.id_asesor,
    mfa_habilitado: usuario.mfa_habilitado || usuario.mfa_requerido || globallyRequired,
    mfa_confirmado: usuario.mfa_habilitado,
    nombres: usuario.nombres || usuario.asesor?.nombres || '',
    apellidos: usuario.apellidos || (usuario.asesor ? `${usuario.asesor.apellido_paterno} ${usuario.asesor.apellido_materno}`.trim() : ''),
    email: usuario.email || usuario.asesor?.correo || '',
    sede: usuario.sede || usuario.asesor?.distrito || '',
  };
}

function assertRole(role) {
  if (!ALL_ROLES.includes(normalizeRole(role))) {
    const error = new Error('El rol indicado no está permitido'); error.statusCode = 400; throw error;
  }
}

async function listar() {
  const usuarios = await prisma.usuario.findMany({ include: { asesor: true }, orderBy: { fecha_creacion: 'asc' } });
  return usuarios.map(mapUsuario);
}

async function crear(datos) {
  assertRole(datos.rol);
  const usuario = await prisma.usuario.create({
    data: {
      username: datos.username.trim().toLowerCase(), password_hash: await bcrypt.hash(datos.password, 12),
      nombres: datos.nombres?.trim() || null,
      apellidos: datos.apellidos?.trim() || null,
      email: datos.email?.trim().toLowerCase() || null,
      sede: datos.sede?.trim() || null,
      rol: normalizeRole(datos.rol), estado: datos.estado || 'ACTIVO',
      mfa_requerido: datos.mfa_habilitado === true,
      mfa_exento: datos.mfa_habilitado !== true,
    }, include: { asesor: true },
  });
  return mapUsuario(usuario);
}

async function actualizar(id, datos, actorId) {
  if (id === actorId && datos.estado === 'INACTIVO') {
    const error = new Error('No puede desactivar su propia cuenta activa'); error.statusCode = 409; throw error;
  }
  if (datos.rol) assertRole(datos.rol);
  const actual = await prisma.usuario.findUnique({ where: { id_usuario: id } });
  if (!actual) {
    const error = new Error('Usuario no encontrado'); error.statusCode = 404; throw error;
  }
  const data = {
    ...(datos.username ? { username: datos.username.trim().toLowerCase() } : {}),
    ...(datos.nombres !== undefined ? { nombres: datos.nombres.trim() || null } : {}),
    ...(datos.apellidos !== undefined ? { apellidos: datos.apellidos.trim() || null } : {}),
    ...(datos.email !== undefined ? { email: datos.email.trim().toLowerCase() || null } : {}),
    ...(datos.sede !== undefined ? { sede: datos.sede.trim() || null } : {}),
    ...(datos.rol ? { rol: normalizeRole(datos.rol) } : {}),
    ...(datos.estado ? { estado: datos.estado } : {}),
  };
  if (datos.password) {
    data.password_hash = await bcrypt.hash(datos.password, 12);
    data.token_version = { increment: 1 };
    data.password_cambio = new Date();
    data.intentos_fallidos = 0;
    data.bloqueado_hasta = null;
  }
  if (typeof datos.mfa_habilitado === 'boolean') {
    data.mfa_requerido = datos.mfa_habilitado;
    data.mfa_exento = !datos.mfa_habilitado;
    const mfaChanged = actual.mfa_exento !== !datos.mfa_habilitado
      || (datos.mfa_habilitado && !actual.mfa_habilitado && !actual.mfa_requerido)
      || (!datos.mfa_habilitado && (actual.mfa_habilitado || actual.mfa_requerido));
    if (mfaChanged) data.token_version = { increment: 1 };
    if (!datos.mfa_habilitado) {
      data.mfa_habilitado = false;
      data.mfa_secreto = null;
      data.mfa_ultimo_uso = null;
    }
  }
  const usuario = await prisma.usuario.update({ where: { id_usuario: id }, data, include: { asesor: true } });
  return mapUsuario(usuario);
}

async function eliminar(id, actorId) {
  if (id === actorId) {
    const error = new Error('No puede eliminar su propia cuenta activa'); error.statusCode = 409; throw error;
  }
  await prisma.usuario.delete({ where: { id_usuario: id } });
}

async function resetMfa(id) {
  await prisma.usuario.update({
    where: { id_usuario: id },
    data: { mfa_requerido: true, mfa_habilitado: false, mfa_secreto: null, mfa_ultimo_uso: null, token_version: { increment: 1 } },
  });
}

export default { listar, crear, actualizar, eliminar, resetMfa };
