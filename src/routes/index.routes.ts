import { Router } from "express";
import { requireRol, verifyToken } from "../middlewares/auth.middleware.js";
import { createProvider, createTruck, deleteProvider, deleteTruck, getProviderById, getProviders, getTruckById, getTrucks, updateProvider, updateTruck } from "../controllers/masters.controller.js";
import { createOrder, getOrderById, getOrders, getOrdersByStatus, registerReception } from "../controllers/order.controller.js";
import { createProduct, deleteProductById, getProductById, getProducts, getProductsByStatus, getProductsByStock, updateProduct } from "../controllers/product.controller.js";
import { createIncidence, getIncidenceById, getIncidenceByOrderId, getIncidences, updateIncidenceStatus } from "../controllers/incidence.controller.js";
import employeeRoutes from "./employee.routes.js";


const router = Router();

// para todas las rutas requerimos del token
router.use(verifyToken);

// APIS DE LOS PROVEEDORES
// =======================
// /api/providers
router.get('/', getProviders);
router.get('/:id', getProviderById);
router.post('/', requireRol('admin', 'encargado'), createProvider);
router.put('/:id', requireRol('admin', 'encargado'), updateProvider);
router.delete('/:id', requireRol('admin'), deleteProvider);

export const providerRoutes = router;


// APIS PARA OBTENER INFO DE LOS CAMIONES
// ====================
// /api/trucks
const truckRouter = Router();
truckRouter.use(verifyToken);
truckRouter.get('/', getTrucks);
truckRouter.get('/:id', getTruckById);
truckRouter.post('/', requireRol('admin', 'encargado'), createTruck);
truckRouter.put('/:id', requireRol('admin', 'encargado'), updateTruck);
truckRouter.delete('/:id', requireRol('admin'), deleteTruck);

export const truckRoutes = truckRouter;

// APIS PARA OBTENER INFO DE LOS PEDIDOS
// ===================
// /api/orders
const orderRouter = Router();
orderRouter.use(verifyToken);
orderRouter.get('/', getOrders);
orderRouter.get('/status/:status', getOrdersByStatus);
orderRouter.get('/:id', getOrderById);
orderRouter.post('/', requireRol('admin', 'encargado'), createOrder);
orderRouter.post('/:id/reception', registerReception); // IMPORTANTE -> cualquier empleado

export const orderRoutes = orderRouter;


// APIS PARA OBTENER INFO DE LOS PRODUCTOS
// =======================================
// /api/products
const productRouter = Router();
productRouter.use(verifyToken);
productRouter.get('/', getProducts);
productRouter.get('/stock', getProductsByStock);
productRouter.get('/status/:status', getProductsByStatus);
productRouter.get('/:id', getProductById);
productRouter.post('/', requireRol('admin', 'encargado'), createProduct);
productRouter.put('/:id', requireRol('admin', 'encargado'), updateProduct);
productRouter.delete('/:id', requireRol('admin'), deleteProductById);

export const productRoutes = productRouter;


// APIS PARA OBTENER LA INFO DE LAS INCIDENCIAS
// ============================================
// /api/incidences
const incidenceRouter = Router();
incidenceRouter.use(verifyToken);
incidenceRouter.get('/', getIncidences);
incidenceRouter.get('/order/:orderId', getIncidenceByOrderId);
incidenceRouter.get('/:id', getIncidenceById);
incidenceRouter.post('/', createIncidence); // IMPORTANTE -> crea incidencia cualquier empleado
incidenceRouter.patch('/:id/status', requireRol('admin', 'encargado'), updateIncidenceStatus);

export const incidenceRoutes = incidenceRouter;

// APIS PARA EMPLEADOS
// ===================
// /api/employees
export const employeesRoutes = employeeRoutes;