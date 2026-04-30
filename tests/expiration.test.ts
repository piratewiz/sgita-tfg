import { describe, it, expect } from 'vitest'
import Product from '../src/models/Product.js'
import Batch from '../src/models/Batch.js'
import '../src/models/Order.js'
import '../src/models/Employee.js'
import { ProductRepository } from '../src/repository/product.repository.js'
import { BatchRepository } from '../src/repository/batch.repository.js'
import { newObjectId } from './helpers/fixtures.js'

const productRepo = new ProductRepository()
const batchRepo = new BatchRepository()

const providerId = newObjectId()

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

async function createProduct(code: string, expirationDate: Date, initialStatus = 'fresh') {
  return Product.create({
    name: `Producto ${code}`,
    category: 'Test',
    productCode: code,
    unitType: 'kg',
    quantity: 10,
    minStock: 1,
    expirationDate,
    providerId,
    status: initialStatus,
  })
}

async function createBatch(code: string, expireDate: Date, initialStatus = 'fresh') {
  return Batch.create({
    batchCode: code,
    orderId: newObjectId(),
    productId: newObjectId(),
    employeeId: newObjectId(),
    unitQuantity: 5,
    expireDate,
    status: initialStatus,
  })
}


describe('ProductRepository – updateStatusExpiredProducts', () => {
  it('marca como expired los productos con fecha pasada', async () => {
    await createProduct('EXP-001', daysFromNow(-1))
    await productRepo.updateStatusExpiredProducts()
    const updated = await Product.findOne({ productCode: 'EXP-001' })
    expect(updated?.status).toBe('expired')
  })

  it('marca como soon_expire los productos que caducan en ≤ 3 días', async () => {
    await createProduct('SOON-001', daysFromNow(2))
    await productRepo.updateStatusExpiredProducts()
    const updated = await Product.findOne({ productCode: 'SOON-001' })
    expect(updated?.status).toBe('soon_expire')
  })

  it('marca como soon_expire los productos que caducan exactamente en 3 días', async () => {
    await createProduct('SOON-002', daysFromNow(3))
    await productRepo.updateStatusExpiredProducts()
    const updated = await Product.findOne({ productCode: 'SOON-002' })
    expect(updated?.status).toBe('soon_expire')
  })

  it('mantiene fresh los productos que caducan en más de 3 días', async () => {
    await createProduct('FRESH-001', daysFromNow(10))
    await productRepo.updateStatusExpiredProducts()
    const updated = await Product.findOne({ productCode: 'FRESH-001' })
    expect(updated?.status).toBe('fresh')
  })

  it('actualiza varios productos a la vez de forma correcta', async () => {
    await createProduct('MULTI-EXP', daysFromNow(-5))
    await createProduct('MULTI-SOON', daysFromNow(1))
    await createProduct('MULTI-FRESH', daysFromNow(30))

    await productRepo.updateStatusExpiredProducts()

    const exp = await Product.findOne({ productCode: 'MULTI-EXP' })
    const soon = await Product.findOne({ productCode: 'MULTI-SOON' })
    const fresh = await Product.findOne({ productCode: 'MULTI-FRESH' })

    expect(exp?.status).toBe('expired')
    expect(soon?.status).toBe('soon_expire')
    expect(fresh?.status).toBe('fresh')
  })
})


describe('BatchRepository – updateExpirationStatus', () => {
  it('marca como expired los lotes con fecha pasada', async () => {
    await createBatch('B-EXP-001', daysFromNow(-2))
    await batchRepo.updateExpirationStatus()
    const updated = await Batch.findOne({ batchCode: 'B-EXP-001' })
    expect(updated?.status).toBe('expired')
  })

  it('marca como "soon to expire" los lotes que caducan en ≤ 3 días', async () => {
    await createBatch('B-SOON-001', daysFromNow(1))
    await batchRepo.updateExpirationStatus()
    const updated = await Batch.findOne({ batchCode: 'B-SOON-001' })
    expect(updated?.status).toBe('soon to expire')
  })

  it('mantiene fresh los lotes que caducan en más de 3 días', async () => {
    await createBatch('B-FRESH-001', daysFromNow(15))
    await batchRepo.updateExpirationStatus()
    const updated = await Batch.findOne({ batchCode: 'B-FRESH-001' })
    expect(updated?.status).toBe('fresh')
  })

  it('actualiza múltiples lotes correctamente', async () => {
    await createBatch('B-MULTI-EXP', daysFromNow(-10))
    await createBatch('B-MULTI-SOON', daysFromNow(2))
    await createBatch('B-MULTI-FRESH', daysFromNow(20))

    await batchRepo.updateExpirationStatus()

    const exp = await Batch.findOne({ batchCode: 'B-MULTI-EXP' })
    const soon = await Batch.findOne({ batchCode: 'B-MULTI-SOON' })
    const fresh = await Batch.findOne({ batchCode: 'B-MULTI-FRESH' })

    expect(exp?.status).toBe('expired')
    expect(soon?.status).toBe('soon to expire')
    expect(fresh?.status).toBe('fresh')
  })
})


describe('ProductRepository – addProductsToStock', () => {
  it('incrementa la cantidad de stock correctamente', async () => {
    const prod = await createProduct('STOCK-001', daysFromNow(30))
    await productRepo.addProductsToStock(prod._id.toString(), 5)

    const updated = await Product.findById(prod._id)
    expect(updated?.quantity).toBe(15)
  })

  it('bulkAddProductsToStock ignora items con quantity <= 0', async () => {
    const prod = await createProduct('BULK-001', daysFromNow(30))

    await productRepo.bulkAddProductsToStock([
      { productId: prod._id.toString(), quantity: 0 },
    ])

    const noChange = await Product.findById(prod._id)
    expect(noChange?.quantity).toBe(10)
  })

  it('bulkAddProductsToStock acumula cantidades de varios productos', async () => {
    const p1 = await createProduct('BULK-P1', daysFromNow(30))
    const p2 = await createProduct('BULK-P2', daysFromNow(30))

    await productRepo.bulkAddProductsToStock([
      { productId: p1._id.toString(), quantity: 3 },
      { productId: p2._id.toString(), quantity: 7 },
    ])

    const r1 = await Product.findById(p1._id)
    const r2 = await Product.findById(p2._id)

    expect(r1?.quantity).toBe(13)
    expect(r2?.quantity).toBe(17)
  })
})


describe('BatchRepository – consultas', () => {
  it('existsInOrder devuelve true si el código ya existe en ese pedido', async () => {
    const batch = await createBatch('CODE-CHECK-01', daysFromNow(10))
    const result = await batchRepo.existsInOrder('CODE-CHECK-01', batch.orderId.toString())
    expect(result).toBe(true)
  })

  it('existsInOrder devuelve false si el código no existe en ese pedido', async () => {
    const orderId = newObjectId()
    const result = await batchRepo.existsInOrder('NOPE-CODE', orderId.toString())
    expect(result).toBe(false)
  })

  it('findByOrder devuelve los lotes de un pedido concreto', async () => {
    const batch = await createBatch('FIND-01', daysFromNow(5))
    const result = await batchRepo.findByOrder(batch.orderId.toString())
    expect(result.length).toBe(1)
    expect(result[0]?.batchCode).toBe('FIND-01')
  })
})
