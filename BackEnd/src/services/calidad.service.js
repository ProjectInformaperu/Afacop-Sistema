import prisma from '../config/prisma.js';

export const QUALITY_TYPES = Object.freeze([
  'CONTEXTO', 'PARTE_INTERESADA', 'PROCESO', 'OBJETIVO', 'RIESGO_OPORTUNIDAD',
  'DOCUMENTO', 'NO_CONFORMIDAD', 'ACCION_CORRECTIVA', 'SATISFACCION', 'PROVEEDOR',
  'COMPETENCIA', 'AUDITORIA_INTERNA', 'REVISION_DIRECCION', 'CAMBIO', 'INDICADOR',
]);
const STATES = Object.freeze(['BORRADOR', 'VIGENTE', 'EN_PROCESO', 'EN_REVISION', 'CERRADO', 'CANCELADO']);
const REQUIRED_TYPES = Object.freeze(['CONTEXTO','PARTE_INTERESADA','PROCESO','OBJETIVO','RIESGO_OPORTUNIDAD','DOCUMENTO','NO_CONFORMIDAD','ACCION_CORRECTIVA','SATISFACCION','PROVEEDOR','COMPETENCIA','AUDITORIA_INTERNA','REVISION_DIRECCION','INDICADOR']);

function bad(message, code='QUALITY_VALIDATION_ERROR') { const error=new Error(message); error.statusCode=400; error.code=code; return error; }
function normalize(body, partial=false) {
  const result={};
  if (!partial || body.tipo!==undefined) { if(!QUALITY_TYPES.includes(body.tipo)) throw bad('Tipo de registro de calidad no válido'); result.tipo=body.tipo; }
  if (!partial || body.codigo!==undefined) { const value=String(body.codigo||'').trim().toUpperCase(); if(!/^[A-Z0-9_-]{3,40}$/.test(value)) throw bad('Código inválido'); result.codigo=value; }
  if (!partial || body.titulo!==undefined) { const value=String(body.titulo||'').trim(); if(value.length<3||value.length>200) throw bad('Título inválido'); result.titulo=value; }
  for (const key of ['descripcion','responsable','clausula_iso','indicador','unidad']) if(body[key]!==undefined) result[key]=body[key]===null?null:String(body[key]).trim();
  if(body.estado!==undefined){if(!STATES.includes(body.estado))throw bad('Estado no válido');result.estado=body.estado;}
  for(const key of ['responsable_id']) if(body[key]!==undefined) result[key]=body[key]||null;
  for(const key of ['fecha_objetivo','fecha_cierre']) if(body[key]!==undefined) result[key]=body[key]?new Date(body[key]):null;
  for(const key of ['meta','valor_actual']) if(body[key]!==undefined) result[key]=body[key]===null||body[key]===''?null:Number(body[key]);
  for(const key of ['datos','evidencia']) if(body[key]!==undefined) result[key]=body[key]||null;
  return result;
}

async function listar(query={}) {
  const where={}; if(query.tipo)where.tipo=query.tipo; if(query.estado)where.estado=query.estado;
  if(query.buscar)where.OR=[{codigo:{contains:query.buscar,mode:'insensitive'}},{titulo:{contains:query.buscar,mode:'insensitive'}},{responsable:{contains:query.buscar,mode:'insensitive'}}];
  return prisma.registroCalidad.findMany({where,orderBy:[{fecha_objetivo:'asc'},{fecha_actualizar:'desc'}],include:{historial:{orderBy:{fecha:'desc'},take:5}}});
}
async function obtener(id){const item=await prisma.registroCalidad.findUnique({where:{id_registro:id},include:{historial:{orderBy:{fecha:'desc'}}}});if(!item){const e=new Error('Registro de calidad no encontrado');e.statusCode=404;throw e;}return item;}
async function crear(body,user){const data=normalize(body);return prisma.$transaction(async tx=>{const item=await tx.registroCalidad.create({data:{...data,creado_por:user.id,actualizado_por:user.id}});await tx.historialCalidad.create({data:{id_registro:item.id_registro,accion:'CREADO',version:1,actor_id:user.id,actor:user.username,detalle:{estado:item.estado,tipo:item.tipo}}});return item;});}
async function actualizar(id,body,user){const current=await obtener(id);const data=normalize(body,true);const version=current.version+1;return prisma.$transaction(async tx=>{const item=await tx.registroCalidad.update({where:{id_registro:id},data:{...data,version,actualizado_por:user.id}});await tx.historialCalidad.create({data:{id_registro:id,accion:'ACTUALIZADO',version,actor_id:user.id,actor:user.username,detalle:{campos:Object.keys(data),estado_anterior:current.estado,estado_nuevo:item.estado}}});return item;});}
async function metricas(){const now=new Date();const [grouped,total,vencidos,cerrados]=await Promise.all([prisma.registroCalidad.groupBy({by:['tipo'],_count:{_all:true}}),prisma.registroCalidad.count(),prisma.registroCalidad.count({where:{fecha_objetivo:{lt:now},estado:{notIn:['CERRADO','CANCELADO']}}}),prisma.registroCalidad.count({where:{estado:'CERRADO'}})]);const present=new Set(grouped.map(x=>x.tipo));const cobertura=Math.round(REQUIRED_TYPES.filter(x=>present.has(x)).length/REQUIRED_TYPES.length*100);return{total,cerrados,vencidos,cobertura_documental:cobertura,tipos_requeridos:REQUIRED_TYPES.length,tipos_presentes:REQUIRED_TYPES.filter(x=>present.has(x)).length,por_tipo:grouped.map(x=>({tipo:x.tipo,total:x._count._all}))};}

export default { listar, obtener, crear, actualizar, metricas };
