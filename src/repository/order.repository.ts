import type { CreateOrderDto } from "../dtos/order.dto.js";
import type { IOrder } from "../models/Order.js";
import Order from "../models/Order.js";
import type { IOrderProduct } from "../models/OrderProduct.js";
import OrderProduct from "../models/OrderProduct.js";



export class OrderRepository {

    async findAll(): Promise<IOrder[]> {
        return Order.find().populate('providerId', 'name').populate('truckId', 'licencePlate model').populate('employeeId', 'name surname')
    }

    async findById(id: string): Promise<IOrder | null> {
        return Order.findById(id).populate('providerId', 'name email phoneNumber').populate('truckId', 'licencePlate model').populate('employeeId',  'name surname numberEmployee')
    }

    async findOrderByStatus(status: string): Promise<IOrder[]> {
        return Order.find({status}).populate('providerId', 'name').populate('truckId', 'licencePlate')
    }

    async findOrderByNumber(orderNumber: string): Promise<IOrder | null> {
        return Order.findOne({orderNumber})
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
            {new: true}
        )
    }

    async createOrderLines(orderId: string, lines: {productId: string, expectedQuantity: number}[]): Promise<IOrderProduct[]> {
        const documents = lines.map((line) => ({...line, orderId}));
        return OrderProduct.insertMany(documents);
    }

    async findOrderLines(orderId: string): Promise<IOrderProduct[]> {
        return OrderProduct.find({orderId}).populate('productId', 'name codeProduct unityType')
    }
}