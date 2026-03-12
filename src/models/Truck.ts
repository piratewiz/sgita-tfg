import {Schema, model, Document} from 'mongoose';

export interface ITruck extends Document {
    licencePlate: string;
    truckModel: string;
    active: boolean;
}

const TruckSchema = new Schema<ITruck>({
    licencePlate: {type: String, required: true, unique: true},
    truckModel: {type: String, required: true, trim: true},
    active: {type: Boolean, default: true}
},
{
    timestamps: true, versionKey: false
})

export default model<ITruck>('Truck', TruckSchema);