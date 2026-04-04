// importar express
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import { incidenceRoutes, orderRoutes, productRoutes, providerRoutes, truckRoutes } from './routes/index.routes.js';
import { getBatchByOrder } from './controllers/batch.controller.js';
import { batchRouterStatus } from './routes/batch.routes.js';
import { initCron } from './config/cron.js';

dotenv.config();

// pendiente actualizar nuevas rutas y acceso a servicios

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/orders', getBatchByOrder); // /api/orders/:orderId/lots
app.use('/api/lots', batchRouterStatus); // /api/lots/status/:status
app.use('/api/products', productRoutes);
app.use('/api/incidences', incidenceRoutes);

app.get('/api/health', (_req, res) => {
    res.json({status: 'ok', message: 'Server is running'});
})

app.use((_req, res) => {
    res.status(404).json({message: 'Endpoint not found'});
})

connectDB().then(() => {
    initCron(); // controlamos automáticamente la caducidad del producto
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    })
})


