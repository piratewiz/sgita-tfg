import { Types } from "mongoose";
import type { CreateOrderDto, ReceptionLineDto } from "../dtos/order.dto.js";
import type { IOrder } from "../models/Order.js";
import Order from "../models/Order.js";
import type { IOrderProduct } from "../models/OrderProduct.js";
import OrderProduct from "../models/OrderProduct.js";



export class OrderRepository {

    async findAll(): Promise<IOrder[]> {
        return Order.find().select('numberOrder providerId truckId employeeId dateArriveOrder status createdAt').populate('providerId', 'name').populate('truckId', 'licencePlate truckModel').populate('employeeId', 'name surname').sort({dateArriveOrder: -1}).lean() as unknown as IOrder[];
    }

    async findById(id: string): Promise<IOrder | null> {
        return Order.findById(id)
            .select('numberOrder providerId truckId employeeId dateArriveOrder dateRealReception status createdAt')
            .populate('providerId', 'name email phoneNumber')
            .populate('truckId', 'licencePlate truckModel')
            .populate('employeeId',  'name surname numberEmployee');
    }

    async findOrderByStatus(status: string): Promise<IOrder[]> {
        return Order.find({status})
            .select('numberOrder providerId truckId dateArriveOrder status createdAt')
            .populate('providerId', 'name')
            .populate('truckId', 'licencePlate truckModel')
            .sort({ dateArriveOrder: -1 })
            .lean() as unknown as IOrder[];
    }

    async findOrderByNumber(orderNumber: string): Promise<IOrder | null> {
        return Order.findOne({ numberOrder: orderNumber });
    }

    async create(data: CreateOrderDto, employeeId: string): Promise<IOrder> {
        return Order.create({
            numberOrder: data.orderNumber,
            providerId: data.providerId,
            truckId: data.truckId,
            employeeId,
            dateArriveOrder: data.previsionArrivalDate,
            documentUrl: data.documentUrl!,
            status: 'pending'
        })
    }

    async updateOrderStatus(id: string, status: string, dateRealReception?: Date): Promise<IOrder | null> {
        return Order.findByIdAndUpdate(
            id,
            {status, ...(dateRealReception && {dateRealReception})},
            {returnDocument: 'after'}
        )
    }

    async createOrderLines(orderId: string, lines: {productId: string, expectedQuantity: number}[]): Promise<IOrderProduct[]> {
        if(lines.length === 0) return [];

        const documents = lines.map((line) => ({...line, orderId: new Types.ObjectId(orderId)}))
        return OrderProduct.insertMany(documents, {lean: true}) as unknown as IOrderProduct[];
    }

    async findOrderLines(orderId: string): Promise<IOrderProduct[]> {
        return OrderProduct.find({orderId}).select('orderId productId expectedQuantity receivedQuantity scannedCode expiredDate').populate('productId', 'name productCode unitType').lean() as unknown as IOrderProduct[];
    }

    async registerReceptionLines(orderId: string, line: ReceptionLineDto): Promise<IOrderProduct | null> {
        return OrderProduct.findOneAndUpdate(
            { orderId, productId: line.productId},
            {
                receivedQuantity: line.receivedQuantity,
                scannedCode: line.scannedCode,
                expiredDate: new Date(line.expirationDate),
            },
            {returnDocument: 'after'}
        )
    }


    async diferences(orderId: string): Promise<boolean> {
        const difference = await OrderProduct.exists({
            orderId,
            receivedQuantity: {$exists: true, $ne: null},
            $expr: {$ne: ["$receivedQuantity", "$expectedQuantity"]}
        })
        return !!difference;
    }

    async findByDate(date: string): Promise<IOrder[]> {
        const start = new Date(date)
        const end = new Date(date)

        end.setDate(end.getDate() + 1);
        return Order.find({createdAt: {$gte: start, $lt: end}}).populate('providerId', 'name').populate('truckId', 'licencePlate')
    }
}