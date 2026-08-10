import asignacionesService from "../services/asignaciones.service.js";

/**
 * Controlador para registrar y/o reasignar clientes a un asesor.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function crearAsignaciones(req, res) {
  try {
    // Trabajar sobre una copia del body para no mutar el objeto recibido
    const datos = { ...req.body };

    const { id_asesor, clientes_ids } = datos;

    // 1. Validar id_asesor
    const parsedIdAsesor = Number(id_asesor);
    if (id_asesor === undefined || isNaN(parsedIdAsesor) || !Number.isInteger(parsedIdAsesor) || parsedIdAsesor <= 0) {
      return res.status(400).json({
        mensaje: "El id_asesor es obligatorio y debe ser un número entero positivo",
      });
    }

    // 2. Validar clientes_ids
    if (!clientes_ids || !Array.isArray(clientes_ids) || clientes_ids.length === 0) {
      return res.status(400).json({
        mensaje: "El campo clientes_ids es obligatorio, debe ser un arreglo y no puede estar vacío",
      });
    }

    // Validar que todos los elementos de clientes_ids sean números enteros positivos
    const idsValidos = clientes_ids.every((id) => {
      const num = Number(id);
      return !isNaN(num) && Number.isInteger(num) && num > 0;
    });

    if (!idsValidos) {
      return res.status(400).json({
        mensaje: "Todos los elementos de clientes_ids deben ser números enteros positivos",
      });
    }

    // 3. Llamar al servicio
    const resultado = await asignacionesService.crearAsignaciones({
      id_asesor: parsedIdAsesor,
      clientes_ids: clientes_ids.map(Number),
      observacion: datos.observacion || null,
    });

    // 4. Responder
    return res.status(201).json(resultado);
  } catch (error) {
    console.error("Error en crearAsignaciones:", error);

    // Si el error tiene un statusCode establecido por el servicio, usarlo
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      mensaje: error.statusCode ? error.message : "Error al registrar las asignaciones",
      ...(error.statusCode ? {} : { error: error.message }),
    });
  }
}

/**
 * Controlador para obtener la cartera activa de clientes de un asesor específico.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function obtenerClientesDeAsesor(req, res) {
  try {
    const { id } = req.params;
    const { page, limit } = req.query;

    // 1. Validar que el ID del asesor sea válido
    const parsedIdAsesor = Number(id);
    if (isNaN(parsedIdAsesor) || !Number.isInteger(parsedIdAsesor) || parsedIdAsesor <= 0) {
      return res.status(400).json({
        mensaje: "El id del asesor no es válido",
      });
    }

    // 2. Validar y normalizar parámetros de paginación
    let parsedPage = parseInt(page, 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      parsedPage = 1;
    }

    let parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      parsedLimit = 12;
    } else if (parsedLimit > 100) {
      parsedLimit = 100;
    }

    // 3. Llamar al servicio
    const resultado = await asignacionesService.obtenerClientesDeAsesor(parsedIdAsesor, {
      page: parsedPage,
      limit: parsedLimit,
    });

    // 4. Responder
    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error en obtenerClientesDeAsesor:", error);

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      mensaje: error.statusCode ? error.message : "Error al obtener la cartera del asesor",
      ...(error.statusCode ? {} : { error: error.message }),
    });
  }
}

/**
 * Controlador para obtener el historial de asignaciones de un cliente específico.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function obtenerHistorialAsignacionesDeCliente(req, res) {
  try {
    const { id } = req.params;

    // 1. Validar que el ID del cliente sea válido
    const parsedIdCliente = Number(id);
    if (isNaN(parsedIdCliente) || !Number.isInteger(parsedIdCliente) || parsedIdCliente <= 0) {
      return res.status(400).json({
        mensaje: "El id del cliente no es válido",
      });
    }

    // 2. Llamar al servicio
    const resultado = await asignacionesService.obtenerHistorialAsignacionesDeCliente(parsedIdCliente);

    // 3. Responder
    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error en obtenerHistorialAsignacionesDeCliente:", error);

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      mensaje: error.statusCode ? error.message : "Error al obtener el historial de asignaciones del cliente",
      ...(error.statusCode ? {} : { error: error.message }),
    });
  }
}

/**
 * Controlador para obtener el listado general de todas las asignaciones registradas.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function obtenerAsignaciones(req, res) {
  try {
    const { page, limit } = req.query;

    // 1. Validar y normalizar parámetros de paginación
    let parsedPage = parseInt(page, 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      parsedPage = 1;
    }

    let parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      parsedLimit = 12;
    } else if (parsedLimit > 100) {
      parsedLimit = 100;
    }

    // 2. Llamar al servicio
    const resultado = await asignacionesService.obtenerAsignaciones({
      page: parsedPage,
      limit: parsedLimit,
    });

    // 3. Responder
    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error en obtenerAsignaciones:", error);

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      mensaje: error.statusCode ? error.message : "Error al obtener el listado de asignaciones",
      ...(error.statusCode ? {} : { error: error.message }),
    });
  }
}

export default {
  crearAsignaciones,
  obtenerClientesDeAsesor,
  obtenerHistorialAsignacionesDeCliente,
  obtenerAsignaciones,
};
