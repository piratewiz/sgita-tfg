import type { CreateTruckDto, UpdateTruckDto } from "../dtos/truck.dto.js";
import type { ITruck } from "../models/Truck.js";
import Truck from "../models/Truck.js";



export class TruckRepository {


    async findAll(): Promise<ITruck[]> {
        return Truck.find({active: true}).sort({licencePlate: 1});
    }

    async findById(id: string): Promise<ITruck | null> {
        return Truck.findById(id);
    }

    async findByLicencePlate(licencePlate: string): Promise<ITruck | null > {
        return Truck.findOne({ licencePlate: licencePlate.toUpperCase() });
    }

    async create(data: CreateTruckDto): Promise<ITruck> {
        return Truck.create({...data, licencePlate: data.licencePlate.toUpperCase() });
    }

    async update(id: string, data: UpdateTruckDto): Promise<ITruck | null> {
        return Truck.findByIdAndUpdate(id, data, { returnDocument: 'after' });
    }

    async desactivate(id: string): Promise<ITruck | null> {
        return Truck.findByIdAndUpdate(id, {active: false}, {returnDocument: 'after'});
    }
    

    
}