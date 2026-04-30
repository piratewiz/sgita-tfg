import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import Employee from '../src/models/Employee.js'
import Product from '../src/models/Product.js'
import Batch from '../src/models/Batch.js'
import Incidence from '../src/models/Incidence.js'
import Provider from '../src/models/Provider.js'
import Truck from '../src/models/Truck.js'
import { newObjectId } from './helpers/fixtures.js'


describe('Modelo Employee', () => {
  const validEmployee = {
    name: 'Juan',
    surname: 'García',
    dni: '12345678A',
    nss: '281234567890',
    numberEmployee: 'EMP001',
    rol: 'empleado',
    email: 'juan@test.com',
    password: 'hashedpass',
    active: true,
  }

  it('guarda un empleado válido correctamente', async () => {
    const emp = await Employee.create(validEmployee)
    expect(emp._id).toBeDefined()
    expect(emp.email).toBe('juan@test.com')
    expect(emp.active).toBe(true)
  })

  it('el email se almacena en minúsculas', async () => {
    const emp = await Employee.create({ ...validEmployee, email: 'UPPER@TEST.COM', dni: '87654321B', nss: 'NSS999', numberEmployee: 'EMP002' })
    expect(emp.email).toBe('upper@test.com')
  })

  it('active es true por defecto', async () => {
    const emp = await Employee.create({ ...validEmployee, email: 'default@test.com', dni: '11111111C', nss: 'NSS111', numberEmployee: 'EMP003', active: undefined })
    expect(emp.active).toBe(true)
  })

  it('falla si falta un campo obligatorio (name)', async () => {
    const { name: _name, ...withoutName } = validEmployee
    await expect(Employee.create(withoutName)).rejects.toThrow()
  })

  it('falla si el rol no es válido', async () => {
    await expect(
      Employee.create({ ...validEmployee, rol: 'superadmin', email: 'rol@test.com', dni: '22222222D', nss: 'NSS222', numberEmployee: 'EMP004' })
    ).rejects.toThrow()
  })

  it('falla si se duplica el email', async () => {
    await Employee.create(validEmployee)
    await expect(Employee.create({ ...validEmployee, dni: '99999999Z', nss: 'NSS000', numberEmployee: 'EMP999' })).rejects.toThrow()
  })

  it('falla si se duplica el DNI', async () => {
    await Employee.create(validEmployee)
    await expect(Employee.create({ ...validEmployee, email: 'otro@test.com', nss: 'NSSXXX', numberEmployee: 'EMPXXX' })).rejects.toThrow()
  })
})


describe('Modelo Product', () => {
  const providerId = newObjectId()

  const validProduct = {
    name: 'Tomate',
    category: 'Verdura',
    productCode: 'TOM-001',
    unitType: 'kg',
    quantity: 10,
    minStock: 2,
    expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 días
    providerId,
  }

  it('guarda un producto válido con status fresh por defecto', async () => {
    const prod = await Product.create(validProduct)
    expect(prod._id).toBeDefined()
    expect(prod.status).toBe('fresh')
    expect(prod.name).toBe('Tomate')
  })

  it('el unitType acepta los valores del enum', async () => {
    for (const unitType of ['kg', 'gram', 'liter', 'box', 'unit'] as const) {
      const prod = await Product.create({
        ...validProduct,
        productCode: `PROD-${unitType}`,
        unitType,
      })
      expect(prod.unitType).toBe(unitType)
    }
  })

  it('falla con unitType inválido', async () => {
    await expect(
      Product.create({ ...validProduct, productCode: 'FAIL-1', unitType: 'tonelada' })
    ).rejects.toThrow()
  })

  it('falla si quantity es negativa', async () => {
    await expect(
      Product.create({ ...validProduct, productCode: 'FAIL-2', quantity: -5 })
    ).rejects.toThrow()
  })

  it('falla si se duplica productCode', async () => {
    await Product.create(validProduct)
    await expect(Product.create({ ...validProduct, name: 'Tomate 2' })).rejects.toThrow()
  })

  it('falta campo obligatorio (name) lanza error', async () => {
    const { name: _n, ...noName } = validProduct
    await expect(Product.create(noName)).rejects.toThrow()
  })
})


describe('Modelo Batch', () => {
  const orderId = newObjectId()
  const productId = newObjectId()
  const employeeId = newObjectId()

  const validBatch = {
    batchCode: 'LOT-001',
    orderId,
    productId,
    employeeId,
    unitQuantity: 20,
    expireDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
  }

  it('guarda un lote válido con status fresh por defecto', async () => {
    const batch = await Batch.create(validBatch)
    expect(batch._id).toBeDefined()
    expect(batch.status).toBe('fresh')
    expect(batch.batchCode).toBe('LOT-001')
  })

  it('falla si unitQuantity < 1', async () => {
    await expect(
      Batch.create({ ...validBatch, batchCode: 'LOT-FAIL', unitQuantity: 0 })
    ).rejects.toThrow()
  })

  it('el índice único (batchCode + orderId) impide duplicados', async () => {
    await Batch.create(validBatch)
    await expect(Batch.create({ ...validBatch })).rejects.toThrow()
  })

  it('el mismo batchCode en distinto pedido sí está permitido', async () => {
    await Batch.create(validBatch)
    const otroOrderId = newObjectId()
    const batch2 = await Batch.create({ ...validBatch, orderId: otroOrderId })
    expect(batch2._id).toBeDefined()
  })
})


describe('Modelo Incidence', () => {
  const orderId = newObjectId()
  const providerId = newObjectId()
  const employeeId = newObjectId()

  const validIncidence = {
    orderId,
    providerId,
    employeeId,
    type: 'incorrect quantity',
    description: 'Se recibieron menos unidades de las previstas',
    status: 'open',
  }

  it('guarda una incidencia con status open por defecto', async () => {
    const inc = await Incidence.create(validIncidence)
    expect(inc._id).toBeDefined()
    expect(inc.status).toBe('open')
  })

  it('falla con tipo de incidencia no permitido', async () => {
    await expect(
      Incidence.create({ ...validIncidence, type: 'tipo-invalido' })
    ).rejects.toThrow()
  })

  it('acepta todos los tipos de incidencia válidos', async () => {
    const types = ['incorrect quantity', 'expired product', 'damaged product', 'other'] as const
    for (const type of types) {
      const inc = await Incidence.create({ ...validIncidence, type })
      expect(inc.type).toBe(type)
    }
  })

  it('falla si description supera 200 caracteres', async () => {
    const longDesc = 'a'.repeat(201)
    await expect(
      Incidence.create({ ...validIncidence, description: longDesc })
    ).rejects.toThrow()
  })

  it('falla si falta el orderId', async () => {
    const { orderId: _o, ...noOrder } = validIncidence
    await expect(Incidence.create(noOrder)).rejects.toThrow()
  })
})


describe('Modelo Provider', () => {
  it('guarda un proveedor válido con active=true por defecto', async () => {
    const prov = await Provider.create({
      name: 'Frutas López',
      contact: 'Pedro López',
      phoneNumber: '611222333',
      email: 'frutas@lopez.com',
    })
    expect(prov._id).toBeDefined()
    expect(prov.active).toBe(true)
  })

  it('falla con email duplicado', async () => {
    await Provider.create({ name: 'A', contact: 'B', phoneNumber: '600', email: 'dup@test.com' })
    await expect(
      Provider.create({ name: 'C', contact: 'D', phoneNumber: '700', email: 'dup@test.com' })
    ).rejects.toThrow()
  })
})


describe('Modelo Truck', () => {
  it('guarda un camión válido con active=true por defecto', async () => {
    const truck = await Truck.create({ licencePlate: '1234ABC', truckModel: 'Iveco Daily' })
    expect(truck._id).toBeDefined()
    expect(truck.active).toBe(true)
  })

  it('falla con matrícula duplicada', async () => {
    await Truck.create({ licencePlate: 'DUPL001', truckModel: 'Renault Master' })
    await expect(
      Truck.create({ licencePlate: 'DUPL001', truckModel: 'Mercedes Sprinter' })
    ).rejects.toThrow()
  })

  it('falla si falta la matrícula', async () => {
    await expect(Truck.create({ truckModel: 'Ford Transit' })).rejects.toThrow()
  })
})
