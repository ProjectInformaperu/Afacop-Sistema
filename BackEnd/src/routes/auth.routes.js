import { Router } from "express";
import authController from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { loginBody, mfaVerifyBody, mfaChallengeBody, mfaCodeBody, passwordBody } from "../validation/schemas.js";

const router = Router();

// Endpoint para iniciar sesión (público)
router.post("/login", validate({ body: loginBody }), authController.login);
router.post("/mfa/verify", validate({ body: mfaVerifyBody }), authController.verifyMfa);
router.post("/mfa/enroll/setup", validate({ body: mfaChallengeBody }), authController.setupMfaEnrollment);
router.post("/mfa/enroll/confirm", validate({ body: mfaVerifyBody }), authController.confirmMfaEnrollment);

// Endpoint para obtener el perfil del usuario firmado (protegido)
router.get("/me", authMiddleware, authController.me);
router.post("/logout", authMiddleware, authController.logout);
router.post("/mfa/setup", authMiddleware, authController.setupMfa);
router.post("/mfa/confirm", authMiddleware, validate({ body: mfaCodeBody }), authController.confirmMfa);
router.post("/mfa/disable", authMiddleware, validate({ body: passwordBody }), authController.disableMfa);

export default router;
