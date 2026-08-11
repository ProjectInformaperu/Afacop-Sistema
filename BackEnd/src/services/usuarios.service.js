import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import { ALL_ROLES, normalizeRole } from '../security/roles.js';

function mapUsuario(usuario) {
  return {
    id: usuario.id_usuario, username: usuario.username, rol: normalizeRole(usuario.rol),
    estado: usuario.estado, id_asesor: usuario.id_asesor,
    mfa_habilitado: usuario.mfa_habilitado || usuario.mfa_requerido,
    mfa_confirmado: usuario.mfa_habilitado,
    nombres: usuario.asesor?.nombres || '',
    apellidos: usuario.asesor ? `${usuario.asesor.apellido_paterno} ${usuario.asesor.apellido_materno}`.trim() : '',
    email: usuario.asesor?.correo || '',
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
      rol: normalizeRole(datos.rol), estado: datos.estado || 'ACTIVO',
      mfa_requerido: datos.mfa_habilitado === true,
    }, include: { asesor: true },
  });
  return mapUsuario(usuario);
}

async function actualizar(id, datos) {
  if (datos.rol) assertRole(datos.rol);
  const data = {
    ...(datos.username ? { username: datos.username.trim().toLowerCase() } : {}),
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
    data.token_version = { increment: 1 };
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
