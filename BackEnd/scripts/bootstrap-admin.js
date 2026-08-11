import bcrypt from 'bcryptjs';
import prisma from '../src/config/prisma.js';

// El nombre de acceso y el rol son conceptos distintos. El usuario inicial es
// "Afacop" (persistido en minúsculas para que el inicio de sesión no distinga
// mayúsculas), mientras que sus permisos pertenecen al rol ADMINISTRADOR.
const username = (process.env.INITIAL_ADMIN_USERNAME || 'Afacop').trim().toLowerCase();
const password = process.env.INITIAL_ADMIN_PASSWORD || '';
const resetRequested = process.env.RESET_INITIAL_ADMIN === 'true';

function validateCredentials() {
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
    throw new Error('INITIAL_ADMIN_USERNAME debe tener entre 3 y 50 caracteres validos');
  }
  if (
    password.length < 12
    || !/[a-z]/.test(password)
    || !/[A-Z]/.test(password)
    || !/\d/.test(password)
    || !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error('INITIAL_ADMIN_PASSWORD debe tener al menos 12 caracteres, mayuscula, minuscula, numero y simbolo');
  }
}

try {
  const existingAdmin = await prisma.usuario.findFirst({
    where: { rol: { in: ['ADMINISTRADOR', 'ADMIN'] } },
    select: { id_usuario: true, username: true, ultimo_acceso: true },
  });

  const firstProductionAccess = Boolean(existingAdmin && password && !existingAdmin.ultimo_acceso);
  if (existingAdmin && (resetRequested || firstProductionAccess)) {
    validateCredentials();
    const usernameOwner = await prisma.usuario.findUnique({ where: { username }, select: { id_usuario: true } });
    if (usernameOwner && usernameOwner.id_usuario !== existingAdmin.id_usuario) {
      throw new Error(`INITIAL_ADMIN_USERNAME ya pertenece a otro usuario: ${username}`);
    }
    await prisma.usuario.update({
      where: { id_usuario: existingAdmin.id_usuario },
      data: {
        username,
        password_hash: await bcrypt.hash(password, 12),
        rol: 'ADMINISTRADOR',
        estado: 'ACTIVO',
        intentos_fallidos: 0,
        bloqueado_hasta: null,
        token_version: { increment: 1 },
        mfa_requerido: false,
        mfa_habilitado: false,
        mfa_secreto: null,
        mfa_ultimo_uso: null,
        password_cambio: new Date(),
      },
    });
    process.stdout.write(
      resetRequested
        ? `Administrador ${username} restablecido. Desactive RESET_INITIAL_ADMIN inmediatamente.\n`
        : `Credenciales iniciales aplicadas al administrador ${username}.\n`
    );
  } else if (existingAdmin) {
    process.stdout.write(`Administrador existente: ${existingAdmin.username}. Bootstrap omitido.\n`);
  } else {
    validateCredentials();
    await prisma.usuario.create({
      data: {
        username,
        password_hash: await bcrypt.hash(password, 12),
        rol: 'ADMINISTRADOR',
        estado: 'ACTIVO',
      },
    });
    process.stdout.write(`Administrador inicial creado: ${username}.\n`);
  }
} finally {
  await prisma.$disconnect();
}
