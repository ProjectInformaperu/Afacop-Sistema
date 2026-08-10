import { Router } from "express";
import asignacionesController from "../controllers/asignaciones.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { OPERATIONAL_MANAGERS } from "../security/roles.js";

const router = Router();

// Endpoint principal para registrar/reasignar cartera
router.use(authMiddleware, roleMiddleware(OPERATIONAL_MANAGERS));
router.post("/", asignacionesController.crearAsignaciones);

// Endpoint general para listar todas las asignaciones
router.get("/", asignacionesController.obtenerAsignaciones);

export default router;
