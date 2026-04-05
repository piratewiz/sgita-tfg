import {Schema, model, Document, Types} from 'mongoose';

export type OrderStatus = 'pending' | 'received' | 'incidence';

export interface IOrder extends Document {
    numberOrder: string;
    providerId: Types.ObjectId;
    truckId: Types.ObjectId;
    employeeId: Types.ObjectId;
    dateArriveOrder: Date;
    dateRealReception: Date;
    status: OrderStatus;
    documentUrl?: string;
    createdAt: Date;
}

const OrderSchema = new Schema<IOrder>({
    numberOrder: {type: String, required: true, unique: true, trim: true},
    providerId: {type: Schema.Types.ObjectId, ref: 'Provider', required: true},
    truckId: {type: Schema.Types.ObjectId, ref: 'Truck', required: true},
    employeeId: {type: Schema.Types.ObjectId, ref: 'Empleado', required: true},
    dateArriveOrder: {type: Date, required: true},
    dateRealReception: {type: Date},
    status: {type: String, enum: ['pending', 'received', 'incidence'], default: 'pending'},
    documentUrl: {type: String, trim: true},
    createdAt: {type: Date, default: Date.now}
},
{versionKey: false});

export default model<IOrder>('Order', OrderSchema);