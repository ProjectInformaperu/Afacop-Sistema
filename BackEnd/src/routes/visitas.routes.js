import { Router } from "express";
import visitasController from "../controllers/visitas.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { OPERATIONAL_MANAGERS } from "../security/roles.js";

const router = Router();
router.use(authMiddleware, roleMiddleware(OPERATIONAL_MANAGERS));
router.get("/", visitasController.obtenerVisitas);
router.post("/", visitasController.crearVisita);
router.get("/resumen", visitasController.obtenerResumen);

export default router;
