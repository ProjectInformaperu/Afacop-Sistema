import { Router } from "express";
import asesoresController from "../controllers/asesores.controller.js";
import asignacionesController from "../controllers/asignaciones.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { OPERATIONAL_MANAGERS } from "../security/roles.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParams, listQuery, reverseGeocodeBody } from "../validation/schemas.js";

const router = Router();

// Endpoint para obtener el listado de asesores
router.use(authMiddleware);
router.get("/", roleMiddleware(OPERATIONAL_MANAGERS), validate({ query: listQuery }), asesoresController.obtenerAsesores);
router.post("/geocodificar", roleMiddleware(OPERATIONAL_MANAGERS), validate({ body: reverseGeocodeBody }), asesoresController.geocodificarUbicacion);

// Endpoint para obtener la cartera activa de clientes de un asesor específico
router.get("/:id/clientes", roleMiddleware(OPERATIONAL_MANAGERS), validate({ params: idParams }), asignacionesController.obtenerClientesDeAsesor);



// Endpoint para obtener un asesor por su ID
router.get("/:id", roleMiddleware(OPERATIONAL_MANAGERS), validate({ params: idParams }), asesoresController.obtenerAsesorPorId);

// Endpoint para registrar un nuevo asesor
router.post("/", roleMiddleware(OPERATIONAL_MANAGERS), asesoresController.crearAsesor);


// Endpoint para actualizar los datos de un asesor
router.put("/:id", roleMiddleware(OPERATIONAL_MANAGERS), validate({ params: idParams }), asesoresController.actualizarAsesor);
router.patch("/:id", roleMiddleware(OPERATIONAL_MANAGERS), validate({ params: idParams }), asesoresController.actualizarAsesor);

// Endpoint para actualizar únicamente el estado de un asesor
router.patch("/:id/estado", roleMiddleware(OPERATIONAL_MANAGERS), validate({ params: idParams }), asesoresController.actualizarEstado);

// Endpoint para eliminar físicamente un asesor
router.delete("/:id", roleMiddleware(OPERATIONAL_MANAGERS), validate({ params: idParams }), asesoresController.eliminarAsesor);

export default router;
