import type { CreateProviderDto, UpdateProviderDto } from "../dtos/provider.dto.js";
import Provider, {type IProvider} from "../models/Provider.js";

export class ProviderRepository {


    async findAll(): Promise<IProvider[]> {
        return Provider.find({active: true}).sort({name: 1})
    }

    async findById(id: string): Promise<IProvider | null> {
        return Provider.findById(id);
    }

    async findByEmail(email: string): Promise<IProvider | null> {
        return Provider.findOne({email: email.toLowerCase()});
    }

    async create(data: CreateProviderDto): Promise<IProvider> {
        return Provider.create({...data, email: data.email.toLowerCase()});
    }

    async update(id: string, data: UpdateProviderDto): Promise<IProvider | null> {
        return Provider.findByIdAndUpdate(id, data, {new: true});
    }

    async desactivate(id: string): Promise<IProvider | null> {
        return Provider.findByIdAndUpdate(id, {active: false}, {new: true});
    }
}