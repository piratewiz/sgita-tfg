import {Router} from 'express';
import {login, register, me, logout, forgotPassword, resetPassword} from '../controllers/auth.controller.js';
import { requireRol, verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', login);

router.post(
    '/register',
    verifyToken,
    requireRol('admin'),
    register
)

router.post('/forgot-password', forgotPassword);

router.post('/reset-password', resetPassword);

router.get('/me', verifyToken, me);

router.post('/logout', verifyToken, logout);

export default router;