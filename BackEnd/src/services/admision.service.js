import prisma from "../config/prisma.js";

/**
 * Obtiene la lista de admisiones con paginación, búsqueda por relación cliente y filtro de estado.
 * 
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.limit
 * @param {string} [params.search]
 * @param {string} [params.estado]
 * @returns {Promise<Object>} Resultado con data paginada y objeto pagination.
 */
async function obtenerAdmisiones({ page = 1, limit = 12, search = "", estado } = {}) {
  const where = {};

  if (search && search.trim() !== "") {
    const trimmedSearch = search.trim();
    where.cliente = {
      is: {
        OR: [
          { dni: { contains: trimmedSearch, mode: "insensitive" } },
          { nombres: { contains: trimmedSearch, mode: "insensitive" } },
          { apellido_paterno: { contains: trimmedSearch, mode: "insensitive" } },
          { apellido_materno: { contains: trimmedSearch, mode: "insensitive" } },
        ],
      },
    };
  }

  if (estado && estado.trim() !== "") {
    where.estado = estado.trim();
  }

  const skip = (page - 1) * limit;
  const take = limit;

  const [total, admisiones] = await Promise.all([
    prisma.admision.count({ where }),
    prisma.admision.findMany({
      where,
      skip,
      take,
      orderBy: {
        id_admision: "asc",
      },
      include: {
        cliente: true,
      },
    }),
  ]);

  const data = admisiones.map((admision) => {
    const cliente = admision.cliente || {};

    return {
      id: admision.id_admision,
      dni: cliente.dni || "",
      ape_pat: cliente.apellido_paterno || "",
      ape_mat: cliente.apellido_materno || "",
      nombres: cliente.nombres || "",
      producto: admision.producto,
      linea: admision.linea_credito == null ? null : Number(admision.linea_credito),
      estado: admision.estado,
      fecha: admision.fecha,
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
  obtenerAdmisiones,
};
