import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loginBody, routeBody, routeStatusBody, routeClientStatusBody, userCreateBody } from '../src/validation/schemas.js';
import { normalizeRole, ROLES } from '../src/security/roles.js';

test('normaliza roles heredados sin confiar en el frontend', () => {
  assert.equal(normalizeRole('ADMIN'), ROLES.ADMINISTRADOR);
  assert.equal(normalizeRole('WORKER'), ROLES.ASESOR);
});

test('rechaza campos inesperados y credenciales vacías', () => {
  assert.equal(loginBody.safeParse({ username: '', password: '' }).success, false);
  assert.equal(loginBody.safeParse({ username: 'admin', password: 'secret', injected: true }).success, false);
});

test('exige contraseñas robustas al crear usuarios', () => {
  assert.equal(userCreateBody.safeParse({ username: 'demo', password: '123456', rol: 'ASESOR' }).success, false);
  assert.equal(userCreateBody.safeParse({ username: 'demo', password: 'UnaClaveSegura2026!', rol: 'ASESOR' }).success, true);
});

test('valida estructura y límites de rutas', () => {
  assert.equal(routeBody.safeParse({ id_asesor: 1, fecha_programada: '2026-08-06', cliente_ids: [1, 2] }).success, true);
  assert.equal(routeBody.safeParse({ id_asesor: -1, fecha_programada: 'x', cliente_ids: [] }).success, false);
});

test('restringe los estados operativos de rutas y visitas', () => {
  assert.equal(routeStatusBody.safeParse({ estado: 'EN_PROCESO' }).success, true);
  assert.equal(routeStatusBody.safeParse({ estado: 'FINALIZADA' }).success, true);
  assert.equal(routeStatusBody.safeParse({ estado: 'ACTIVA' }).success, false);
  assert.equal(routeClientStatusBody.safeParse({ estado_visita: 'VISITADO' }).success, true);
  assert.equal(routeClientStatusBody.safeParse({ estado_visita: 'INVENTADO' }).success, false);
});

test('todas las familias de rutas privadas declaran authMiddleware', () => {
  const root = path.resolve('src/routes');
  const privateRoutes = ['clientes.routes.js', 'admision.routes.js', 'asesores.routes.js', 'asignaciones.routes.js', 'dashboard.routes.js', 'rutas.routes.js', 'usuarios.routes.js', 'visitas.routes.js', 'calidad.routes.js'];
  for (const file of privateRoutes) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(source, /authMiddleware/, `${file} debe exigir autenticación`);
  }
});

test('el SGC ISO 9001 mantiene tipos controlados, historial y segregación de funciones', () => {
  const service = fs.readFileSync(path.resolve('src/services/calidad.service.js'), 'utf8');
  const routes = fs.readFileSync(path.resolve('src/routes/calidad.routes.js'), 'utf8');
  const schema = fs.readFileSync(path.resolve('prisma/schema.prisma'), 'utf8');
  assert.match(service, /NO_CONFORMIDAD/);
  assert.match(service, /ACCION_CORRECTIVA/);
  assert.match(service, /AUDITORIA_INTERNA/);
  assert.match(service, /REVISION_DIRECCION/);
  assert.match(routes, /ROLES\.AUDITOR/);
  assert.match(routes, /editors/);
  assert.match(schema, /model HistorialCalidad/);
  assert.match(schema, /version\s+Int/);
});

test('no se aceptan tokens mediante query string', () => {
  const source = fs.readFileSync(path.resolve('src/middlewares/auth.middleware.js'), 'utf8');
  assert.doesNotMatch(source, /req\.query\.token/);
});

test('la carga Excel usa parser mantenido y no la dependencia vulnerable xlsx', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
  assert.equal(packageJson.dependencies.xlsx, undefined);
  assert.ok(packageJson.dependencies.exceljs);
  const source = fs.readFileSync(path.resolve('src/services/importaciones.service.js'), 'utf8');
  assert.match(source, /WorkbookReader/);
  assert.match(source, /BATCH_SIZE = 1_000/);
  assert.match(source, /MAX_ROWS = 200_000/);
  assert.match(source, /validateSignature/);
  assert.match(source, /pendingQueue/);
  assert.match(source, /latitud_longitud/);
  assert.match(source, /ON CONFLICT \("dni"\) DO UPDATE/);
  assert.match(source, /INSERT INTO "asesores"/);
  assert.match(source, /distrito_base/);
  assert.match(source, /pickMatching/);
  assert.match(source, /"distrito" = COALESCE\(EXCLUDED\."distrito"/);
  assert.match(source, /"fecha_actualizar"\)\s*\n\s*SELECT[\s\S]*CURRENT_TIMESTAMP/);
  assert.match(source, /INSERT INTO "admisiones"/);
  assert.match(source, /ON CONFLICT \("id_cliente"\) DO UPDATE/);
});

test('el mapa representa la cartera mediante agrupación por nivel de zoom', () => {
  const source = fs.readFileSync(path.resolve('src/services/clientes.service.js'), 'utf8');
  assert.match(source, /obtenerPuntosMapa/);
  assert.match(source, /gridSize/);
  assert.match(source, /group\.count/);
});

test('los tokens de acceso incluyen control de tipo y versión revocable', () => {
  const auth = fs.readFileSync(path.resolve('src/middlewares/auth.middleware.js'), 'utf8');
  const service = fs.readFileSync(path.resolve('src/services/auth.service.js'), 'utf8');
  assert.match(auth, /decoded\.type !== 'access'/);
  assert.match(auth, /decoded\.ver !== usuario\.token_version/);
  assert.match(service, /mfaRequired/);
});

test('la cartera del asesor se filtra por asignación activa', () => {
  const source = fs.readFileSync(path.resolve('src/services/clientes.service.js'), 'utf8');
  assert.match(source, /asesorId/);
  assert.match(source, /estado: "ACTIVA"/);
});

test('el cifrado autenticado de secretos MFA permite recuperar el valor íntegro', async () => {
  process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test';
  process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-thirty-two-characters';
  process.env.MFA_ENCRYPTION_KEY = 'independent-test-mfa-key-with-at-least-32-characters';
  const { encryptSecret, decryptSecret } = await import('../src/security/crypto.js');
  const encrypted = encryptSecret('BASE32SECRETVALUE');
  assert.notEqual(encrypted, 'BASE32SECRETVALUE');
  assert.equal(decryptSecret(encrypted), 'BASE32SECRETVALUE');
});

test('la configuracion de produccion y las cuentas tienen endurecimiento verificable', () => {
  const envSource = fs.readFileSync(path.resolve('src/config/env.js'), 'utf8');
  const server = fs.readFileSync(path.resolve('src/server.js'), 'utf8');
  const auth = fs.readFileSync(path.resolve('src/services/auth.service.js'), 'utf8');
  const securityRoutes = fs.readFileSync(path.resolve('src/routes/seguridad.routes.js'), 'utf8');
  assert.match(envSource, /CORS_ALLOW_ALL no puede habilitarse en producci/);
  assert.match(envSource, /MAX_LOGIN_FAILURES/);
  assert.match(server, /strictTransportSecurity/);
  assert.match(server, /Cache-Control', 'no-store/);
  assert.match(auth, /bloqueado_hasta/);
  assert.match(auth, /intentos_fallidos/);
  assert.match(securityRoutes, /AUDIT_READERS/);
});
