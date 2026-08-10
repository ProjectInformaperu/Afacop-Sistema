import { Router } from "express";
import dashboardController from "../controllers/dashboard.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { ALL_ROLES } from "../security/roles.js";

const router = Router();

// Aplicar authMiddleware a todas las rutas del dashboard
router.use(authMiddleware, roleMiddleware(ALL_ROLES));

// Endpoint para obtener estadísticas del Dashboard
router.get("/stats", dashboardController.obtenerStats);

// Endpoint para obtener la actividad reciente
router.get("/actividad", dashboardController.obtenerActividad);

// Endpoint para exportar la actividad a CSV
router.get("/export_actividad", dashboardController.exportarActividad);

export default router;
