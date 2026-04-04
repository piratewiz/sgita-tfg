import {Schema, model, Document, Types} from 'mongoose'

export type BatchStatus = 'fresh' | 'soon to expire' | 'expired'

export interface IBatch extends Document {
    batchCode: string; // será el código introducido de forma manual por el empleado
    orderId: Types.ObjectId;
    productId: Types.ObjectId;
    employeeId: Types.ObjectId;
    unitQuantity: number; // unidades dentro de la caja/paquete
    expireDate: Date;
    status: BatchStatus;
    registeredAt: Date;
}

const BatchSchema = new Schema<IBatch>(
    {
        batchCode: {type: String, required: true, trim: true},
        orderId: {type: Schema.Types.ObjectId, ref: 'Order', required: true},
        productId: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
        employeeId: {types: Schema.Types.ObjectId, ref: 'Employee', required: true},
        unitQuantity: {type: Number, required: true, min: 1},
        expireDate: {type: Date, required: true},
        status: {type: String, enum: ['fresh', 'soon to expire', 'expired'], default: 'fresh'},
        registeredAt: {type: Date, default: Date.now},
    },
    {versionKey: false}
);

// para que no se repita el mismo código de lote dentro del mismo pedido
BatchSchema.index({batchCode: 1, orderId: 1}, {unique: true});

export default model<IBatch>('Batch', BatchSchema);