// importar express
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.routes.js';

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

app.get('/api/health', (req, res) => {
    res.json({status: 'ok', message: 'Server is running'});
})

app.use((_req, res) => {
    res.status(404).json({message: 'Endpoint not found'});
})

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    })
})


