import rutasService from "../services/rutas.service.js";

/**
 * Controlador para crear una ruta.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function crearRuta(req, res) {
  try {
    const { id_asesor, fecha_programada, cliente_ids } = req.body;

    if (!id_asesor || !fecha_programada || !cliente_ids || !Array.isArray(cliente_ids) || cliente_ids.length === 0) {
      return res.status(400).json({
        mensaje: "id_asesor, fecha_programada y cliente_ids (array) son obligatorios",
      });
    }

    const resultado = await rutasService.crearRuta({
      id_asesor,
      fecha_programada,
      cliente_ids
    });

    return res.status(201).json({
      mensaje: "Ruta creada exitosamente",
      data: resultado
    });
  } catch (error) {
    console.error("Error en crearRuta:", error);
    return res.status(500).json({
      mensaje: "Error al crear la ruta",
      error: error.message,
    });
  }
}

/**
 * Controlador para obtener la ruta trazada por OSRM.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function obtenerRutaOsrm(req, res) {
  try {
    const { coordinates } = req.body;
    
    if (!coordinates || !Array.isArray(coordinates)) {
      return res.status(400).json({
        mensaje: "El campo coordinates debe ser un arreglo",
      });
    }

    const resultado = await rutasService.obtenerRutaOsrm(coordinates);
    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error en obtenerRutaOsrm:", error);
    // Retornamos array vacío para usar fallback en el frontend
    return res.status(200).json({ coordinates: [] });
  }
}

/**
 * Controlador para obtener todas las rutas.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function obtenerRutas(req, res) {
  try {
    const rutas = await rutasService.obtenerRutas();
    return res.status(200).json({
      data: rutas
    });
  } catch (error) {
    console.error("Error en obtenerRutas:", error);
    return res.status(500).json({
      mensaje: "Error al obtener las rutas",
      error: error.message,
    });
  }
}

/**
 * Controlador para eliminar una ruta.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function eliminarRuta(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        mensaje: "El ID de la ruta es obligatorio",
      });
    }

    const resultado = await rutasService.eliminarRuta(id);

    return res.status(200).json({
      mensaje: "Ruta eliminada exitosamente",
      data: resultado
    });
  } catch (error) {
    console.error("Error en eliminarRuta:", error);
    return res.status(500).json({
      mensaje: "Error al eliminar la ruta",
      error: error.message,
    });
  }
}

async function eliminarClienteDeRuta(req, res, next) {
  try {
    const resultado = await rutasService.eliminarClienteDeRuta(req.params.id, req.params.clienteId);
    if (!resultado) return res.status(404).json({ mensaje: 'La asignación ya no existe' });
    return res.json({
      mensaje: resultado.routeDeleted ? 'Asignación y ruta vacía eliminadas' : 'Cliente retirado de la ruta',
      data: resultado,
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ mensaje: error.message });
    next(error);
  }
}

async function actualizarEstadoRuta(req, res, next) {
  try {
    const data = await rutasService.actualizarEstadoRuta(req.params.id, req.body.estado);
    if (!data) return res.status(404).json({ mensaje: 'Ruta no encontrada' });
    return res.json({ mensaje: 'Estado de ruta actualizado', data });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ mensaje: error.message });
    next(error);
  }
}

async function actualizarEstadoClienteRuta(req, res, next) {
  try {
    const data = await rutasService.actualizarEstadoClienteRuta(req.params.id, req.params.clienteId, req.body.estado_visita);
    if (!data) return res.status(404).json({ mensaje: 'Asignación no encontrada' });
    return res.json({ mensaje: 'Resultado del cliente actualizado', data });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ mensaje: error.message });
    next(error);
  }
}

/**
 * Controlador para actualizar una ruta.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function actualizarRuta(req, res) {
  try {
    const { id } = req.params;
    const { id_asesor, fecha_programada, cliente_ids } = req.body;

    if (!id) {
      return res.status(400).json({
        mensaje: "El ID de la ruta es obligatorio",
      });
    }

    if (!id_asesor || !fecha_programada || !cliente_ids || !Array.isArray(cliente_ids) || cliente_ids.length === 0) {
      return res.status(400).json({
        mensaje: "id_asesor, fecha_programada y cliente_ids (array) son obligatorios",
      });
    }

    const resultado = await rutasService.actualizarRuta(id, {
      id_asesor,
      fecha_programada,
      cliente_ids
    });

    if (!resultado) {
      return res.status(404).json({
        mensaje: "La ruta que intentas actualizar no existe",
      });
    }

    return res.status(200).json({
      mensaje: "Ruta actualizada exitosamente",
      data: resultado
    });
  } catch (error) {
    console.error("Error en actualizarRuta:", error);
    return res.status(error.statusCode || 500).json({
      mensaje: "Error al actualizar la ruta",
      ...(process.env.NODE_ENV === 'development' ? { error: error.message } : {}),
    });
  }
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
