import type { CreateIncidenceDto, UpdateIncidenceDto } from "../dtos/incidence.dto.js";
import type { IIncidence } from "../models/Incidence.js";
import Incidence from "../models/Incidence.js";



export class IncidenceRepository {

    async findAllIncidences(): Promise<IIncidence[]> {
        return Incidence.find()
            .select('orderId providerId employeeId type description status createdAt')
            .populate('orderId', 'numberOrder')
            .populate('providerId', 'name')
            .populate('employeeId', 'name surname')
            .sort({ createdAt: -1 })
            .lean() as unknown as IIncidence[];
    }

    async findIncidenceById(id: string): Promise<IIncidence | null> {
        return Incidence.findById(id).populate('orderId', 'numberOrder status').populate('providerId', 'name email phoneNumber').populate('employeeId', 'name surname numberEmployee')
    }

    async findIncidenceByOrder(orderId: string): Promise<IIncidence | null> {
        return Incidence.findOne({orderId}).populate('providerId', 'name').populate('employeeId', 'name surname').lean()
    }

    async findIncidenceByStatus(status: string): Promise<IIncidence[]> {
        return Incidence.find({status}).populate('orderId', 'numberOrder').populate('providerId', 'name')
    }

    async createIncidence(data: CreateIncidenceDto, employeeId: string): Promise<IIncidence> {
        return Incidence.create({...data, employeeId})
    }

    async updateIncidenceStatus(id: string, data: UpdateIncidenceDto): Promise<IIncidence | null> {
        return Incidence.findByIdAndUpdate(id, data, {returnDocument: 'after'});
    }
}