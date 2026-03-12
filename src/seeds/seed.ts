import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Employee } from '../models/index.js';
import connectDB from '../config/database.js';


await connectDB();
await Employee.create({
    name: 'Esteban', surname: 'García',
    dni: '12345678A', nss: '12345678901',
    numberEmployee: '332778', rol: 'admin',
    email: 'esteban.garcia@gmail.com',
    password: await bcrypt.hash('password561', 10)
})