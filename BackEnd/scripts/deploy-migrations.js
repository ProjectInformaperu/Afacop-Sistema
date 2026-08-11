import { spawnSync } from 'node:child_process';
import pg from 'pg';

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prismaCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const stages = [
  {
    migration: '20260710162948_crear_clientes_admisiones',
    tables: ['clientes', 'admisiones'],
  },
  {
    migration: '20260710212157_ajustar_columnas_clientes_admisiones',
    columns: [['clientes', 'deuda_castigada'], ['clientes', 'deuda_vigente'], ['clientes', 'otras_deudas']],
  },
  {
    migration: '20260715173139_adicionar_asesores_rutas_y_visitas',
    tables: ['asesores', 'asignaciones_clientes', 'rutas', 'rutas_clientes', 'visitas'],
  },
  {
    migration: '20260716152749_agregar_coordenadas_cliente',
    columns: [['clientes', 'latitud'], ['clientes', 'longitud']],
  },
  {
    migration: '20260722201908_add_usuarios_table',
    tables: ['usuarios'],
    columns: [['usuarios', 'id_usuario'], ['usuarios', 'username'], ['usuarios', 'password_hash']],
  },
  {
    migration: '20260723180244_add_distrito_to_asesores',
    columns: [['asesores', 'distrito']],
  },
  {
    migration: '20260724211516_add_coordenadas_asesores',
    columns: [['asesores', 'latitud'], ['asesores', 'longitud']],
  },
  {
    migration: '20260724231422_add_coordenadas_index',
    indexes: ['clientes_latitud_longitud_idx'],
  },
  {
    migration: '20260806190000_add_mfa_and_security_audit',
    tables: ['auditoria_seguridad', 'importaciones_masivas'],
    columns: [['usuarios', 'mfa_habilitado'], ['usuarios', 'mfa_secreto'], ['usuarios', 'token_version']],
    indexes: ['admisiones_id_cliente_key', 'auditoria_seguridad_fecha_idx'],
  },
  {
    migration: '20260810120000_add_iso9001_quality_management',
    tables: ['registros_calidad', 'historial_calidad'],
    indexes: ['registros_calidad_tipo_estado_idx'],
  },
  {
    migration: '20260810180000_add_account_protection',
    columns: [
      ['usuarios', 'intentos_fallidos'], ['usuarios', 'bloqueado_hasta'],
      ['usuarios', 'ultimo_acceso'], ['usuarios', 'password_cambio'],
    ],
    indexes: ['usuarios_bloqueado_hasta_idx'],
  },
  {
    migration: '20260811120000_add_per_user_mfa_requirement',
    columns: [['usuarios', 'mfa_requerido']],
  },
];

function runPrisma(args) {
  const result = spawnSync(prismaCommand, ['prisma', ...args], { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Prisma finalizo con codigo ${result.status}`);
}

async function loadSchemaState() {
  const columnsResult = await pool.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
  `);
  const columns = new Map();
  for (const row of columnsResult.rows) {
    if (!columns.has(row.table_name)) columns.set(row.table_name, new Set());
    columns.get(row.table_name).add(row.column_name);
  }
  const indexesResult = await pool.query("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'");
  return { columns, indexes: new Set(indexesResult.rows.map(row => row.indexname)) };
}

function stageStatus(stage, state) {
  const checks = [
    ...(stage.tables || []).map(table => state.columns.has(table)),
    ...(stage.columns || []).map(([table, column]) => state.columns.get(table)?.has(column) === true),
    ...(stage.indexes || []).map(index => state.indexes.has(index)),
  ];
  return {
    complete: checks.length > 0 && checks.every(Boolean),
    partial: checks.some(Boolean) && !checks.every(Boolean),
  };
}

async function hasMigrationHistory() {
  const result = await pool.query("SELECT to_regclass('public._prisma_migrations') AS table_name");
  if (!result.rows[0]?.table_name) return false;
  const count = await pool.query('SELECT COUNT(*)::int AS total FROM "_prisma_migrations"');
  return count.rows[0].total > 0;
}

try {
  if (!(await hasMigrationHistory())) {
    const state = await loadSchemaState();
    if (state.columns.size > 0) {
      const baseline = [];
      for (const stage of stages) {
        const status = stageStatus(stage, state);
        if (status.complete) {
          baseline.push(stage.migration);
          continue;
        }
        if (status.partial) {
          throw new Error(`La migracion ${stage.migration} esta aplicada parcialmente. Revise la estructura antes de continuar.`);
        }
        break;
      }
      if (baseline.length === 0) {
        throw new Error('La base contiene objetos, pero no coincide con la primera migracion del proyecto.');
      }
      process.stdout.write(`Base existente detectada. Registrando baseline de ${baseline.length} migraciones sin modificar datos.\n`);
      for (const migration of baseline) runPrisma(['migrate', 'resolve', '--applied', migration]);
    }
  }

  runPrisma(['migrate', 'deploy']);
} finally {
  await pool.end();
}
