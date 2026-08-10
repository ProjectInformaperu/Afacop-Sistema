import { Router } from "express";
import clientesController from "../controllers/clientes.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { ALL_ROLES, OPERATIONAL_MANAGERS } from "../security/roles.js";
import { validate } from "../middlewares/validate.middleware.js";
import { requireAdvisorLink } from "../middlewares/advisor.middleware.js";
import { idParams, listQuery, mapQuery } from "../validation/schemas.js";

const router = Router();

router.use(authMiddleware);
router.use(requireAdvisorLink);
router.get("/", roleMiddleware(ALL_ROLES), validate({ query: listQuery }), clientesController.obtenerClientes);
router.get("/mapa/puntos", roleMiddleware(ALL_ROLES), validate({ query: mapQuery }), clientesController.obtenerPuntosMapa);
router.get("/:id", roleMiddleware(ALL_ROLES), validate({ params: idParams }), clientesController.obtenerClientePorId);

export default router;
