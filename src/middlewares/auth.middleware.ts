import jwt from 'jsonwebtoken';
import { AuthRepository } from '../repository/auth.repository.js';
import type { Rol } from '../models/Employee.js';
import type { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
    employee?: {
        id: string;
        rol: Rol;
        email: string;
    }
}

interface JwtPayLoad {
    id: string;
    rol: Rol;
    email: string;
}

const repo = new AuthRepository();

// --- Verificamos JWT
export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction):Promise<void> => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1]

    if(!token) {
        res.status(401).json({message: 'No token provided'});
        return;
    }

    try {
        const secret = process.env.JWT_SECRET!;
        const payload = jwt.verify(token, secret) as JwtPayLoad;

        const employee = await repo.findById(payload.id);
        if(!employee || !employee.active) {
            res.status(401).json({message: 'Invalid token or inactive employee'});
            return;
        }

        req.employee = {id: payload.id, rol: payload.rol, email: payload.email};
        next();
    } catch (error) {
        res.status(401).json({message: 'Expired token or invalid token'});   
    }
}

export const requireRol = (...roles: Rol[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if(!req.employee) {
            res.status(401).json({message: 'Not authenticated'});
            return;
        }

        if(!roles.includes(req.employee.rol)) {
            res.status(403).json({
                message: `Acess denied. Required roles: ${roles.join(', ')}`
            })
            return;
        }
        next();
    }
}