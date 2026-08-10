import admisionService from "../services/admision.service.js";

/**
 * Controlador para obtener el listado de admisiones.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function obtenerAdmisiones(req, res) {
  try {
    const { page, limit, search, estado } = req.query;

    // Validar y normalizar parámetros de paginación
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

    const searchStr = search ? String(search).trim() : "";
    const estadoStr = estado ? String(estado).trim() : "";

    const resultado = await admisionService.obtenerAdmisiones({
      page: parsedPage,
      limit: parsedLimit,
      search: searchStr,
      estado: estadoStr,
    });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error en obtenerAdmisiones:", error);

    return res.status(500).json({
      mensaje: "Error al obtener las admisiones",
      error: error.message,
    });
  }
}

export default {
  obtenerAdmisiones,
};
