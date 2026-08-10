import { Router } from "express";
import admisionController from "../controllers/admision.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { ADMISSION_READERS } from "../security/roles.js";
import { validate } from "../middlewares/validate.middleware.js";
import { listQuery } from "../validation/schemas.js";

const router = Router();

router.use(authMiddleware);
router.get("/", roleMiddleware(ADMISSION_READERS), validate({ query: listQuery }), admisionController.obtenerAdmisiones);

export default router;
