import{Router}from'express';
import controller from'../controllers/seguridad.controller.js';
import{authMiddleware}from'../middlewares/auth.middleware.js';
import{roleMiddleware}from'../middlewares/role.middleware.js';
import{AUDIT_READERS}from'../security/roles.js';
const router=Router();router.use(authMiddleware,roleMiddleware(AUDIT_READERS));router.get('/auditoria',controller.auditoria);router.get('/metricas',controller.metricas);export default router;
