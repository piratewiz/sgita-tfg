import type { Response, Request } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import { IncidenceRepository } from "../repository/incidence.repository.js";
import { OrderRepository } from "../repository/order.repository.js";
import { ProductRepository } from "../repository/product.repository.js";
import type { CreateOrderDto, ReceptionOrderDto } from "../dtos/order.dto.js";





const orderRepository = new OrderRepository();
const productRepository = new ProductRepository();
const incidenceRepository = new IncidenceRepository();


// PARA OBTENER LOS PEDIDOS
// get /api/orders
export const getOrders = async(_req: AuthRequest, res: Response): Promise <void> => {
    try {
        const data = await orderRepository.findAll();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({message: 'Error getting orders'});
    }
}


// get /api/orders/:id
export const getOrderById = async (req: Request<{id: string}>, res: Response): Promise<void> => {
    try {
        const order = await orderRepository.findById(req.params.id);
        if(!order) {
            res.status(404).json({message: 'Order not found'});
            return;
        }

        const lines = await orderRepository.findOrderLines(req.params.id);
        res.json({...order.toObject(), lines})
    } catch (error) {
        res.status(500).json({message: 'Error getting order'});
    }
}


// get /api/orders/status/:status
export const getOrdersByStatus = async (req: Request<{status: string}>, res: Response): Promise<void> => {
    try {
        const data = await orderRepository.findOrderByStatus(req.params.status);
        res.json(data);
    } catch (error) {
        res.status(500).json({message: 'Error filtering orders'});
    }
}


// PARA CREAR LOS PEDIDOS
// post /api/orders -> sólo admin (el encargado)
export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    const data: CreateOrderDto = req.body;
    const {orderNumber, providerId, truckId, previsionArrivalDate, lines} = data;

    if(!orderNumber || !providerId || !truckId || !previsionArrivalDate || !lines?.length) {
        res.status(400).json({message: 'Inputs left'});
        return;
    }

    try {
        const exists = await orderRepository.findOrderByNumber(orderNumber);
        if(exists) {
            res.status(409).json({message: 'Order number already registered'});
            return;
        }

        const order = await orderRepository.create(data, req.employee!.id);
        const orderId = order._id.toString();
        await orderRepository.createOrderLines(orderId, lines);

        const createdLines = await orderRepository.findOrderLines(orderId);
        res.status(201).json({...order.toObject(), lines: createdLines});
    } catch (error) {
        res.status(500).json({message: 'Error creating the order'});
    }
}


// post /api/orders/:id/reception
// el empleado registra lo que llega realmente del camión/furgoneta
export const registerReception = async(req: AuthRequest, res: Response): Promise<void> => {
    const {id} = req.params as {id: string}
    const {lines}: ReceptionOrderDto = req.body;

    if(!lines?.length) {
        res.status(400).json({message: 'Should register at least 1 line'});
        return;
    }

    try {
        const order = await orderRepository.findById(id);
        if(!order) {
            res.status(404).json({message: 'Order not found'});
            return;
        }

        if(order.status === 'received') {
            res.status(400).json({message: 'This order has been received already'});
            return;
        }

        // con esto registramos la línea recibida y actualizamos stock
        await Promise.all(
            lines.map(async (line) => {
                const updated = await orderRepository.registerReceptionLines(id, line);

                if(!updated) {
                    throw new Error(`Product ${line.productId} does not belong to ${id}`)
                }

                await Promise.all([
                    productRepository.addProductsToStock(line.productId, line.receivedQuantity),
                    productRepository.update(line.productId, {expirationDate: line.expirationDate}),
                ])
            })
        )

        const hasDifferences = await orderRepository.diferences(id);
        const newStatus = hasDifferences ? 'incidence' : 'received';
        const updatedOrder = await orderRepository.updateOrderStatus(id, newStatus, new Date());

        // si hay incidencia, crearla automáticamente
        if(hasDifferences) {
            await incidenceRepository.createIncidence(
                {
                    orderId: id,
                    providerId: order.providerId.toString(),
                    type: 'incorrect quantity',
                    description: 'Detected some diferences automatically between expected quantity and received',
                },
                req.employee!.id
            );
        }

        res.json({
            message: hasDifferences ? 'Reception registered with some incidences' : 'Reception correctly completed',
            order: updatedOrder,
        });
    } catch (error) {
        res.status(500).json({message: 'Error registering reception'});
    }
}