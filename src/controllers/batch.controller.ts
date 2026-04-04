import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import { BatchRepository } from "../repository/batch.repository.js";
import { IncidenceRepository } from "../repository/incidence.repository.js";
import { OrderRepository } from "../repository/order.repository.js";
import { ProductRepository } from "../repository/product.repository.js";
import type { RegisterBatchDto, RegisterLotsDto } from "../dtos/batch.dto.js";




const batchRepository = new BatchRepository();
const orderRepository = new OrderRepository();
const productRepository = new ProductRepository();
const incidenceRepository = new IncidenceRepository();

// GET /api/orders/:orderId/lots
// obtener todas las cajas registradas de un pedido
export const getBatchByOrder = async(req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lots = await batchRepository.findByProduct(req.params.orderId);
        const summary = await batchRepository.summaryByProduct(req.params.orderId);
        res.json({lots, summary});
    } catch (error) {
        res.status(500).json({message: 'Error trying to obtain lots by order'})
    }
}

// GET /api/lots/status/:status
export const getLotsByStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    const valid = ['fresh', 'soon to expire', 'expired'];
    if(!valid.includes(req.params.status)) {
        res.status(400).json({message: 'Invalid status'});
        return;
    }

    try {
        res.json(await batchRepository.findByStatus(req.params.status as any));
    } catch (error) {
        res.status(500).json({message: 'Error by filtering lots'});
    }
}


// para registrar un paquete manualmente
// POST /api/orders/:orderId/lots
export const registerLots = async (req:AuthRequest, res: Response): Promise<void> => {
    const {orderId} = req.params;
    const data: RegisterBatchDto = req.body;

    const {batchCode, productId, unitQuantity, expireDate} = data;
    if(!batchCode || !productId || !unitQuantity || !expireDate) {
        res.status(400).json({message: 'Inputs left to complete'});
    }

    try {
        const order = await orderRepository.findById(orderId);
        if(!order) {
            res.status(404).json({message: 'product Not found'});
            return;
        }

        if(order.status === 'received') {
            res.status(400).json({message: 'This order has already been closed'});
            return;
        }

        // verificar que exista el producto
        const product = await productRepository.findById(productId);
        if(!product) {
            res.status(404).json({message: 'Product not found'});
            return;
        }

        // verificar que no esté duplicado
        const duplicated = await batchRepository.existsInOrder(batchCode, orderId);
        if (duplicated) {
            res.status(409).json({message: `Code ${batchCode} have been registered already`});
            return;
        }

        // creamos lote
        const batch = await batchRepository.create(data, orderId, req.employee!.id);

        // sumamos las unidades al stock del producto
        await productRepository.addProductsToStock(productId, unitQuantity);

        res.status(201).json({message: 'Batch correctly registered', batch});
    } catch (error) {
        res.status(500).json({message: 'Error trying to register batch'});
    }
}


// registrar varios paquetes a la vez
// post /api/orders/:orderId/lots/bulk
export const registerLotsBulk = async(req: AuthRequest, res: Response): Promise<void> => {
    const {orderId} = req.params;
    const {lots}: RegisterLotsDto = req.body;

    if(!lots?.length) {
        res.status(400).json({message: 'You have to send at least one package'});
        return;
    }

    try {
        const order = await orderRepository.findById(orderId);
        if(!order) {
            res.status(404).json({message: 'Order not found'});
            return;
        }

        if(order.status === 'received') {
            res.status(400).json({message: 'This order has already been closed'});
            return;
        }

        const errors: string[] = [];

        for (const batch of lots) {
            // manejamos la validación de campos mínimos
            if (!batch.batchCode || !batch.productId || !batch.unitQuantity || !batch.expireDate) {
                errors.push(`Package ${batch.batchCode || '?'}: required inputs left`);
                continue;
            }

            // manejamos el duplicado
            const duplicated = await batchRepository.existsInOrder(batch.batchCode, orderId);
            if(duplicated) {
                errors.push(`Package ${batch.batchCode}: code already registered on this order`);
                continue;
            }
        }

        if(errors.length) {
            res.status(400).json({message: 'Errors detected on registration process', errors});
            return;
        }

        // creamos todos los lotes
        const createdLots = await batchRepository.createMany(lots, orderId, req.employee!.id);

        // ahora actualizamos el stock actual de cada producto
        for (const batch of lots) {
            await productRepository.addProductsToStock(batch.productId, batch.unitQuantity);
        }

        res.status(201).json({
            message: `${createdLots.length} packages correctly created`,
            lots: createdLots,
        });
    } catch (error) {
        res.status(500).json({message: 'Error trying to register packages'});
    }
};


// terminar con cierre del pedido, aquí se compara la previsión con los lotes registrados
// post /api/orders/:orderId/close
export const closeOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    const {orderId} = req.params;

    try {
        const order = await orderRepository.findById(orderId);
        if(!order) {
            res.status(404).json({message: 'Order not found'});
            return;
        }

        if(order.status === 'received') {
            res.status(400).json({message: 'This order has already been closed'});
            return;
        }

        // obtener la previsión y el resumen de lo recibido
        const expectedLines = await orderRepository.findOrderLines(orderId);
        const receivedSummary = await batchRepository.summaryByProduct(orderId);

        const differences: {productId: string; expected: number; received: number}[] = [];

        for (const line of expectedLines) {
            const productId = (line.productId as any)._id?.toString() ?? line.productId.toString();
            const received = receivedSummary.find((r) => r.productId.toString() === productId);
            const receivedPackage =received?.totalBox ?? 0;

            if(receivedPackage !== line.expectedQuantity) {
                differences.push({
                    productId,
                    expected: line.expectedQuantity,
                    received: receivedPackage,
                });
            }
        }


        const gotDifferences = differences.length > 0;
        const newStatus = gotDifferences ? 'there is incidence' : 'received';

        await orderRepository.updateOrderStatus(orderId, newStatus, new Date());

        // en caso de haber incidencias, crear incidencia
        if(gotDifferences) {
            const description = differences.map((d) => `Product ${d.productId}: expected ${d.expected} packages, received ${d.received}`).join(' | ');

            await incidenceRepository.createIncidence({
                orderId,
                providerId: order.providerId.toString(),
                type: 'invalid quantity',
                description,
            },
        req.employee!.id);
        }

        res.json({
            message: gotDifferences ? 'Order created with some incidences' : 'Order correctly created',
            status: newStatus,
            differences: gotDifferences ? differences : [],
        });
    } catch (error) {
        res.status(500).json({message: 'Error trying to close this order'});
    }
}