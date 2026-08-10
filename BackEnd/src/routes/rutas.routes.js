import { Router } from "express";
import rutasController from "../controllers/rutas.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { OPERATIONAL_MANAGERS } from "../security/roles.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParams, routeBody, osrmBody, routeClientParams, routeStatusBody, routeClientStatusBody } from "../validation/schemas.js";

const router = Router();

// Todas las rutas están protegidas
router.use(authMiddleware);

// Crear una ruta (Etapa 2)
router.post("/", roleMiddleware(OPERATIONAL_MANAGERS), validate({ body: routeBody }), rutasController.crearRuta);

// Obtener todas las rutas
router.get("/", roleMiddleware(OPERATIONAL_MANAGERS), rutasController.obtenerRutas);

// Actualizar una ruta
router.put("/:id", roleMiddleware(OPERATIONAL_MANAGERS), validate({ params: idParams, body: routeBody }), rutasController.actualizarRuta);
router.patch("/:id/estado", roleMiddleware(OPERATIONAL_MANAGERS), validate({ params: idParams, body: routeStatusBody }), rutasController.actualizarEstadoRuta);
router.patch("/:id/clientes/:clienteId/estado", roleMiddleware(OPERATIONAL_MANAGERS), validate({ params: routeClientParams, body: routeClientStatusBody }), rutasController.actualizarEstadoClienteRuta);

// Eliminar una ruta
router.delete("/:id/clientes/:clienteId", roleMiddleware(OPERATIONAL_MANAGERS), validate({ params: routeClientParams }), rutasController.eliminarClienteDeRuta);
router.delete("/:id", roleMiddleware(OPERATIONAL_MANAGERS), validate({ params: idParams }), rutasController.eliminarRuta);

// Obtener ruta optimizada desde OSRM
router.post("/osrm", roleMiddleware(OPERATIONAL_MANAGERS), validate({ body: osrmBody }), rutasController.obtenerRutaOsrm);

export default router;
