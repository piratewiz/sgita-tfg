import type { CreateProductDto, UpdateProductDto } from "../dtos/product.dto.js";
import type { OrderStatus } from "../models/Order.js";
import type { IProduct, ProductStatus } from "../models/Product.js";
import Product from "../models/Product.js";



export class ProductRepository {


    async findAll(): Promise<IProduct[]> {
        return Product.find()
            .select('name category productCode unitType quantity minStock status expirationDate providerId updatedAt')
            .populate('providerId', 'name')
            .sort({name: 1 })
            .lean() as unknown as IProduct[];
    }

    async findById(id: string): Promise<IProduct | null> {
        return Product.findById(id).populate('providerId', 'name');
    }

    async findByCode(code: string): Promise<IProduct | null> {
        return Product.findOne({productCode: code});
    }

    async findMinStock(): Promise<IProduct[]> {
        return Product.find({$expr: {$lte: ['$quantity', '$minStock']}}).populate('providerId', 'name');
    }

    async findByStatus(status: OrderStatus): Promise<IProduct[]> {
        return Product.find({status}).populate('providerId', 'name');
    }

    async create(data: CreateProductDto): Promise<IProduct> {
        return Product.create(data);
    }

    async update(id: string, data: UpdateProductDto): Promise<IProduct | null> {
        return Product.findByIdAndUpdate(id, data, {new: true});
    }

    async addProductsToStock(id: string, quantity: number): Promise<IProduct | null> {
        return Product.findByIdAndUpdate(
            id,
            {$inc: {quantity}, updatedAt: new Date()},
            {new: true}
        )
    }

    async bulkAddProductsToStock(items: {productId: string; quantity: number }[]): Promise<void> {
        const validItems = items.filter((item) => item.productId && Number(item.quantity) > 0);
        if(validItems.length === 0) return;

        const now = new Date();
        await Product.bulkWrite(
            validItems.map((item) => ({
                updateOne: {
                    filter: {_id: item.productId},
                    update: {$inc: {quantity: Number(item.quantity)}, $set: {updatedAt: now}},
                },
            }))
        );
    }

    async updateStatus(id: string, status: ProductStatus): Promise<IProduct | null> {
        return Product.findByIdAndUpdate(id, {status, updatedAt: new Date()}, {new: true});
    }

    async updateStatusExpiredProducts(): Promise<void> {
        const today = new Date();
        const threeDaysLater = new Date();
        threeDaysLater.setDate(today.getDate() + 3); 
        const now = new Date();

        await Promise.all([
            Product.updateMany(
            {expirationDate: {$lt: today}},
            {status: 'expired', updatedAt: new Date()}),
            Product.updateMany(
            {expirationDate: {$gte: today, $lte: threeDaysLater}},
            {status: 'soon_expire', updatedAt: new Date()}),
            Product.updateMany(
            {expirationDate: {$gt: threeDaysLater}},
            {status: 'fresh', updatedAt: new Date()})
        ])
    }

    async delete(id: string): Promise<IProduct | null> {
        return Product.findByIdAndDelete(id);
    }
    
}