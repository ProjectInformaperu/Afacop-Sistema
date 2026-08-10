import bcrypt from 'bcryptjs';
import prisma from '../src/config/prisma.js';

const username = (process.env.INITIAL_ADMIN_USERNAME || 'admin').trim().toLowerCase();
const password = process.env.INITIAL_ADMIN_PASSWORD || '';

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
    select: { id_usuario: true, username: true },
  });

  if (existingAdmin) {
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
