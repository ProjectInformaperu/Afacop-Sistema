import { spawnSync } from 'node:child_process';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prismaCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const migrations = [
  '20260710162948_crear_clientes_admisiones',
  '20260710212157_ajustar_columnas_clientes_admisiones',
  '20260715173139_adicionar_asesores_rutas_y_visitas',
  '20260716152749_agregar_coordenadas_cliente',
  '20260722201908_add_usuarios_table',
  '20260723180244_add_distrito_to_asesores',
  '20260724211516_add_coordenadas_asesores',
  '20260724231422_add_coordenadas_index',
  '20260806190000_add_mfa_and_security_audit',
  '20260810120000_add_iso9001_quality_management',
  '20260810180000_add_account_protection',
];

const requiredColumns = {
  clientes: ['id_cliente', 'dni', 'deuda_castigada', 'deuda_vigente', 'otras_deudas', 'latitud', 'longitud'],
  admisiones: ['id_admision', 'id_cliente', 'producto', 'linea_credito', 'estado'],
  asesores: ['id_asesor', 'dni', 'distrito', 'latitud', 'longitud', 'fecha_actualizar'],
  asignaciones_clientes: ['id_asignacion', 'id_cliente', 'id_asesor', 'estado'],
  rutas: ['id_ruta', 'id_asesor', 'fecha_programada', 'estado'],
  rutas_clientes: ['id_ruta_cliente', 'id_ruta', 'id_cliente', 'estado_visita'],
  visitas: ['id_visita', 'id_cliente', 'id_asesor', 'resultado'],
  usuarios: ['id_usuario', 'username', 'password_hash', 'mfa_habilitado', 'mfa_secreto', 'token_version', 'intentos_fallidos', 'bloqueado_hasta', 'ultimo_acceso', 'password_cambio'],
  auditoria_seguridad: ['id_auditoria', 'fecha', 'ruta', 'estado_http'],
  importaciones_masivas: ['id_importacion', 'tipo', 'estado', 'ruta_temporal'],
  registros_calidad: ['id_registro', 'tipo', 'codigo', 'estado', 'version'],
  historial_calidad: ['id_historial', 'id_registro', 'accion', 'version'],
};

const requiredIndexes = [
  'clientes_latitud_longitud_idx',
  'admisiones_id_cliente_key',
  'auditoria_seguridad_fecha_idx',
  'importaciones_masivas_estado_fecha_creacion_idx',
  'registros_calidad_tipo_estado_idx',
  'usuarios_bloqueado_hasta_idx',
];

function runPrisma(args) {
  const result = spawnSync(prismaCommand, ['prisma', ...args], { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Prisma finalizo con codigo ${result.status}`);
}

async function inspectDatabase() {
  const history = await pool.query("SELECT to_regclass('public._prisma_migrations') AS table_name");
  if (history.rows[0]?.table_name) {
    const applied = await pool.query('SELECT COUNT(*)::int AS total FROM "_prisma_migrations"');
    if (applied.rows[0].total > 0) return { mode: 'managed' };
  }

  const tablesResult = await pool.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
  `);
  if (tablesResult.rowCount === 0) return { mode: 'empty' };

  const actual = new Map();
  for (const row of tablesResult.rows) {
    if (!actual.has(row.table_name)) actual.set(row.table_name, new Set());
    actual.get(row.table_name).add(row.column_name);
  }

  const missing = [];
  for (const [table, columns] of Object.entries(requiredColumns)) {
    if (!actual.has(table)) {
      missing.push(`tabla ${table}`);
      continue;
    }
    for (const column of columns) {
      if (!actual.get(table).has(column)) missing.push(`columna ${table}.${column}`);
    }
  }

  const indexesResult = await pool.query("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'");
  const indexes = new Set(indexesResult.rows.map(row => row.indexname));
  for (const index of requiredIndexes) {
    if (!indexes.has(index)) missing.push(`indice ${index}`);
  }

  return { mode: missing.length === 0 ? 'baseline' : 'incompatible', missing };
}

try {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio');
  const inspection = await inspectDatabase();

  if (inspection.mode === 'incompatible') {
    throw new Error(`La base existente no coincide con el esquema esperado. Faltan: ${inspection.missing.join(', ')}`);
  }

  if (inspection.mode === 'baseline') {
    process.stdout.write('Base existente compatible detectada. Registrando baseline de Prisma sin modificar datos.\n');
    for (const migration of migrations) runPrisma(['migrate', 'resolve', '--applied', migration]);
  }

  runPrisma(['migrate', 'deploy']);
} finally {
  await pool.end();
}
