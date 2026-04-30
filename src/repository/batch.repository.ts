import type { RegisterBatchDto } from "../dtos/batch.dto.js";
import type { BatchStatus, IBatch } from "../models/Batch.js";
import { Types } from "mongoose";
import Batch from "../models/Batch.js";



export class BatchRepository {
  // registrar 1 paquete
  async create(
    data: RegisterBatchDto,
    orderId: string,
    employeeId: string
  ): Promise<IBatch> {
    return Batch.create({
      batchCode: data.batchCode,
      orderId: new Types.ObjectId(orderId),
      productId: new Types.ObjectId(data.productId),
      employeeId: new Types.ObjectId(employeeId),
      unitQuantity: data.unitQuantity,
      expireDate: new Date(data.expireDate)
    })
  }

  // registrar varios paquetes a la vez
  async createMany(
    lots: RegisterBatchDto[],
    orderId: string,
    employeeId: string
  ): Promise<IBatch[]> {
    const docs = lots.map((lot) => ({
      batchCode: lot.batchCode,
      orderId: new Types.ObjectId(orderId),
      productId: new Types.ObjectId(lot.productId),
      employeeId: new Types.ObjectId(employeeId),
      unitQuantity: lot.unitQuantity,
      expireDate: new Date(lot.expireDate)
    }))
    return Batch.insertMany(docs)
  }

  async findByProduct(productId: string): Promise<IBatch[]> {
    return Batch.find({ productId })
      .populate('orderId', 'numberOrder')
      .lean() as unknown as IBatch[]
  }

  async findByOrder(orderId: string): Promise<IBatch[]> {
    return Batch.find({ orderId: new Types.ObjectId(orderId) })
      .populate('productId', 'name productCode unitType')
      .populate('orderId', 'numberOrder')
      .lean() as unknown as IBatch[]
  }

  // comprobamos si un código de lote ya existe en ese pedido
  async existsInOrder(batchCode: string, orderId: string): Promise<boolean> {
    return !!(await Batch.exists({ batchCode, orderId }))
  }

  async findExistingCodes(
    batchCodes: string[],
    orderId: string
  ): Promise<Set<string>> {
    const existing = await Batch.find({
      orderId: new Types.ObjectId(orderId),
      batchCode: { $in: batchCodes }
    })
      .select('batchCode')
      .lean()
    return new Set(existing.map((b) => b.batchCode))
  }

  // creamos resumen de paquetes por producto en un pedido, el objetivo es comparar con la previsión inicial
  async summaryByProduct(
    orderId: string
  ): Promise<{ productId: string; totalBox: number; totalUnits: number }[]> {
    return Batch.aggregate([
      { $match: { orderId: new Types.ObjectId(orderId) } },
      {
        $group: {
          _id: '$productId',
          totalBox: { $sum: 1 },
          totalUnits: { $sum: '$unitQuantity' }
        }
      },
      { $project: { productId: '$_id', totalBox: 1, totalUnits: 1, _id: 0 } }
    ])
  }

  // con esto tenemos actualizamos también el estado de los productos
  async updateExpirationStatus(): Promise<void> {
    const today = new Date()
    const inThreeDays = new Date()
    inThreeDays.setDate(today.getDate() + 3)

    await Promise.all([
        Batch.updateMany({expireDate: {$lt: today}}, {status: 'expired'}),
        Batch.updateMany({expireDate: {$gte: today, $lte: inThreeDays}}, {status: 'soon to expire'}),
        Batch.updateMany({expireDate: {$gt: inThreeDays}}, {status: 'fresh'}),
    ]);
  }

  async findByStatus(status: BatchStatus): Promise<IBatch[]> {
    return Batch.find({ status })
      .populate('productId', 'category name')
      .populate('orderId', 'numberOrder')
      .lean() as unknown as IBatch[];
  }

  async maxExpireDataByProduct(
    orderId: string
  ): Promise<{ productId: string; maxExpireDate: Date }[]> {
    return Batch.aggregate([
      { $match: { orderId: new Types.ObjectId(orderId) } },
      {
        $group: {
          _id: '$productId',
          maxExpireDate: { $max: '$expireDate' }
        }
      },
      { $project: { productId: '$_id', maxExpireDate: 1, _id: 0 } }
    ])
  }
}