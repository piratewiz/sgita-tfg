import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import { BatchRepository } from "../repository/batch.repository.js";
import { IncidenceRepository } from "../repository/incidence.repository.js";
import { OrderRepository } from "../repository/order.repository.js";
import { ProductRepository } from "../repository/product.repository.js";
import type { RegisterBatchDto, RegisterLotsDto } from "../dtos/batch.dto.js";
import type { BatchStatus } from "../models/Batch.js";
import { Types } from "mongoose";




const batchRepository = new BatchRepository();
const orderRepository = new OrderRepository();
const productRepository = new ProductRepository();
const incidenceRepository = new IncidenceRepository();

// GET /api/orders/:orderId/lots
// obtener todas las cajas registradas de un pedido
export const getBatchByOrder = async(req: AuthRequest, res: Response): Promise<void> => {
    try {
        const {orderId} = req.params as {orderId: string};
        const lots = await batchRepository.findByOrder(orderId);
        const summary = await batchRepository.summaryByProduct(orderId);
        res.json({lots, summary});
    } catch (error) {
        res.status(500).json({message: 'Error trying to obtain lots by order'})
    }
}

// GET /api/lots/status/:status
export const getLotsByStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    const valid = ['fresh', 'soon to expire', 'expired'];
    if(!valid.includes(req.params.status as string)) {
        res.status(400).json({message: 'Invalid status'});
        return;
    }

    try {
        res.json(await batchRepository.findByStatus(req.params.status as BatchStatus));
    } catch (error) {
        res.status(500).json({message: 'Error by filtering lots'});
    }
}


// para registrar un paquete manualmente
// POST /api/orders/:orderId/lots
export const registerLots = async (req:AuthRequest, res: Response): Promise<void> => {
    const {orderId} = req.params as {orderId: string};
    const data: RegisterBatchDto = req.body;

    const {batchCode, productId, unitQuantity, expireDate} = data;
    if(!batchCode || !productId || !unitQuantity || !expireDate) {
        res.status(400).json({message: 'Inputs left to complete'});
        return;
    }

    try {
        const order = await orderRepository.findById(orderId);
        if(!order) {
            res.status(404).json({message: 'product Not found'});
            return;
        }

        if(order.status !== 'pending') {
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

        res.status(201).json({message: 'Batch correctly registered', batch});
    } catch (error) {
        res.status(500).json({message: 'Error trying to register batch'});
    }
}


// registrar varios paquetes a la vez
// post /api/orders/:orderId/lots/bulk
export const registerLotsBulk = async(req: AuthRequest, res: Response): Promise<void> => {
    const {orderId} = req.params as {orderId: string};
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

        if(order.status !== 'pending') {
            res.status(400).json({message: 'This order has already been closed'});
            return;
        }

        const errors: string[] = [];
        const normalizedLots: RegisterBatchDto[] = [];
        const payloadBatchCodes = new Set<string>();

        for (const batch of lots) {
            // manejamos la validación de campos mínimos
            if (!batch.batchCode || !batch.productId || !batch.unitQuantity || !batch.expireDate) {
                errors.push(`Package ${batch.batchCode || '?'}: required inputs left`);
                continue;
            }

            const batchCode = batch.batchCode.trim();
            const productInput = batch.productId.trim();

            if (payloadBatchCodes.has(batchCode)) {
                errors.push(`Package ${batchCode}: duplicated code on request payload`);
                continue;
            }

            payloadBatchCodes.add(batchCode);

            const parsedUnits = Number(batch.unitQuantity);
            if(!Number.isFinite(parsedUnits) || parsedUnits < 1) {
                errors.push(`Package ${batchCode}: units should be greater than 0`);
                continue;
            }

            const product = Types.ObjectId.isValid(productInput) ? await productRepository.findById(productInput) : await productRepository.findByCode(productInput);
            if(!product) {
                errors.push(`Package ${batchCode}: product "${productInput}" not found`);
                continue;
            }

            // manejamos el duplicado
            const duplicated = await batchRepository.existsInOrder(batchCode, orderId);
            if(duplicated) {
                errors.push(`Package ${batchCode}: code already registered on this order`);
                continue;
            }

            normalizedLots.push({
                batchCode,
                productId: product._id.toString(),
                unitQuantity: parsedUnits,
                expireDate: batch.expireDate,
            });
        }

        if(errors.length) {
            res.status(400).json({message: 'Errors detected on registration process', errors});
            return;
        }
        // creamos todos los lotes
        const createdLots = await batchRepository.createMany(normalizedLots, orderId, req.employee!.id);

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
    const {orderId} = req.params as {orderId: string};

    try {
        const order = await orderRepository.findById(orderId);
        if(!order) {
            res.status(404).json({message: 'Order not found'});
            return;
        }

        if(order.status !== 'pending') {
            res.status(400).json({message: 'This order has already been closed'});
            return;
        }

        // obtener la previsión y el resumen de lo recibido
        const expectedLines = await orderRepository.findOrderLines(orderId);
        const receivedSummary = await batchRepository.summaryByProduct(orderId);

        const differences: {productId: string; expected: number; received: number}[] = [];

        for (const line of expectedLines) {
            const rawProductId = (line.productId as any)?._id ?? line.productId;
            const productId = rawProductId?.toString?.() ?? '';
            if(!productId) {
                continue;
            }

            const received = receivedSummary.find((r) => r.productId.toString() === productId);
            const receivedPackage = Number(received?.totalBox ?? 0);
            const expectedPackages = Number(line.expectedQuantity ?? 0);

            if(receivedPackage !== expectedPackages) {
                differences.push({
                    productId,
                    expected: expectedPackages,
                    received: receivedPackage,
                });
            }
        }


        const gotDifferences = differences.length > 0;
        const newStatus = gotDifferences ? 'incidence' : 'received';

        const unitsByProduct = receivedSummary.map((row) => ({
            productId: row.productId?.toString?.() ?? "",
            quantity: Number(row.totalUnits ?? 0),
        })).filter((row) => row.productId && row.quantity > 0);

        await productRepository.bulkAddProductsToStock(unitsByProduct);

        const maxExpireDates = await batchRepository.maxExpireDataByProduct(orderId);
        const expirationUpdates = maxExpireDates.map((row) => ({
            productId: row.productId?.toString?.() ?? '',
            expirationDate: row.maxExpireDate,
        })).filter((row) => row.productId);

        await productRepository.bulkUpdateExpirationAndStatus(expirationUpdates);

        await orderRepository.updateOrderStatus(orderId, newStatus, new Date());

        // en caso de haber incidencias, crear incidencia
        if(gotDifferences) {
            const description = differences.map((d) => `Product ${d.productId}: expected ${d.expected} packages, received ${d.received}`).join(' | ');

            try {
                await incidenceRepository.createIncidence({
                    orderId,
                    providerId: order.providerId.toString(),
                    type: 'incorrect quantity',
                    description,
                },
            req.employee!.id);
            } catch (error) {
                // El pedido ya quedó cerrado; no rompemos la respuesta por un fallo secundario.
            }
        }

        res.json({
            message: gotDifferences ? 'Order closed with incidences' : 'Order closed correctly',
            status: newStatus,
            differences: gotDifferences ? differences : [],
            stockUpdatedProducts: unitsByProduct.length,
            stockAddedUnits: unitsByProduct.reduce((acc, row) => acc + row.quantity, 0),
        });
    } catch (error) {
        res.status(500).json({message: 'Error trying to close this order'});
    }
}