import {Schema, model, Document} from 'mongoose';

export interface IProvider extends Document {
    name: string;
    contact: string;
    phoneNumber: string;
    email: string;
    active: boolean;
}

const ProviderSchema = new Schema<IProvider>({
    name: {type: String, required: true, trim: true},
    contact: {type: String, required: true, trim: true},
    phoneNumber: {type: String, required: true, trim: true},
    email: {type: String, required: true, unique: true, lowercase: true, trim: true},
    active: {type: Boolean, default: true}
},
{timestamps: false, versionKey: false}
);

export default model<IProvider>('Proveedor', ProviderSchema);