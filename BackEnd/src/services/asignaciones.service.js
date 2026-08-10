import prisma from "../config/prisma.js";

/**
 * Mapea un registro de cliente de base de datos al formato homologado requerido por la API.
 * 
 * @param {Object} cliente - Registro de cliente de Prisma.
 * @returns {Object} Cliente formateado.
 */
function mapearCliente(cliente) {
  const deuda_total =
    Number(cliente.deuda_castigada ?? 0) +
    Number(cliente.deuda_vigente ?? 0) +
    Number(cliente.otras_deudas ?? 0);

  const apellidos = `${cliente.apellido_paterno ?? ""} ${cliente.apellido_materno ?? ""}`.trim();

  return {
    id: cliente.id_cliente,
    dni: cliente.dni,
    nombres: cliente.nombres,
    apellidos,
    telefono: cliente.telefono,
    direccion: cliente.direccion,
    distrito: cliente.distrito,
    deuda_total,
    dias_retraso: 0,
    estado: cliente.estado,
    fecha_gestion: cliente.ultima_gestion,
  };
}

/**
 * Mapea un registro de asesor al formato de nombres completos.
 * 
 * @param {Object} asesor - Registro de asesor de Prisma.
 * @returns {Object} Asesor formateado.
 */
function mapearAsesorResumido(asesor) {
  const apellidos = `${asesor.apellido_paterno ?? ""} ${asesor.apellido_materno ?? ""}`.trim();
  return {
    id: asesor.id_asesor,
    dni: asesor.dni,
    nombres: asesor.nombres,
    apellidos,
  };
}

/**
 * Registra y/o reasigna una lista de clientes a un asesor dentro de una transacción.
 * Valida la existencia y estado activo del asesor, y la existencia de los clientes.
 * 
 * @param {Object} params
 * @param {number} params.id_asesor - ID del asesor destino.
 * @param {number[]} params.clientes_ids - Array de IDs de clientes a asignar.
 * @param {string} [params.observacion] - Comentario u observación opcional de la reasignación.
 * @returns {Promise<Object>} Resultado con el total de asignaciones procesadas.
 */
async function crearAsignaciones({ id_asesor, clientes_ids, observacion } = {}) {
  // 1. Validar existencia y estado del Asesor
  const asesor = await prisma.asesor.findUnique({
    where: { id_asesor },
  });

  if (!asesor) {
    const error = new Error("El asesor no existe");
    error.statusCode = 404;
    throw error;
  }

  if (asesor.estado !== "ACTIVO") {
    const error = new Error("No se pueden realizar asignaciones a un asesor inactivo");
    error.statusCode = 400;
    throw error;
  }

  // 2. Validar existencia de todos los clientes
  const totalClientesValidos = await prisma.cliente.count({
    where: {
      id_cliente: { in: clientes_ids },
    },
  });

  if (totalClientesValidos !== clientes_ids.length) {
    const error = new Error("Uno o más clientes no existen en la base de datos");
    error.statusCode = 400;
    throw error;
  }

  // 3. Ejecutar reasignaciones atómicamente dentro de una transacción
  const resultado = await prisma.$transaction(async (tx) => {
    let creadas = 0;
    let actualizadas = 0;

    for (const id_cliente of clientes_ids) {
      // Buscar asignación activa actual del cliente
      const asignacionActiva = await tx.asignacionCliente.findFirst({
        where: {
          id_cliente,
          estado: "ACTIVA",
        },
      });

      const ahora = new Date();

      if (asignacionActiva) {
        // Si ya está asignado al mismo asesor, ignoramos para evitar redundancia
        if (asignacionActiva.id_asesor === id_asesor) {
          continue;
        }

        // Finalizar asignación anterior
        await tx.asignacionCliente.update({
          where: {
            id_asignacion: asignacionActiva.id_asignacion,
          },
          data: {
            estado: "FINALIZADA",
            fecha_fin: ahora,
          },
        });
        actualizadas++;
      }

      // Crear nueva asignación activa
      await tx.asignacionCliente.create({
        data: {
          id_cliente,
          id_asesor,
          estado: "ACTIVA",
          fecha_asignacion: ahora,
        },
      });
      creadas++;
    }

    return { creadas, actualizadas };
  });

  return {
    mensaje: "Asignación de cartera procesada con éxito",
    data: {
      id_asesor,
      procesados: clientes_ids.length,
      creadas: resultado.creadas,
      actualizadas: resultado.actualizadas,
    },
  };
}

/**
 * Obtiene los clientes asignados de forma activa a un asesor con paginación.
 * 
 * @param {number} id_asesor - ID del asesor.
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.limit
 * @returns {Promise<Object>} Clientes activos paginados.
 */
async function obtenerClientesDeAsesor(id_asesor, { page = 1, limit = 12 } = {}) {
  // Validar existencia de asesor
  const asesor = await prisma.asesor.findUnique({
    where: { id_asesor },
  });

  if (!asesor) {
    const error = new Error("El asesor no existe");
    error.statusCode = 404;
    throw error;
  }

  const where = {
    asignaciones: {
      some: {
        id_asesor,
        estado: "ACTIVA",
      },
    },
  };

  const skip = (page - 1) * limit;
  const take = limit;

  const [total, clientes] = await Promise.all([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      skip,
      take,
      orderBy: {
        id_cliente: "asc",
      },
    }),
  ]);

  const data = clientes.map(mapearCliente);
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Obtiene el historial completo de asignaciones de un cliente específico.
 * 
 * @param {number} id_cliente - ID del cliente.
 * @returns {Promise<Object>} Historial de asignaciones.
 */
async function obtenerHistorialAsignacionesDeCliente(id_cliente) {
  // Validar existencia de cliente
  const cliente = await prisma.cliente.findUnique({
    where: { id_cliente },
  });

  if (!cliente) {
    const error = new Error("El cliente no existe");
    error.statusCode = 404;
    throw error;
  }

  const historial = await prisma.asignacionCliente.findMany({
    where: {
      id_cliente,
    },
    include: {
      asesor: true,
    },
    orderBy: {
      fecha_asignacion: "desc",
    },
  });

  const data = historial.map((a) => {
    return {
      id_asignacion: a.id_asignacion,
      id_cliente: a.id_cliente,
      id_asesor: a.id_asesor,
      fecha_asignacion: a.fecha_asignacion,
      fecha_fin: a.fecha_fin,
      estado: a.estado,
      asesor: mapearAsesorResumido(a.asesor),
    };
  });

  return {
    data,
  };
}

/**
 * Obtiene el listado general de todas las asignaciones registradas con paginación.
 * 
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.limit
 * @returns {Promise<Object>} Asignaciones paginadas.
 */
async function obtenerAsignaciones({ page = 1, limit = 12 } = {}) {
  const skip = (page - 1) * limit;
  const take = limit;

  const [total, asignaciones] = await Promise.all([
    prisma.asignacionCliente.count(),
    prisma.asignacionCliente.findMany({
      skip,
      take,
      include: {
        cliente: true,
        asesor: true,
      },
      orderBy: {
        id_asignacion: "desc",
      },
    }),
  ]);

  const data = asignaciones.map((a) => {
    const apellidosCliente = `${a.cliente.apellido_paterno ?? ""} ${a.cliente.apellido_materno ?? ""}`.trim();
    const apellidosAsesor = `${a.asesor.apellido_paterno ?? ""} ${a.asesor.apellido_materno ?? ""}`.trim();
    
    return {
      id_asignacion: a.id_asignacion,
      id_cliente: a.id_cliente,
      id_asesor: a.id_asesor,
      fecha_asignacion: a.fecha_asignacion,
      fecha_fin: a.fecha_fin,
      estado: a.estado,
      cliente: {
        id: a.cliente.id_cliente,
        dni: a.cliente.dni,
        nombres: a.cliente.nombres,
        apellidos: apellidosCliente,
      },
      asesor: {
        id: a.asesor.id_asesor,
        dni: a.asesor.dni,
        nombres: a.asesor.nombres,
        apellidos: apellidosAsesor,
      },
    };
  });

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export default {
  crearAsignaciones,
  obtenerClientesDeAsesor,
  obtenerHistorialAsignacionesDeCliente,
  obtenerAsignaciones,
};
