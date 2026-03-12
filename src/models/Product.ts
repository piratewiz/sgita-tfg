import {Schema, model, Document, Types} from 'mongoose';

export type ProductStatus = 'fresh' | 'soon_expire' | 'expired';
export type UnitType = 'kg' | 'gram' | 'liter' | 'box' | 'unit';

export interface IProduct extends Document {
    name: string;
    category: string;
    productCode: string;
    unitType: UnitType;
    quantity: number;
    minStock: number;
    status: ProductStatus;
    expirationDate: Date;
    providerId: Types.ObjectId;
    updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
    name: {type: String, required: true, trim: true},
    category: {type: String, required: true, trim: true},
    productCode: {type: String, required: true, unique: true, trim: true},
    unitType: {type: String, required: true, enum: ['kg', 'gram', 'liter', 'box', 'unit']},
    quantity: {type: Number, required: true, min: 0},
    minStock: {type: Number, required: true, min: 0, default: 0},
    status: {type: String, required: true, enum: ['fresh', 'soon_expire', 'expired'], default: 'fresh'},
    expirationDate: {type: Date, required: true},
    providerId: {type: Schema.Types.ObjectId, ref: 'Provider', required: true},
    updatedAt: {type: Date, default: Date.now}
},
{timestamps: false, versionKey: false}
);

ProductSchema.pre('save', async function(){
    this.updatedAt = new Date();
});

export default model<IProduct>('Product', ProductSchema);

