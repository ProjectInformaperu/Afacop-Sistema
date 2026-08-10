import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import pinoHttp from 'pino-http';
import jwt from 'jsonwebtoken';
import { Server as SocketServer } from 'socket.io';
import { env, allowedOrigins } from './config/env.js';
import { logger } from './config/logger.js';
import prisma from './config/prisma.js';
import { auditMiddleware } from './middlewares/audit.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { roleMiddleware } from './middlewares/role.middleware.js';
import { OPERATIONAL_MANAGERS, normalizeRole } from './security/roles.js';

import clientesRoutes from './routes/clientes.routes.js';
import admisionRoutes from './routes/admision.routes.js';
import asesoresRoutes from './routes/asesores.routes.js';
import asignacionesRoutes from './routes/asignaciones.routes.js';
import asignacionesController from './controllers/asignaciones.controller.js';
import rutasRoutes from './routes/rutas.routes.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import visitasRoutes from './routes/visitas.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import importacionesRoutes from './routes/importaciones.routes.js';
import calidadRoutes from './routes/calidad.routes.js';
import seguridadRoutes from './routes/seguridad.routes.js';
import { resumePendingJobs } from './services/importaciones.service.js';

const app = express();
app.disable('x-powered-by');
if (env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

app.use((req, res, next) => {
  req.id = req.get('x-request-id')?.slice(0, 100) || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});
app.use(pinoHttp({ logger, genReqId: req => req.id, autoLogging: { ignore: req => req.url === '/health/live' } }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  strictTransportSecurity: env.NODE_ENV === 'production' ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
}));
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Pragma', 'no-cache'); next(); });
// Chrome/Edge aplican Private Network Access cuando un frontend HTTPS de
// Dev Tunnels accede al backend local. Se habilita exclusivamente en desarrollo.
app.use((req, res, next) => {
  if (
    env.NODE_ENV === 'development'
    && env.CORS_ALLOW_ALL === 'true'
    && req.get('access-control-request-private-network') === 'true'
  ) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (env.CORS_ALLOW_ALL === 'true') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    const error = new Error('Origen no permitido'); error.statusCode = 403; error.code = 'CORS_DENIED';
    callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Request-Id', 'x-sede-id'],
  exposedHeaders: ['X-Request-Id'], maxAge: 600,
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'development' ? 5000 : 1200,
  standardHeaders: 'draft-8', legacyHeaders: false,
  // Autenticación tiene su propio limitador. No debe quedar bloqueada por la
  // navegación, sincronización o consultas normales realizadas antes del logout.
  skip: req => req.path.startsWith('/api/auth/') || req.path.startsWith('/health/'),
  message: { error: 'Demasiadas solicitudes. Intente nuevamente más tarde.', code: 'RATE_LIMITED' },
});
const createAuthLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'development' ? 50 : 10,
  standardHeaders: 'draft-8', legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res, _next, options) => {
    const resetTime = req.rateLimit?.resetTime?.getTime?.();
    const retryAfterSeconds = Math.max(1, Math.ceil(((resetTime || Date.now() + options.windowMs) - Date.now()) / 1000));
    res.status(options.statusCode).json({
      error: 'Se alcanzó el límite de intentos de acceso.',
      code: 'LOGIN_RATE_LIMITED',
      retryAfterSeconds,
    });
  },
});
app.use(globalLimiter);
app.use('/api/auth/login', createAuthLimiter());
app.use('/api/auth/mfa/verify', createAuthLimiter());
app.use('/api/auth/mfa/enroll', createAuthLimiter());
app.use(express.json({ limit: '1mb', strict: true }));
app.use((req, res, next) => {
  const sendJson = res.json.bind(res);
  res.json = payload => {
    if (res.statusCode >= 500 && payload && typeof payload === 'object') {
      return sendJson({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        requestId: req.id,
      });
    }
    return sendJson(payload);
  };
  next();
});
app.use(auditMiddleware);

app.get('/', (_req, res) => res.json({ service: 'radar-360-backend', status: 'ok' }));
app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
app.get('/health/ready', async (req, res, next) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ready' }); } catch (error) { error.statusCode = 503; next(error); }
});

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.get('/api/clientes/:id/historial-asignaciones', authMiddleware, roleMiddleware(OPERATIONAL_MANAGERS), asignacionesController.obtenerHistorialAsignacionesDeCliente);
app.use('/api/admision', admisionRoutes);
app.use('/api/asesores', asesoresRoutes);
app.use('/api/asignaciones', asignacionesRoutes);
app.use('/api/rutas', rutasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/visitas', visitasRoutes);
app.use('/api/reportes', visitasRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/importaciones', importacionesRoutes);
app.use('/api/calidad', calidadRoutes);
app.use('/api/seguridad', seguridadRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  if (env.NODE_ENV === 'development') process.stdout.write(`http://localhost:${env.PORT}\n`);
  else logger.info({ port: env.PORT }, 'server_started');
});
const io = new SocketServer(server, {
  cors: { origin: env.CORS_ALLOW_ALL === 'true' ? true : allowedOrigins, credentials: true, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 100_000,
  pingInterval: 25_000,
  pingTimeout: 20_000,
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== 'string') return next(new Error('AUTH_REQUIRED'));
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'], issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE,
    });
    if (decoded.type !== 'access') return next(new Error('INVALID_TOKEN'));
    const usuario = await prisma.usuario.findUnique({ where: { id_usuario: decoded.sub } });
    if (!usuario || usuario.estado !== 'ACTIVO' || usuario.username !== decoded.username || usuario.token_version !== decoded.ver) {
      return next(new Error('INVALID_SESSION'));
    }
    socket.user = { id: usuario.id_usuario, username: usuario.username, rol: normalizeRole(usuario.rol), id_asesor: usuario.id_asesor };
    next();
  } catch { next(new Error('INVALID_TOKEN')); }
});

io.on('connection', socket => {
  socket.join(`role:${socket.user.rol}`);
  if (socket.user.id_asesor) socket.join(`advisor:${socket.user.id_asesor}`);
  logger.info({ event: 'socket_connected', userId: socket.user.id, role: socket.user.rol, socketId: socket.id }, 'realtime_session_started');
  socket.on('disconnect', reason => logger.info({ event: 'socket_disconnected', userId: socket.user.id, socketId: socket.id, reason }, 'realtime_session_finished'));
});
resumePendingJobs().catch(error => logger.error({ err: error }, 'bulk_import_resume_failed'));
server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.keepAliveTimeout = 5_000;

async function shutdown(signal) {
  logger.info({ signal }, 'graceful_shutdown_started');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('graceful_shutdown_completed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

export { app, server, io };
