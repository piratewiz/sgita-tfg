import {Router} from 'express'
import { verifyToken, requireRol } from '../middlewares/auth.middleware.js'
import { closeOrder, getBatchByOrder, getLotsByStatus, registerLots, registerLotsBulk } from '../controllers/batch.controller.js';


const router = Router();
router.use(verifyToken);

// /api/orders/:orderId
// obtener paquetes registrados de un pedido
router.get('/:orderId/lots', getBatchByOrder);

// un empleado registra una caja
router.post('/:orderId/batch', registerLots);

// un empleado registra varios paquetes a la vez
router.post('/:orderId/lots/bulk', registerLotsBulk);

// encargado cierra pedido y detecta diferencias en caso de haber
router.post('/:orderId/close', closeOrder);

export const batchRouterStatus = Router();
batchRouterStatus.use(verifyToken);
batchRouterStatus.get('/status/:status', getLotsByStatus);

export default router;