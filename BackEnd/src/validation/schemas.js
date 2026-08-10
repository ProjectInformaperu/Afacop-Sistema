import { z } from 'zod';

const cleanString = max => z.string().trim().min(1).max(max);
export const idParams = z.object({ id: z.coerce.number().int().positive() }).strict();
export const routeClientParams = z.object({
  id: z.coerce.number().int().positive(),
  clienteId: z.coerce.number().int().positive(),
}).strict();
export const routeStatusBody = z.object({
  estado: z.enum(['EN_PROCESO', 'FINALIZADA', 'CANCELADA']),
}).strict();
export const routeClientStatusBody = z.object({
  estado_visita: z.enum(['PENDIENTE', 'VISITADO', 'NO_ENCONTRADO', 'REPROGRAMADO']),
}).strict();
export const uuidParams = z.object({ id: z.string().uuid() }).strict();
export const loginBody = z.object({ username: cleanString(50), password: z.string().min(1).max(128) }).strict();
export const mfaVerifyBody = z.object({ challengeToken: z.string().min(20).max(4096), code: z.string().regex(/^\d{6}$/) }).strict();
export const mfaChallengeBody = z.object({ challengeToken: z.string().min(20).max(4096) }).strict();
export const mfaCodeBody = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();
export const passwordBody = z.object({ password: z.string().min(1).max(128) }).strict();
export const listQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  search: z.string().trim().max(150).optional(), estado: z.string().trim().max(30).optional(),
  distrito: z.string().trim().max(100).optional(),
  fecha_pago: z.union([z.iso.date(), z.literal('')]).transform(value => value || undefined).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(), lng: z.coerce.number().min(-180).max(180).optional(),
  radio: z.coerce.number().positive().max(1000).optional(), offset: z.coerce.number().int().min(0).optional(),
}).strict();
export const mapQuery = z.object({
  estado: z.string().trim().max(30).optional(), fecha_pago: z.iso.date().optional(),
  zoom: z.coerce.number().int().min(1).max(18).default(6),
  west: z.coerce.number().min(-180).max(180).optional(), east: z.coerce.number().min(-180).max(180).optional(),
  south: z.coerce.number().min(-90).max(90).optional(), north: z.coerce.number().min(-90).max(90).optional(),
}).strict().refine(data => [data.west, data.east, data.south, data.north].every(value => value === undefined) || [data.west, data.east, data.south, data.north].every(value => value !== undefined), 'Debe enviar todos los límites del mapa');
export const routeBody = z.object({
  id_asesor: z.coerce.number().int().positive(), fecha_programada: z.iso.date(),
  cliente_ids: z.array(z.coerce.number().int().positive()).min(1).max(500),
}).strict();
export const osrmBody = z.object({ coordinates: z.array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])).min(2).max(500) }).strict();
export const reverseGeocodeBody = z.object({
  latitud: z.coerce.number().min(-90).max(90),
  longitud: z.coerce.number().min(-180).max(180),
}).strict().or(z.object({ url: z.string().url().max(2048) }).strict());
export const userCreateBody = z.object({
  username: cleanString(50).regex(/^[A-Za-z0-9._-]+$/, 'El usuario contiene caracteres no permitidos'),
  password: z.string().min(12, 'La contraseña debe tener al menos 12 caracteres').max(128, 'La contraseña no puede superar 128 caracteres'), rol: cleanString(30).regex(/^[A-Z0-9_]+$/, 'El rol no es válido'),
  estado: z.enum(['ACTIVO', 'INACTIVO']).optional(), nombres: z.string().max(150).optional(),
  apellidos: z.string().max(200).optional(), email: z.string().email().max(150).optional().or(z.literal('')),
  sede: z.string().max(100).optional(), mfa_habilitado: z.boolean().optional(),
}).strict();
export const userUpdateBody = userCreateBody.partial().refine(data => Object.keys(data).length > 0, 'Debe enviar al menos un campo');
