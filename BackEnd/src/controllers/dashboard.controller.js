import dashboardService from "../services/dashboard.service.js";

/**
 * Controlador para obtener las estadísticas del Dashboard.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function obtenerStats(req, res) {
  try {
    const stats = await dashboardService.obtenerStats();
    return res.status(200).json({ data: stats });
  } catch (error) {
    console.error("Error en obtenerStats:", error);
    return res.status(500).json({
      mensaje: "Error al obtener las estadísticas del dashboard",
      error: error.message,
    });
  }
}

/**
 * Controlador para obtener el listado de actividad reciente (visitas).
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function obtenerActividad(req, res) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const id_asesor = req.query.id_asesor ? Number(req.query.id_asesor) : undefined;
    if (req.query.id_asesor && !Number.isInteger(id_asesor)) {
      return res.status(400).json({ mensaje: 'El asesor seleccionado no es válido' });
    }
    const actividad = await dashboardService.obtenerActividad({
      limit, offset, id_asesor, fecha: req.query.fecha,
    });
    return res.status(200).json({ data: actividad });
  } catch (error) {
    console.error("Error en obtenerActividad:", error);
    return res.status(error.statusCode || 500).json({
      mensaje: "Error al obtener la actividad reciente del dashboard",
      ...(process.env.NODE_ENV === 'development' ? { error: error.message } : {}),
    });
  }
}

/**
 * Controlador para exportar la actividad de visitas a formato CSV.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function exportarActividad(req, res) {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const csv = await dashboardService.exportarActividad({ fecha_inicio, fecha_fin });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=actividad_historica.csv");
    return res.status(200).send(Buffer.from("\uFEFF" + csv, "utf-8"));
  } catch (error) {
    console.error("Error en exportarActividad:", error);
    return res.status(500).json({
      mensaje: "Error al exportar la actividad del dashboard",
      error: error.message,
    });
  }
}

export default {
  obtenerStats,
  obtenerActividad,
  exportarActividad,
};
