import {Schema, model, Document} from 'mongoose';

export type Rol = 'admin' | 'encargado' | 'empleado';

export interface IEmployee extends Document {
    name: string;
    surname: string;
    dni: string;
    nss: string;
    numberEmployee: string;
    rol: Rol;
    email: string;
    password: string;
    active: boolean;
    createdAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>({
    name: {type: String, required: true, trim: true},
    surname: {type: String, required: true, trim: true},
    dni: {type: String, required: true, unique: true, trim: true},
    nss: {type: String, required: true, unique: true, trim: true},
    numberEmployee: {type: String, required: true, unique: true, trim: true},
    rol: {type: String, required: true, enum: ['admin', 'encargado', 'empleado']},
    email: {type: String, required: true, unique: true, lowercase: true, trim: true},
    password: {type: String, required: true},
    active: {type: Boolean, default: true},
    createdAt: {type: Date, default: Date.now}
},
{timestamps: false, versionKey: false}
);

export default model<IEmployee>('Empleado', EmployeeSchema);