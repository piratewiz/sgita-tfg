import { Router } from 'express';
import { getEmployees } from '../controllers/employee.controller.js';
import { verifyToken, requireRol } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas las rutas requieren autenticación y rol admin o encargado
router.use(verifyToken);
router.use(requireRol('admin', 'encargado'));

router.get('/', getEmployees);

export default router;