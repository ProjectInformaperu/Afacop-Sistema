import prisma from "../config/prisma.js";

// fecha_programada es una fecha de calendario, no un instante. Se almacena al
// mediodía UTC para que ningún huso horario pueda desplazarla al día anterior.
function parseScheduledDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw Object.assign(new Error('La fecha programada no es válida'), { statusCode: 400 });
  return date;
}

/**
 * Crea una nueva ruta y sus asignaciones de clientes usando una transacción.
 * 
 * @param {Object} param0 
 * @param {number} param0.id_asesor 
 * @param {string|Date} param0.fecha_programada 
 * @param {number[]} param0.cliente_ids 
 * @returns {Promise<Object>}
 */
async function crearRuta({ id_asesor, fecha_programada, cliente_ids }) {
  // Ejecutamos todo dentro de una transacción para asegurar rollback en caso de error
  const resultado = await prisma.$transaction(async (tx) => {
    // 1. Crear la Ruta
    const nuevaRuta = await tx.ruta.create({
      data: {
        id_asesor: Number(id_asesor),
        fecha_programada: parseScheduledDate(fecha_programada),
        estado: "PROGRAMADA", // Por defecto según el esquema
      },
    });

    // 2. Crear las relaciones en RutaCliente
    const rutaClientesData = cliente_ids.map((id_cliente, index) => ({
      id_ruta: nuevaRuta.id_ruta,
      id_cliente: Number(id_cliente),
      secuencia: index + 1,
      estado_visita: "PENDIENTE", // Por defecto
    }));

    await tx.rutaCliente.createMany({
      data: rutaClientesData,
    });

    // Retornar la ruta creada con sus clientes vinculados
    const rutaCreada = await tx.ruta.findUnique({
      where: { id_ruta: nuevaRuta.id_ruta },
      include: {
        rutas_clientes: true,
      },
    });

    return rutaCreada;
  });

  return resultado;
}

/**
 * Obtiene la ruta optimizada usando la API pública de OSRM.
 * 
 * @param {number[][]} coordinates Array de [lat, lng]
 * @returns {Promise<{coordinates: number[][]}>}
 */
async function obtenerRutaOsrm(coordinates) {
  try {
    // 1. Validación de coordenadas
    if (coordinates.length < 2) {
      console.warn("obtenerRutaOsrm: Se requieren al menos 2 coordenadas, usando fallback.");
      return { coordinates: [] };
    }

    // 2. Transformación [lat, lng] -> [lng, lat] para la URL de OSRM
    const osrmCoords = coordinates.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `http://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson`;

    // 3. Llamada a OSRM con timeout (5 segundos)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`obtenerRutaOsrm: OSRM falló con status ${response.status}. Usando fallback.`);
      return { coordinates: [] };
    }

    const data = await response.json();

    // 5. Manejo de caso sin ruta ("NoRoute")
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.warn(`obtenerRutaOsrm: OSRM retornó código ${data.code}. Usando fallback.`);
      return { coordinates: [] };
    }

    const routeCoordinates = data.routes[0].geometry.coordinates;

    // 4. Transformación de vuelta [lng, lat] -> [lat, lng]
    const transformedCoordinates = routeCoordinates.map(([lng, lat]) => [lat, lng]);

    return { coordinates: transformedCoordinates };

  } catch (error) {
    console.error("Error al consultar OSRM:", error.message);
    // 5. Retornar empty array para usar fallback de línea recta
    return { coordinates: [] };
  }
}

/**
 * Obtiene todas las rutas programadas incluyendo los clientes asociados y el asesor.
 * 
 * @returns {Promise<Array>}
 */
async function obtenerRutas() {
  const rutas = await prisma.ruta.findMany({
    orderBy: {
      fecha_programada: 'desc',
    },
    include: {
      asesor: {
        select: {
          nombres: true,
          apellido_paterno: true,
          apellido_materno: true,
          dni: true,
          distrito: true,
        }
      },
      rutas_clientes: {
        orderBy: {
          secuencia: 'asc',
        },
        include: {
          cliente: {
            select: {
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
              dni: true,
            }
          }
        }
      }
    }
  });

  return rutas;
}

/**
 * Elimina una ruta y sus relaciones con clientes.
 * No elimina los clientes de la base de datos.
 * 
 * @param {number} id_ruta 
 * @returns {Promise<Object>}
 */
async function eliminarRuta(id_ruta) {
  const resultado = await prisma.$transaction(async (tx) => {
    // 1. Eliminar relaciones en rutas_clientes
    await tx.rutaCliente.deleteMany({
      where: {
        id_ruta: Number(id_ruta),
      },
    });

    // 2. Eliminar la ruta
    const rutaEliminada = await tx.ruta.delete({
      where: {
        id_ruta: Number(id_ruta),
      },
    });

    return rutaEliminada;
  });

  return resultado;
}

async function eliminarClienteDeRuta(id_ruta, id_cliente) {
  return prisma.$transaction(async tx => {
    const relation = await tx.rutaCliente.findUnique({
      where: { id_ruta_id_cliente: { id_ruta: Number(id_ruta), id_cliente: Number(id_cliente) } },
      include: { _count: { select: { visitas: true } } },
    });
    if (!relation) return null;
    if (relation._count.visitas > 0) {
      throw Object.assign(new Error('No se puede retirar un cliente que ya registra visitas en esta ruta'), { statusCode: 409 });
    }

    await tx.rutaCliente.delete({ where: { id_ruta_cliente: relation.id_ruta_cliente } });
    const remaining = await tx.rutaCliente.findMany({ where: { id_ruta: Number(id_ruta) }, orderBy: { secuencia: 'asc' } });
    if (remaining.length === 0) {
      await tx.ruta.delete({ where: { id_ruta: Number(id_ruta) } });
      return { routeDeleted: true };
    }
    await Promise.all(remaining.map((item, index) => tx.rutaCliente.update({
      where: { id_ruta_cliente: item.id_ruta_cliente }, data: { secuencia: index + 1 },
    })));
    return { routeDeleted: false };
  });
}

async function actualizarEstadoRuta(id_ruta, nuevoEstado) {
  return prisma.$transaction(async tx => {
    const ruta = await tx.ruta.findUnique({
      where: { id_ruta: Number(id_ruta) },
      include: { rutas_clientes: { select: { estado_visita: true } } },
    });
    if (!ruta) return null;
    const transitions = {
      PROGRAMADA: ['EN_PROCESO', 'CANCELADA'],
      EN_PROCESO: ['FINALIZADA', 'CANCELADA'],
      FINALIZADA: [],
      CANCELADA: [],
    };
    if (!(transitions[ruta.estado] || []).includes(nuevoEstado)) {
      throw Object.assign(new Error(`No se puede cambiar una ruta de ${ruta.estado} a ${nuevoEstado}`), { statusCode: 409 });
    }
    if (nuevoEstado === 'FINALIZADA' && ruta.rutas_clientes.some(item => item.estado_visita === 'PENDIENTE')) {
      throw Object.assign(new Error('Debe registrar el resultado de todos los clientes antes de finalizar la ruta'), { statusCode: 409 });
    }
    return tx.ruta.update({
      where: { id_ruta: Number(id_ruta) },
      data: {
        estado: nuevoEstado,
        ...(nuevoEstado === 'EN_PROCESO' && !ruta.fecha_inicio_real ? { fecha_inicio_real: new Date() } : {}),
        ...(nuevoEstado === 'FINALIZADA' ? { fecha_fin_real: new Date() } : {}),
      },
    });
  });
}

async function actualizarEstadoClienteRuta(id_ruta, id_cliente, estadoVisita) {
  const ruta = await prisma.ruta.findUnique({ where: { id_ruta: Number(id_ruta) }, select: { estado: true } });
  if (!ruta) return null;
  if (ruta.estado !== 'EN_PROCESO') {
    throw Object.assign(new Error('Los resultados de clientes solo pueden registrarse cuando la ruta está en proceso'), { statusCode: 409 });
  }
  const relation = await prisma.rutaCliente.findUnique({
    where: { id_ruta_id_cliente: { id_ruta: Number(id_ruta), id_cliente: Number(id_cliente) } },
  });
  if (!relation) return null;
  return prisma.rutaCliente.update({
    where: { id_ruta_cliente: relation.id_ruta_cliente }, data: { estado_visita: estadoVisita },
  });
}

/**
 * Actualiza una ruta existente y sus clientes asignados.
 * 
 * @param {number|string} id_ruta 
 * @param {Object} param1 
 * @param {number} param1.id_asesor 
 * @param {string|Date} param1.fecha_programada 
 * @param {number[]} param1.cliente_ids 
 * @returns {Promise<Object>}
 */
async function actualizarRuta(id_ruta, { id_asesor, fecha_programada, cliente_ids }) {
  const rutaId = Number(id_ruta);

  // Verificar si la ruta existe primero para devolver null o arrojar error (manejado por el controller)
  const rutaExistente = await prisma.ruta.findUnique({
    where: { id_ruta: rutaId },
  });

  if (!rutaExistente) {
    return null; // El controlador manejará este null como un 404
  }
  if (['EN_PROCESO', 'FINALIZADA'].includes(rutaExistente.estado)) {
    throw Object.assign(new Error('Una ruta en proceso o finalizada no puede modificarse'), { statusCode: 409 });
  }

  const resultado = await prisma.$transaction(async (tx) => {
    // 1. Actualizar datos base de la ruta
    const rutaActualizada = await tx.ruta.update({
      where: { id_ruta: rutaId },
      data: {
        id_asesor: Number(id_asesor),
        fecha_programada: parseScheduledDate(fecha_programada),
        ...(rutaExistente.estado === 'CANCELADA' ? {
          estado: 'PROGRAMADA', fecha_inicio_real: null, fecha_fin_real: null,
        } : {}),
      },
    });

    // 2. Eliminar relaciones existentes en rutas_clientes
    await tx.rutaCliente.deleteMany({
      where: { id_ruta: rutaId },
    });

    // 3. Crear las nuevas relaciones
    if (cliente_ids && cliente_ids.length > 0) {
      const rutaClientesData = cliente_ids.map((id_cliente, index) => ({
        id_ruta: rutaId,
        id_cliente: Number(id_cliente),
        secuencia: index + 1,
        estado_visita: "PENDIENTE",
      }));

      await tx.rutaCliente.createMany({
        data: rutaClientesData,
      });
    }

    // 4. Retornar la ruta actualizada completa
    return await tx.ruta.findUnique({
      where: { id_ruta: rutaId },
      include: {
        rutas_clientes: true,
      },
    });
  });

  return resultado;
}

export default {
  crearRuta,
  obtenerRutaOsrm,
  obtenerRutas,
  actualizarRuta,
  eliminarRuta,
  eliminarClienteDeRuta,
  actualizarEstadoRuta,
  actualizarEstadoClienteRuta,
};
