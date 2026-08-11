import 'dotenv/config';
import { z } from 'zod';

const corsOrigins = z.string().superRefine((value, ctx) => {
  const origins = value.split(',').map(origin => origin.trim()).filter(Boolean);
  if (origins.length === 0) {
    ctx.addIssue({ code: 'custom', message: 'Debe declarar al menos un origen permitido' });
    return;
  }
  for (const origin of origins) {
    if (origin === '*' || origin.endsWith('/')) {
      ctx.addIssue({ code: 'custom', message: `Origen CORS no permitido: ${origin}. No use comodines ni / al final` });
      continue;
    }
    try {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) throw new Error();
    } catch {
      ctx.addIssue({ code: 'custom', message: `Origen CORS inválido: ${origin}` });
    }
  }
});

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  GEOCODING_BASE_URL: z.string().url('GEOCODING_BASE_URL debe ser una URL valida').default('https://nominatim.openstreetmap.org'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  MFA_ENCRYPTION_KEY: z.string().min(32, 'MFA_ENCRYPTION_KEY debe tener al menos 32 caracteres'),
  INITIAL_ADMIN_USERNAME: z.string().trim().min(3).max(50).default('Afacop'),
  REQUIRE_MFA: z.enum(['true', 'false']).default('false'),
  // Exenciones por cuenta, nunca por rol, para no desactivar MFA a todos los administradores.
  MFA_EXEMPT_USERNAMES: z.string().default(''),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_ISSUER: z.string().default('radar-360-api'),
  JWT_AUDIENCE: z.string().default('radar-360-clients'),
  FRONTEND_URL: corsOrigins.default('http://localhost:5173'),
  CORS_ALLOW_ALL: z.enum(['true', 'false']).default('false'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  MAX_LOGIN_FAILURES: z.coerce.number().int().min(3).max(20).default(5),
  ACCOUNT_LOCK_MINUTES: z.coerce.number().int().min(5).max(1440).default(15),
});

const result = schema.safeParse(process.env);
if (!result.success) {
  const details = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Configuración de entorno inválida: ${details}`);
}
if (result.data.NODE_ENV === 'production' && !process.env.FRONTEND_URL?.trim()) {
  throw new Error('Configuración de entorno inválida: FRONTEND_URL es obligatorio en producción');
}
if (result.data.NODE_ENV === 'production' && result.data.CORS_ALLOW_ALL === 'true') {
  throw new Error('Configuración de entorno inválida: CORS_ALLOW_ALL no puede habilitarse en producción');
}

export const env = Object.freeze(result.data);
export const allowedOrigins = Object.freeze(
  env.FRONTEND_URL.split(',').map(value => value.trim()).filter(Boolean)
);
export const mfaExemptUsernames = Object.freeze(
  [...new Set([
    env.INITIAL_ADMIN_USERNAME,
    ...env.MFA_EXEMPT_USERNAMES.split(','),
  ].map(value => value.trim().toLowerCase()).filter(Boolean))]
);
