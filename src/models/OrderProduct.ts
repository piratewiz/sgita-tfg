import {Schema, model, Document, Types} from 'mongoose';

export interface IOrderProduct extends Document {
    orderId: Types.ObjectId;
    productId: Types.ObjectId;
    expectedQuantity: number;
    receivedQuantity: number;
    scannedCode: string;
    expiredDate: Date;
}

const OrderProductSchema = new Schema<IOrderProduct>({
    orderId: {type: Schema.Types.ObjectId, ref: 'Order', required: true},
    productId: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
    expectedQuantity: {type: Number, required: true, min: 0},
    receivedQuantity: {type: Number, min: 0},
    scannedCode: {type: String, trim: true},
    expiredDate: {type: Date}
}, {
    timestamps: true, versionKey: false
});

OrderProductSchema.index({orderId: 1});
OrderProductSchema.index({orderId: 1, productId: 1});

export default model<IOrderProduct>('OrderProduct', OrderProductSchema)