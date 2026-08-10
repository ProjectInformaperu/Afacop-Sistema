import visitasService from "../services/visitas.service.js";

async function obtenerVisitas(req, res) {
  try {
    return res.json({ data: await visitasService.obtenerVisitas() });
  } catch (error) {
    console.error("Error en obtenerVisitas:", error);
    return res.status(500).json({ mensaje: "Error al obtener las visitas" });
  }
}

async function crearVisita(req, res) {
  const { id_cliente, id_asesor, resultado } = req.body;
  if (!id_cliente || !id_asesor || !resultado) {
    return res.status(400).json({ mensaje: "id_cliente, id_asesor y resultado son obligatorios" });
  }
  try {
    return res.status(201).json({ mensaje: "Visita registrada", data: await visitasService.crearVisita(req.body) });
  } catch (error) {
    console.error("Error en crearVisita:", error);
    req.log?.warn({ err: error, requestId: req.id }, "visit_create_failed");
    return res.status(400).json({ mensaje: "No se pudo registrar la visita", requestId: req.id });
  }
}

async function obtenerResumen(req, res) {
  try {
    return res.json({ data: await visitasService.obtenerResumen() });
  } catch (error) {
    console.error("Error en obtenerResumen:", error);
    return res.status(500).json({ mensaje: "Error al obtener el resumen" });
  }
}

export default { obtenerVisitas, crearVisita, obtenerResumen };
