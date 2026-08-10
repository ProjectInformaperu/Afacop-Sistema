import fs from 'node:fs/promises';
import ExcelJS from 'exceljs';
import prisma from '../config/prisma.js';
import { logger } from '../config/logger.js';

const activeJobs = new Set();
const pendingQueue = [];
let workerRunning = false;
const MAX_ROWS = 200_000;
const BATCH_SIZE = 1_000;
const MAX_ERRORS = 100;

const normalizeHeader = value => String(value ?? '').trim().toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

function plainValue(value) {
  if (value == null) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if ('result' in value) return plainValue(value.result);
    if (Array.isArray(value.richText)) return value.richText.map(item => item.text).join('');
    if ('text' in value) return value.text;
  }
  return value;
}

const text = (value, max = 255) => String(plainValue(value) ?? '').trim().slice(0, max);
const money = value => {
  const parsed = Number(String(plainValue(value) ?? 0).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};
const numberOrNull = value => {
  const normalized = String(plainValue(value) ?? '').trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

function coordinates(row) {
  let latitud = numberOrNull(pick(row, ['latitud', 'lat', 'latitude']));
  let longitud = numberOrNull(pick(row, ['longitud', 'lng', 'long', 'lon', 'longitude']));
  if (latitud === null || longitud === null) {
    const combined = text(pick(row, ['latitud_longitud', 'coordenadas', 'coordenada', 'ubicacion', 'location']), 200);
    const match = combined.match(/(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)/);
    if (match) {
      latitud = Number(match[1].replace(',', '.'));
      longitud = Number(match[2].replace(',', '.'));
    }
  }
  if (latitud !== null && longitud !== null && Math.abs(latitud) > 90 && Math.abs(longitud) <= 90) [latitud, longitud] = [longitud, latitud];
  if (latitud === null || longitud === null || Math.abs(latitud) > 90 || Math.abs(longitud) > 180) return { latitud: null, longitud: null };
  return { latitud, longitud };
}

function dateOrNull(value) {
  const raw = plainValue(value);
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function admissionRecord(row) {
  const importedProduct = text(pick(row, [
    'producto', 'tipo_producto', 'producto_crediticio', 'tipo_credito', 'tipo_de_credito', 'credito',
  ]), 150) || null;
  const dni = text(pick(row, ['dni', 'documento', 'doc_identidad', 'num_doc']), 20);
  const sampleProducts = ['Pr\u00e9stamo Vehicular', 'Pr\u00e9stamo MYPE', 'Pr\u00e9stamo Personal'];
  const sampleIndex = [...dni].reduce((total, char) => total + char.charCodeAt(0), 0) % sampleProducts.length;
  const producto = importedProduct || sampleProducts[sampleIndex];
  const rawLine = pick(row, [
    'linea_credito', 'linea_de_credito', 'linea', 'monto_linea', 'monto_aprobado', 'linea_aprobada',
  ]);
  const importedState = text(pick(row, [
    'estado_admision', 'estado_evaluacion', 'resultado', 'condicion', 'condicion_crediticia', 'calificacion',
  ]), 30).toUpperCase();
  const hasRealEvaluation = Boolean(importedProduct || (rawLine !== '' && rawLine != null) || importedState);
  const sampleApproved = sampleIndex % 2 === 0;
  const lineaCredito = hasRealEvaluation
    ? (rawLine === '' || rawLine == null ? null : money(rawLine))
    : (sampleApproved ? 2500 : 0);
  const estado = hasRealEvaluation ? (importedState || 'PENDIENTE') : (sampleApproved ? 'APTO' : 'NO APTO');
  const fecha = dateOrNull(pick(row, [
    'fecha_admision', 'fecha_evaluacion', 'fecha_consulta', 'fecha', 'fecha_gestion', 'ultima_gestion',
  ]));
  return { producto, linea_credito: lineaCredito, estado, fecha };
}

function pick(row, aliases) {
  for (const alias of aliases) if (row[alias] !== undefined && row[alias] !== '') return row[alias];
  return '';
}

function pickMatching(row, aliases, patterns = []) {
  const exact = pick(row, aliases);
  if (exact !== '') return exact;
  const matchedKey = Object.keys(row).find(key => patterns.some(pattern => pattern.test(key)));
  return matchedKey ? row[matchedKey] : '';
}

function clientRecord(row) {
  const dni = text(pick(row, ['dni', 'documento', 'doc_identidad', 'num_doc']), 20);
  let nombres = text(pick(row, ['nombres', 'nombre', 'nombre_completo', 'cliente']), 150);
  let apellidoPaterno = text(pick(row, ['apellido_paterno', 'ape_paterno', 'paterno']), 100);
  let apellidoMaterno = text(pick(row, ['apellido_materno', 'ape_materno', 'materno']), 100);
  if (!apellidoPaterno && nombres.includes(',')) {
    const [apellidos, ...rest] = nombres.split(',');
    const parts = apellidos.trim().split(/\s+/);
    apellidoPaterno = parts.shift() || '';
    apellidoMaterno = parts.join(' ');
    nombres = rest.join(',').trim();
  }
  if (!dni || !nombres) return null;
  const coords = coordinates(row);
  return {
    dni, nombres, apellido_paterno: apellidoPaterno, apellido_materno: apellidoMaterno,
    telefono: text(pick(row, ['telefono', 'celular']), 20) || null,
    direccion: text(pick(row, ['direccion', 'domicilio']), 255) || null,
    distrito: text(pick(row, ['distrito', 'dist_domi']), 100) || null,
    estado: text(pick(row, ['estado']), 20) || 'ACTIVO',
    deuda_castigada: money(pick(row, ['deuda_castigada', 'castigada'])),
    deuda_vigente: money(pick(row, ['deuda_vigente', 'deuda_vigentes', 'vigente'])),
    otras_deudas: money(pick(row, ['otras_deudas', 'otra_deuda'])),
    ultima_gestion: dateOrNull(pick(row, ['ultima_gestion', 'fecha_gestion', 'fec_gestion', 'fecha_pago'])),
    latitud: coords.latitud,
    longitud: coords.longitud,
    _admision: admissionRecord(row),
  };
}

function advisorRecord(row) {
  const dni = text(pick(row, ['dni', 'documento', 'doc_identidad', 'num_doc', 'numero_documento']), 20);
  const nombres = text(pick(row, ['nombres', 'nombre', 'nombre_completo', 'asesor', 'colaborador']), 150);
  if (!dni || !nombres) return null;
  const coords = coordinates(row);
  return {
    dni, nombres,
    apellido_paterno: text(pick(row, ['apellido_paterno', 'ape_paterno', 'paterno']), 100),
    apellido_materno: text(pick(row, ['apellido_materno', 'ape_materno', 'materno']), 100),
    telefono: text(pick(row, ['telefono', 'celular']), 20) || null,
    correo: text(pick(row, ['correo', 'email']), 150) || null,
    distrito: text(pickMatching(row, [
      'distrito', 'distrito_base', 'distritobase', 'dist', 'dist_base',
      'distrito_de_base', 'distrito_domicilio', 'distrito_domiciliario', 'dist_domi',
    ], [/distrito/, /^dist(?:_|$)/]), 100) || null,
    estado: text(pick(row, ['estado']), 20) || 'ACTIVO',
    latitud: coords.latitud,
    longitud: coords.longitud,
  };
}

async function validateSignature(filePath) {
  const handle = await fs.open(filePath, 'r');
  try {
    const bytes = Buffer.alloc(4); await handle.read(bytes, 0, 4, 0);
    if (!bytes.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
      throw Object.assign(new Error('El archivo no es un XLSX válido'), { statusCode: 400, code: 'INVALID_XLSX_SIGNATURE' });
    }
  } finally { await handle.close(); }
}

export async function createJob({ type, file, actorId }) {
  await validateSignature(file.path);
  const job = await prisma.importacionMasiva.create({ data: {
    tipo: type, archivo: file.originalname.slice(0, 255), ruta_temporal: file.path, actor_id: actorId,
  } });
  enqueue(job.id_importacion);
  return job;
}

export async function getJob(id) {
  return prisma.importacionMasiva.findUnique({ where: { id_importacion: id }, select: {
    id_importacion: true, tipo: true, estado: true, archivo: true, total_filas: true,
    procesadas: true, insertadas: true, actualizadas: true, omitidas: true, errores: true, detalle_error: true,
    fecha_creacion: true, fecha_inicio: true, fecha_fin: true,
  } });
}

export function enqueue(id) {
  if (activeJobs.has(id)) return;
  activeJobs.add(id);
  pendingQueue.push(id);
  setImmediate(drainQueue);
}

async function drainQueue() {
  if (workerRunning) return;
  workerRunning = true;
  try {
    while (pendingQueue.length) {
      const id = pendingQueue.shift();
      await processJob(id).catch(error => logger.error({ err: error, importId: id }, 'bulk_import_failed'));
    }
  } finally { workerRunning = false; }
}

async function processJob(id) {
  let job;
  try {
    job = await prisma.importacionMasiva.update({ where: { id_importacion: id }, data: { estado: 'PROCESANDO', fecha_inicio: new Date() } });
    const workbook = new ExcelJS.stream.xlsx.WorkbookReader(job.ruta_temporal, {
      sharedStrings: 'cache', hyperlinks: 'ignore', styles: 'ignore', worksheets: 'emit',
    });
    let headers = null; let processed = 0; let inserted = 0; let updated = 0; let omitted = 0; let errors = 0; const details = []; let batch = [];
    const flush = async () => {
      if (!batch.length) return;
      if (job.tipo === 'CLIENTES') {
        const originalSize = batch.length;
        batch = [...new Map(batch.map(item => [item.dni, item])).values()];
        omitted += originalSize - batch.length;
        const existing = await prisma.cliente.count({ where: { dni: { in: batch.map(item => item.dni) } } });
        const affected = await prisma.$executeRaw`
          INSERT INTO "clientes" ("dni", "nombres", "apellido_paterno", "apellido_materno", "telefono", "direccion", "distrito", "estado", "deuda_castigada", "deuda_vigente", "otras_deudas", "ultima_gestion", "latitud", "longitud")
          SELECT x.dni, x.nombres, x.apellido_paterno, x.apellido_materno, x.telefono, x.direccion, x.distrito, x.estado,
                 x.deuda_castigada, x.deuda_vigente, x.otras_deudas, x.ultima_gestion, x.latitud, x.longitud
          FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) AS x(
            dni text, nombres text, apellido_paterno text, apellido_materno text, telefono text, direccion text,
            distrito text, estado text, deuda_castigada numeric, deuda_vigente numeric, otras_deudas numeric,
            ultima_gestion timestamp, latitud numeric, longitud numeric
          )
          ON CONFLICT ("dni") DO UPDATE SET
            "nombres" = EXCLUDED."nombres", "apellido_paterno" = EXCLUDED."apellido_paterno",
            "apellido_materno" = EXCLUDED."apellido_materno", "telefono" = EXCLUDED."telefono",
            "direccion" = EXCLUDED."direccion", "distrito" = EXCLUDED."distrito", "estado" = EXCLUDED."estado",
            "deuda_castigada" = EXCLUDED."deuda_castigada", "deuda_vigente" = EXCLUDED."deuda_vigente",
            "otras_deudas" = EXCLUDED."otras_deudas", "ultima_gestion" = EXCLUDED."ultima_gestion",
            "latitud" = EXCLUDED."latitud", "longitud" = EXCLUDED."longitud"
        `;
        updated += existing;
        inserted += Number(affected) - existing;
        const admissions = batch.map(item => ({ dni: item.dni, ...item._admision }));
        await prisma.$executeRaw`
          INSERT INTO "admisiones" ("id_cliente", "producto", "linea_credito", "estado", "fecha")
          SELECT c."id_cliente", x.producto, x.linea_credito, x.estado, x.fecha
          FROM jsonb_to_recordset(${JSON.stringify(admissions)}::jsonb) AS x(
            dni text, producto text, linea_credito numeric, estado text, fecha timestamp
          )
          INNER JOIN "clientes" c ON c."dni" = x.dni
          ON CONFLICT ("id_cliente") DO UPDATE SET
            "producto" = EXCLUDED."producto", "linea_credito" = EXCLUDED."linea_credito",
            "estado" = EXCLUDED."estado", "fecha" = EXCLUDED."fecha"
        `;
      } else {
        const originalSize = batch.length;
        batch = [...new Map(batch.map(item => [item.dni, item])).values()];
        omitted += originalSize - batch.length;
        const existing = await prisma.asesor.count({ where: { dni: { in: batch.map(item => item.dni) } } });
        const affected = await prisma.$executeRaw`
          INSERT INTO "asesores" ("dni", "nombres", "apellido_paterno", "apellido_materno", "telefono", "correo", "distrito", "estado", "latitud", "longitud", "fecha_actualizar")
          SELECT x.dni, x.nombres, x.apellido_paterno, x.apellido_materno, x.telefono, x.correo,
                 x.distrito, x.estado, x.latitud, x.longitud, CURRENT_TIMESTAMP
          FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) AS x(
            dni text, nombres text, apellido_paterno text, apellido_materno text, telefono text,
            correo text, distrito text, estado text, latitud numeric, longitud numeric
          )
          ON CONFLICT ("dni") DO UPDATE SET
            "nombres" = EXCLUDED."nombres", "apellido_paterno" = EXCLUDED."apellido_paterno",
            "apellido_materno" = EXCLUDED."apellido_materno", "telefono" = EXCLUDED."telefono",
            "correo" = EXCLUDED."correo", "distrito" = COALESCE(EXCLUDED."distrito", "asesores"."distrito"),
            "estado" = EXCLUDED."estado", "latitud" = EXCLUDED."latitud",
            "longitud" = EXCLUDED."longitud", "fecha_actualizar" = CURRENT_TIMESTAMP
        `;
        updated += existing;
        inserted += Number(affected) - existing;
      }
      batch = [];
      await prisma.importacionMasiva.update({ where: { id_importacion: id }, data: { procesadas: processed, insertadas: inserted, actualizadas: updated, omitidas: omitted, errores: errors } });
    };
    for await (const worksheet of workbook) {
      for await (const excelRow of worksheet) {
        const values = Array.from({ length: excelRow.cellCount }, (_, index) => plainValue(excelRow.getCell(index + 1).value));
        if (!headers) {
          if (values.length > 100) throw Object.assign(new Error('El archivo supera el máximo de 100 columnas'), { code: 'COLUMN_LIMIT_EXCEEDED' });
          headers = values.map(normalizeHeader);
          const hasDni = headers.some(header => ['dni', 'documento', 'doc_identidad', 'num_doc'].includes(header));
          const hasName = headers.some(header => ['nombres', 'nombre', 'nombre_completo', 'cliente'].includes(header));
          if (!hasDni || !hasName) throw Object.assign(new Error('La cabecera debe incluir DNI/documento y nombres'), { code: 'INVALID_HEADERS' });
          continue;
        }
        if (values.every(value => text(value) === '')) continue;
        processed++;
        if (processed > MAX_ROWS) throw Object.assign(new Error(`El archivo supera el máximo de ${MAX_ROWS} filas`), { code: 'ROW_LIMIT_EXCEEDED' });
        const row = Object.fromEntries(headers.map((header, index) => [header, values[index]]));
        const record = job.tipo === 'CLIENTES' ? clientRecord(row) : advisorRecord(row);
        if (!record) { errors++; if (details.length < MAX_ERRORS) details.push({ fila: excelRow.number, error: 'DNI y nombres son obligatorios' }); }
        else batch.push(record);
        if (batch.length >= BATCH_SIZE) await flush();
      }
      break;
    }
    await flush();
    await prisma.importacionMasiva.update({ where: { id_importacion: id }, data: {
      estado: 'COMPLETADA', total_filas: processed, procesadas: processed, insertadas: inserted,
      actualizadas: updated, omitidas: omitted, errores: errors, detalle_error: details, fecha_fin: new Date(),
    } });
  } catch (error) {
    await prisma.importacionMasiva.update({ where: { id_importacion: id }, data: {
      estado: 'FALLIDA', detalle_error: [{ error: error.code || 'IMPORT_FAILED', mensaje: String(error.message).slice(0, 300) }], fecha_fin: new Date(),
    } }).catch(() => {});
    throw error;
  } finally {
    activeJobs.delete(id);
    if (job?.ruta_temporal) await fs.rm(job.ruta_temporal, { force: true }).catch(() => {});
  }
}

export async function resumePendingJobs() {
  const jobs = await prisma.importacionMasiva.findMany({ where: { estado: { in: ['PENDIENTE', 'PROCESANDO'] } }, select: { id_importacion: true } });
  jobs.forEach(job => enqueue(job.id_importacion));
}
