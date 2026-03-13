import type { AuthRequest } from "../middlewares/auth.middleware.js";
import { IncidenceRepository } from "../repository/incidence.repository.js";
import type { Response, Request } from "express";




const incidenceRepository = new IncidenceRepository();


// OBTENER LAS INCIDENCIAS
// get /api/incidences
export const getIncidences = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        res.json(await incidenceRepository.findAllIncidences());
    } catch (error) {
        res.status(500).json({message: 'Error getting incidences'});
    }
}

// get /api/incidences/:id
export const getIncidenceById = async (req:AuthRequest, res: Response): Promise<void> => {
    const {id} = req.params as {id: string}
    try {
        const incidence = await incidenceRepository.findIncidenceById(id);
        if(!incidence) {
            res.status(404).json({message: 'Incidence not found'});
            return;
        }

        res.json(incidence);
    } catch (error) {
        res.status(500).json({message: 'Error getting incidence'});
    }
}

// get /api/incidences/order/:orderId
export const getIncidenceByOrderId = async (req: AuthRequest, res: Response): Promise<void> => {
    const {orderId} = req.params as {orderId: string}
    try {
        const incidence = await incidenceRepository.findIncidenceByOrder(orderId);
        if(!incidence) {
            res.status(404).json({message: 'Incidence not found for that order ID'});
            return;
        }

        res.json(incidence);
        
    } catch (error) {
        res.status(500).json({message: 'Error getting that order incidences'});
    }
}


// CREAR INCIDENCIAS
// post /api/incidences -> cualquier empleado que esté autenticado
export const createIncidence = async (req: AuthRequest, res: Response): Promise<void> => {
    const {orderId, providerId, type, description} = req.body;
    if(!orderId || !providerId || !type || !description) {
        res.status(400).json({message: 'Inputs left'});
        return;
    }

    try {
        const newIncidence = await incidenceRepository.createIncidence(req.body, req.employee!.id);
        res.status(201).json(newIncidence);
    } catch (error) {
        res.status(500).json({message: 'Error trying to create a new incidence'});
    }
}

// patch /api/incidences/:id/status -> solo admin/encargado
export const updateIncidenceStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    const {status} = req.body;
    const validStatus = ['open', 'in progress', 'resolved'];
    if(!status || !validStatus.includes(status)) {
        res.status(400).json({message: 'Invalid status'});
        return;
    }

    try {
        const {id} = req.params as {id: string}
        const updatedIncidence = await incidenceRepository.updateIncidenceStatus(id, {status});
        if(!updatedIncidence) {
            res.status(404).json({message: 'Incidence not found'});
            return;
        }

        res.json(updatedIncidence);
    } catch (error) {
        res.status(500).json({message: 'Error trying to update incidence'});
    }
}