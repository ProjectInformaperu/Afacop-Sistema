import { Router } from 'express';
import upload from '../middlewares/upload.middleware.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { OPERATIONAL_MANAGERS } from '../security/roles.js';
import { validate } from '../middlewares/validate.middleware.js';
import { uuidParams } from '../validation/schemas.js';
import { getJob, uploadType } from '../controllers/importaciones.controller.js';

const router = Router();
router.use(authMiddleware, roleMiddleware(OPERATIONAL_MANAGERS));
router.post('/clientes', upload.single('file'), uploadType('CLIENTES'));
router.post('/asesores', upload.single('file'), uploadType('ASESORES'));
router.get('/:id', validate({ params: uuidParams }), getJob);

export default router;
