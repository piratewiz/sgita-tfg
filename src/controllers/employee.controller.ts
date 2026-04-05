import type { Request, Response } from 'express';
import Employee from '../models/Employee.js';

// get /api/employees
export const getEmployees = async (req: Request, res: Response): Promise<void> => {
    try {
        const employees = await Employee.find().select('-password -resetToken -resetTokenExpiry');
        res.json(employees);
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Error getting employees'});
    }
};