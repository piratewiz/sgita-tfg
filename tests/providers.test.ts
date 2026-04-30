import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { createApp } from './helpers/app.js'
import { createEmployee, createProvider } from './helpers/fixtures.js'

const app = createApp()

describe('GET /api/providers', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/providers')
    expect(res.status).toBe(401)
  })

  it('devuelve array vacío cuando no hay proveedores', async () => {
    const { token } = await createEmployee()
    const res = await request(app)
      .get('/api/providers')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('devuelve la lista de proveedores existentes', async () => {
    const { token } = await createEmployee()
    await createProvider({ name: 'Proveedor A', email: 'a@prov.com' })
    await createProvider({ name: 'Proveedor B', email: 'b@prov.com' })

    const res = await request(app)
      .get('/api/providers')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.length).toBe(2)
  })
})

describe('GET /api/providers/:id', () => {
  it('devuelve 404 si el proveedor no existe', async () => {
    const { token } = await createEmployee()
    const fakeId = new mongoose.Types.ObjectId().toString()

    const res = await request(app)
      .get(`/api/providers/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })

  it('devuelve el proveedor cuando existe', async () => {
    const { token } = await createEmployee()
    const prov = await createProvider({ name: 'Prov Detalle', email: 'detalle@prov.com' })

    const res = await request(app)
      .get(`/api/providers/${prov._id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Prov Detalle')
  })
})

describe('POST /api/providers', () => {
  const providerData = {
    name: 'Nuevo Proveedor',
    contact: 'Ana Martínez',
    phoneNumber: '622333444',
    email: 'nuevo@proveedor.com',
  }

  it('devuelve 403 si el rol es empleado', async () => {
    const { token } = await createEmployee({ rol: 'empleado' })

    const res = await request(app)
      .post('/api/providers')
      .set('Authorization', `Bearer ${token}`)
      .send(providerData)

    expect(res.status).toBe(403)
  })

  it('un encargado puede crear un proveedor', async () => {
    const { token } = await createEmployee({ rol: 'encargado' })

    const res = await request(app)
      .post('/api/providers')
      .set('Authorization', `Bearer ${token}`)
      .send(providerData)

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Nuevo Proveedor')
    expect(res.body.active).toBe(true)
  })

  it('un admin puede crear un proveedor', async () => {
    const { token } = await createEmployee({ rol: 'admin' })

    const res = await request(app)
      .post('/api/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...providerData, email: 'admin-prov@test.com' })

    expect(res.status).toBe(201)
  })

  it('devuelve 400 si faltan campos obligatorios', async () => {
    const { token } = await createEmployee({ rol: 'admin' })

    const res = await request(app)
      .post('/api/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Solo nombre' })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Inputs left!')
  })

  it('devuelve 409 si el email ya está registrado', async () => {
    const { token } = await createEmployee({ rol: 'admin' })
    await createProvider({ email: 'dup@prov.com' })

    const res = await request(app)
      .post('/api/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...providerData, email: 'dup@prov.com' })

    expect(res.status).toBe(409)
  })
})

describe('PUT /api/providers/:id', () => {
  it('un encargado puede actualizar un proveedor', async () => {
    const { token } = await createEmployee({ rol: 'encargado' })
    const prov = await createProvider({ email: 'update@prov.com' })

    const res = await request(app)
      .put(`/api/providers/${prov._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nombre Actualizado' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Nombre Actualizado')
  })

  it('devuelve 404 si el proveedor no existe', async () => {
    const { token } = await createEmployee({ rol: 'admin' })
    const fakeId = new mongoose.Types.ObjectId().toString()

    const res = await request(app)
      .put(`/api/providers/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/providers/:id', () => {
  it('devuelve 403 si el rol no es admin', async () => {
    const { token } = await createEmployee({ rol: 'encargado' })
    const prov = await createProvider({ email: 'del@prov.com' })

    const res = await request(app)
      .delete(`/api/providers/${prov._id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
  })

  it('un admin puede desactivar (soft delete) un proveedor', async () => {
    const { token } = await createEmployee({ rol: 'admin' })
    const prov = await createProvider({ email: 'softdel@prov.com' })

    const res = await request(app)
      .delete(`/api/providers/${prov._id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toContain('desactivated')
  })
})


describe('GET /api/trucks', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/trucks')
    expect(res.status).toBe(401)
  })

  it('devuelve array vacío cuando no hay camiones', async () => {
    const { token } = await createEmployee()
    const res = await request(app)
      .get('/api/trucks')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('POST /api/trucks', () => {
  it('devuelve 400 si faltan campos', async () => {
    const { token } = await createEmployee({ rol: 'admin' })

    const res = await request(app)
      .post('/api/trucks')
      .set('Authorization', `Bearer ${token}`)
      .send({ licencePlate: '1234ABC' })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Inputs left!')
  })

  it('un encargado crea un camión correctamente', async () => {
    const { token } = await createEmployee({ rol: 'encargado' })

    const res = await request(app)
      .post('/api/trucks')
      .set('Authorization', `Bearer ${token}`)
      .send({ licencePlate: '5678DEF', model: 'Iveco Daily', truckModel: 'Iveco Daily' })

    expect(res.status).toBe(201)
    expect(res.body.licencePlate).toBe('5678DEF')
  })

  it('devuelve 409 si la matrícula ya existe', async () => {
    const { token } = await createEmployee({ rol: 'admin' })
    await request(app)
      .post('/api/trucks')
      .set('Authorization', `Bearer ${token}`)
      .send({ licencePlate: 'DUPMAT01', model: 'Renault', truckModel: 'Renault' })

    const res = await request(app)
      .post('/api/trucks')
      .set('Authorization', `Bearer ${token}`)
      .send({ licencePlate: 'DUPMAT01', model: 'Mercedes', truckModel: 'Mercedes' })

    expect(res.status).toBe(409)
  })

  it('devuelve 403 si el rol es empleado', async () => {
    const { token } = await createEmployee({ rol: 'empleado' })

    const res = await request(app)
      .post('/api/trucks')
      .set('Authorization', `Bearer ${token}`)
      .send({ licencePlate: '9999ZZZ', model: 'Ford', truckModel: 'Ford' })

    expect(res.status).toBe(403)
  })
})


describe('GET /api/products', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/products')
    expect(res.status).toBe(401)
  })

  it('devuelve array vacío cuando no hay productos', async () => {
    const { token } = await createEmployee()
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('GET /api/products/status/:status', () => {
  it('devuelve 400 con status inválido', async () => {
    const { token } = await createEmployee()
    const res = await request(app)
      .get('/api/products/status/caducado')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
  })

  it('devuelve 200 con status válido', async () => {
    const { token } = await createEmployee()
    for (const status of ['fresh', 'soon_expire', 'expired']) {
      const res = await request(app)
        .get(`/api/products/status/${status}`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
    }
  })
})

describe('POST /api/products – validación de roles y campos', () => {
  it('devuelve 403 si el rol es empleado', async () => {
    const { token } = await createEmployee({ rol: 'empleado' })
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Algo' })
    expect(res.status).toBe(403)
  })

  it('devuelve 400 si faltan campos obligatorios', async () => {
    const { token } = await createEmployee({ rol: 'encargado' })
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Incompleto' })
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('Inputs left')
  })
})
