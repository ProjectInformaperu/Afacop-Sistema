import clientesService from "../services/clientes.service.js";
import { ROLES } from "../security/roles.js";

/**
 * Controlador para obtener el listado de clientes.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function obtenerClientes(req, res) {
  try {
    // 1. Leer query parameters
    const { page, limit, search, distrito, estado, fecha_pago, lat, lng, radio } = req.query;

    // 2. Validar y normalizar parámetros de paginación
    let parsedPage = parseInt(page, 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      parsedPage = 1;
    }

    let parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      parsedLimit = 12;
    } else if (parsedLimit > 9999) {
      // Límite ampliado para permitir cargar los clientes en el mapa de Rutas
      parsedLimit = 9999;
    }

    const searchStr = search ? String(search) : "";

    // 3. Llamar al servicio
    const resultado = await clientesService.obtenerClientes({
      page: parsedPage,
      limit: parsedLimit,
      search: searchStr,
      distrito,
      estado,
      fecha_pago,
      lat: lat !== undefined && lat !== null && lat !== "" ? parseFloat(lat) : undefined,
      lng: lng !== undefined && lng !== null && lng !== "" ? parseFloat(lng) : undefined,
      radio: radio !== undefined && radio !== null && radio !== "" ? parseFloat(radio) : undefined,
      asesorId: req.user?.rol === ROLES.ASESOR ? req.user.id_asesor : undefined,
    });

    // 4. Responder directamente con res.json(resultado)
    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error en obtenerClientes:", error);

    return res.status(500).json({
      mensaje: "Error al obtener los clientes",
      error: error.message,
    });
  }
}

/**
 * Controlador para obtener un cliente específico por su ID.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function obtenerClientePorId(req, res) {
  try {
    const { id } = req.params;

    // 1. Validar que el parámetro id sea un número entero positivo
    const parsedId = Number(id);
    if (isNaN(parsedId) || !Number.isInteger(parsedId) || parsedId <= 0) {
      return res.status(400).json({
        mensaje: "El id del cliente no es válido",
      });
    }

    // 2. Llamar al servicio
    const resultado = await clientesService.obtenerClientePorId(
      parsedId,
      req.user?.rol === ROLES.ASESOR ? req.user.id_asesor : undefined,
    );

    // 3. Si el cliente no existe, responder HTTP 404
    if (!resultado) {
      return res.status(404).json({
        mensaje: "Cliente no encontrado",
      });
    }

    // 4. Responder directamente con res.json(resultado)
    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error en obtenerClientePorId:", error);

    return res.status(500).json({
      mensaje: "Error al obtener el cliente",
      error: error.message,
    });
  }
}

async function obtenerPuntosMapa(req, res, next) {
  try {
    const query = req.validated?.query || req.query;
    const resultado = await clientesService.obtenerPuntosMapa({
      ...query,
      asesorId: req.user?.rol === ROLES.ASESOR ? req.user.id_asesor : undefined,
    });
    res.json(resultado);
  } catch (error) { next(error); }
}

/**
 * Controlador para importar clientes desde un archivo Excel.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function importarClientes(req, res) {
  try {
    // 1. Validar que se haya subido un archivo
    if (!req.file) {
      return res.status(400).json({
        mensaje: "No se ha proporcionado ningún archivo o formato no es válido",
      });
    }

    // 2. Invocar al servicio
    const resultado = await clientesService.importarClientes(req.file.buffer);

    // 3. Retornar el resumen de importación
    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error en importarClientes:", error);

    return res.status(500).json({
      mensaje: "Error al importar los clientes",
      error: error.message,
    });
  }
}

export default {
  obtenerClientes,
  obtenerPuntosMapa,
  obtenerClientePorId,
  importarClientes,
};
