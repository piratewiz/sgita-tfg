import { AuthRepository } from "../repository/auth.repository.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import type { LoginDto, RegisterEmployeeDto } from "../dtos/auth.dto.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";


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