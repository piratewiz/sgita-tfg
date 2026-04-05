import {Schema, model, Document, Types} from 'mongoose';

export type IncidenceType = 'incorrect quantity' | 'expired product' | 'damaged product' | 'other';
export type IncidenceStatus = 'open' | 'in progress' | 'resolved';

export interface IIncidence extends Document {
    orderId: Types.ObjectId;
    providerId: Types.ObjectId;
    employeeId: Types.ObjectId;
    type: IncidenceType;
    description: string;
    status: IncidenceStatus;
    createdAt: Date;
}

const IncidenceSchema = new Schema<IIncidence>({
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider', required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Empleado', required: true },
    type: {type: String, enum: ['incorrect quantity', 'expired product', 'damaged product', 'other'], required: true},
    description: {type: String, required: true, trim: true, maxlength: 200},
    status: {type: String, enum: ['open', 'in progress', 'resolved'], default: 'open'},
    createdAt: {type: Date, default: Date.now}
}, 
    {versionKey: false}
);

export default model<IIncidence>('Incidence', IncidenceSchema);