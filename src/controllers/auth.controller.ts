import { AuthRepository } from "../repository/auth.repository.js";
import bcrypt from "bcryptjs";
import * as cryptoNode from 'node:crypto';
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import type { LoginDto, RegisterEmployeeDto } from "../dtos/auth.dto.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import Employee from "../models/Employee.js";
import { sendResetEmail } from "../config/mailer.js";


const repo = new AuthRepository();

const generateToken = (id: string, rol: string, email: string): string => {
    const expiresIn = process.env.JWT_EXPIRES_IN ?? '1h';
    return jwt.sign({id, rol, email}, process.env.JWT_SECRET!, { expiresIn } as Parameters<typeof jwt.sign>[2]);
}


export const login = async(req: Request, res: Response): Promise<void> => {
    const {email, password}: LoginDto = req.body;

    if(!email || !password) {
        res.status(400).json({message: 'Email and password are required'});
        return;
    }

    try {
        const employee = await repo.findByEmail(email);

        if(!employee || !employee.active) {
            res.status(401).json({message: 'Invalid credentials'});
            return;
        }

        const passwordMatch = await bcrypt.compare(password, employee.password);
        if(!passwordMatch) {
            res.status(401).json({message: 'Invalid credentials'});
            return;
        }

        const token = generateToken(
            employee._id.toString(),
            employee.rol,
            employee.email
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            employee: {
                id: employee._id,
                name: employee.name,
                surname: employee.surname,
                email: employee.email,
                rol: employee.rol,
                numberEmployee: employee.numberEmployee

            }
        })
    } catch (error) {
        res.status(500).json({message: 'Internal server error'});
    }
}


export const register = async(req: AuthRequest, res: Response): Promise<void> => {
    const data: RegisterEmployeeDto = req.body;

    const requireds: (keyof RegisterEmployeeDto)[] = [
        'name', 'surname', 'dni', 'nss', 'numberEmployee', 'rol', 'email', 'password'
    ]

    const missingFields = requireds.filter(field => !data[field]);
    if(missingFields.length > 0 ) {
        res.status(400).json({message: `Missing fields: ${missingFields.join(', ')}`});
        return;
    }

    if((data.rol as string) === 'admin') {
        res.status(400).json({message: 'Cannot create an employee with admin role'});
        return;
    }

    try {
        const duplicated = await repo.existsDuplicate(data);
        if(duplicated) {
            res.status(409).json({message: duplicated});
            return;
        }

        // hashear contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(data.password, salt);

        const newEmployee = await repo.create({...data, password: passwordHash});

        res.status(201).json({
            message: 'Employee registered successfully',
            employee: {
                id: newEmployee._id,
                name: newEmployee.name,
                surname: newEmployee.surname,
                email: newEmployee.email,
                rol: newEmployee.rol,
                numberEmployee: newEmployee.numberEmployee
            }
        })
    } catch (error) {
        res.status(500).json({message: 'Internal server error'});
    }
};


export const me = async(req: AuthRequest, res: Response): Promise<void> => {
    try {
        const employee = await repo.findById(req.employee!.id);
        if(!employee) {
            res.status(404).json({message: 'Employee not found'});
            return;
        }

        res.status(200).json({
            employee: {
                id: employee._id,
                name: employee.name,
                surname: employee.surname,
                email: employee.email,
                rol: employee.rol,
                numberEmployee: employee.numberEmployee
            }
        });

    } catch(error) {
        res.status(500).json({message: 'Internal server error'});
    }
}


export const logout = async(_req: Request, res: Response): Promise<void> => {
    res.status(200).json({message: 'Session closed. Delete clients token'});
}


// post /api/auth/forgot-password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const {email} = req.body;

    if(!email) {
        res.status(400).json({message: 'Email obligatorio'});
        return;
    }

    try {
        const employee = await repo.findByEmail(email);

        if(!employee || !employee.active) {
            res.status(200).json({message: 'Si el email existe, recibirás a tu correo un enlace'});
            return;
        }

        const token     = cryptoNode.randomBytes(32).toString('hex');
        const expiry  = new Date(Date.now() + 60 * 60 * 1000); // 1 hora para un sólo uso


        // guardamos token hasheado en la base de datos
        const tokenHash = cryptoNode.createHash('sha256').update(token).digest('hex');
        await Employee.findByIdAndUpdate(employee._id, {
            resetToken: tokenHash,
            resetTokenExpiry: expiry,
        });

        // enlace para resetear
        const resetUrl = `${process.env.APP_URL}/reset-password.html?token=${token}`;

        // enviar email
        await sendResetEmail(employee.email, employee.name, resetUrl);
 
        res.status(200).json({ message: 'Si el email existe, recibirás un enlace en breve' });
        
    } catch (error) {
        console.error('[forgotPassword]', error);
        res.status(500).json({message: 'Error interno del servidor'});
    }
}


// post /api/auth/reset-password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    const {token, password} = req.body;

    if(!token || !password) {
        res.status(400).json({message: 'El token y la nueva contraseña con obligatorios'});
        return;
    }

    if(password.length < 6) {
        res.status(400).json({message: 'La contraseña debe tener al menos 6 caracteres.'});
        return;
    }

    try {
        const tokenHash = cryptoNode.createHash('sha256').update(token).digest('hex');

        const employee = await Employee.findOne({
            resetToken: tokenHash,
            resetTokenExpiry: {$gt: new Date()},
        });

        if(!employee) {
            res.status(400).json({message: 'Enlace inválido o caducado'});
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await Employee.findByIdAndUpdate(employee._id, {
            password: passwordHash,
            resetToken: undefined,
            resetTokenExpiry: undefined,
        });

        res.status(200).json({message: 'La contraseña se ha actualizado correctamente.'});
    } catch (error) {
        console.error('[resetPassword]', error);
        res.status(500).json({message: 'Error interno del servidor'});
    }
}