import { Router } from "express";
import usuariosController from "../controllers/usuarios.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { ADMIN_ROLES } from "../security/roles.js";
import { validate } from "../middlewares/validate.middleware.js";
import { userCreateBody, userUpdateBody, uuidParams } from "../validation/schemas.js";

const router = Router();
router.use(authMiddleware, roleMiddleware(ADMIN_ROLES));
router.get("/", usuariosController.listar);
router.post("/", validate({ body: userCreateBody }), usuariosController.crear);
router.put("/:id", validate({ params: uuidParams, body: userUpdateBody }), usuariosController.actualizar);
router.patch("/:id", validate({ params: uuidParams, body: userUpdateBody }), usuariosController.actualizar);
router.post("/:id/mfa/reset", validate({ params: uuidParams }), usuariosController.resetMfa);
router.delete("/:id", validate({ params: uuidParams }), usuariosController.eliminar);

export default router;
