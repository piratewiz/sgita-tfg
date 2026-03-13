import type { Response, Request } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import { ProviderRepository } from "../repository/provider.repository.js";
import { TruckRepository } from "../repository/truck.repository.js";




const providerRepository = new ProviderRepository();
const truckRepository = new TruckRepository();


// USO DE CONTROLADORES PARA LOS PROVEEDORES
// -----------------------------------------
export const getProviders = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const data = await providerRepository.findAll();
        res.json(data);
    } catch (error) {
        res.status(500).json({message: 'Error obtaining providers'})
    }
};

export const getProviderById = async(req: Request<{id: string}>, res: Response): Promise<void> => {
    try {
        const provider = await providerRepository.findById(req.params.id);
        if(!provider) {
            res.status(404).json({message: 'Provider not found!'});
            return;
        }

        res.json(provider);
    } catch (error) {
        res.status(500).json({message: 'Error obtaining provider'})
    }
}


export const createProvider = async (req:AuthRequest, res: Response): Promise<void> => {
    const {name, contact, phoneNumber, email} = req.body;
    if(!name || !contact || !phoneNumber || !email) {
        res.status(400).json({message: 'Inputs left!'});
        return;
    }

    try {
        const exists = await providerRepository.findByEmail(email);
        if(exists) {
            res.status(409).json({message: 'Provider email already exists!'})
            return;
        }

        const newProvider = await providerRepository.create(req.body);
        res.status(201).json(newProvider);
    } catch (error) {
        res.status(500).json({message: 'Error loading provider!'});
    }
}

export const updateProvider = async (req: Request<{id: string}>, res: Response): Promise<void> => {
    try {
        const updated = await providerRepository.update(req.params.id, req.body);
        if(!updated) {
            res.status(404).json({message: 'Provider not found'});
            return;
        }

        res.json(updated);
    } catch (error) {
        res.status(500).json({message: 'Error updating provider'});
    }
}


export const deleteProvider = async (req: Request<{id: string}>, res: Response): Promise<void> => {
    try {
        const desactivated = await providerRepository.desactivate(req.params.id);
        if(!desactivated) {
            res.status(404).json({message: 'Provider not found'});
        }

        res.json({message: 'Provider correctly desactivated'});
    } catch (error) {
        res.status(500).json({message: 'Error desactivating provider'});
    }
}


// USO DE CONTROLADORES PARA LOS CAMIONES
// --------------------------------------

export const getTrucks = async(_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const data = await truckRepository.findAll();
        res.json(data)
    } catch (error) {
        res.status(500).json({message: 'Error getting trucks'});
    }
}

export const getTruckById = async(req: Request<{id: string}>, res: Response): Promise<void> => {
    try {
        const truck = await truckRepository.findById(req.params.id);
        if(!truck) {
            res.status(404).json({message: 'Truck not found'});
            return;
        }

        res.json(truck);
    } catch (error) {
        res.status(500).json({message: 'Error getting this truck'});
    }
}

export const createTruck = async(req: AuthRequest, res: Response): Promise<void> => {
    const {licencePlate, model} = req.body;
    if(!licencePlate || !model) {
        res.status(400).json({message: 'Inputs left!'});
        return;
    }

    try {
        const exists = await truckRepository.findByLicencePlate(licencePlate);
        if(exists) {
            res.status(409).json({message: 'Licence Plate already registered'});
            return;
        }

        const newTruck = await truckRepository.create(req.body);
        res.status(201).json(newTruck);
    } catch (error) {
        res.status(500).json({message: 'Error creating truck'});
    }
}

export const updateTruck = async(req: Request<{id: string}>, res: Response): Promise<void> => {
    try {
        const updated = await truckRepository.update(req.params.id, req.body);
        if(!updated) {
            res.status(404).json({message: 'Truck not found'});
            return;
        }

        res.json(updated);
    } catch (error) {
        res.status(500).json({message: 'Error trying to update this truck',  err: error});
    }
}


export const deleteTruck = async (req: Request<{id: string}>, res: Response): Promise<void> => {
    try {
        const {id} = req.params;
        if(!id) {
            res.status(400).json({message: 'Truck ID is required'});
            return;
        }

        const deleted = await truckRepository.desactivate(id);
        if(!deleted) {
            res.status(404).json({message: 'Truck not found'});
            return;
        }

        res.json({message: 'Truck has been deleted successfully'});
    } catch {
        res.status(500).json({message: 'Truck has been deactivated'});
        
    }
}