import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from './helpers/app.js'
import { createEmployee } from './helpers/fixtures.js'

const app = createApp()

describe('GET /api/health', () => {
  it('devuelve status ok sin autenticación', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok' })
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await createEmployee({ email: 'login@test.com', password: 'Clave1234' })
  })

  it('devuelve token con credenciales correctas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'Clave1234' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.employee).toMatchObject({ email: 'login@test.com' })
  })

  it('devuelve 400 si faltan campos', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('message')
  })

  it('devuelve 401 con contraseña incorrecta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'wrongpass' })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Invalid credentials')
  })

  it('devuelve 401 si el email no existe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@test.com', password: 'Clave1234' })

    expect(res.status).toBe(401)
  })

  it('devuelve 401 si el empleado está inactivo', async () => {
    await createEmployee({ email: 'inactivo@test.com', active: false })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inactivo@test.com', password: 'Password123' })

    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.message).toBe('No token provided')
  })

  it('devuelve datos del empleado autenticado', async () => {
    const { token, employee } = await createEmployee({ email: 'me@test.com' })

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.employee.email).toBe('me@test.com')
    expect(res.body.employee).not.toHaveProperty('password')
  })

  it('devuelve 401 con token inválido', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token.invalido.aqui')

    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/logout', () => {
  it('devuelve 200 con un token válido', async () => {
    const { token } = await createEmployee()

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
  })

  it('devuelve 401 sin token', async () => {
    const res = await request(app).post('/api/auth/logout')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/register', () => {
  const newEmployee = {
    name: 'Nuevo',
    surname: 'Empleado',
    dni: '87654321B',
    nss: 'NSS998877',
    numberEmployee: 'EMPNEW001',
    rol: 'encargado',
    email: 'nuevo@test.com',
    password: 'Clave5678',
  }

  it('devuelve 401 si no hay token', async () => {
    const res = await request(app).post('/api/auth/register').send(newEmployee)
    expect(res.status).toBe(401)
  })

  it('devuelve 403 si el rol no es admin', async () => {
    const { token } = await createEmployee({ rol: 'encargado' })

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send(newEmployee)

    expect(res.status).toBe(403)
  })

  it('un admin puede registrar un nuevo empleado', async () => {
    const { token } = await createEmployee({ rol: 'admin' })

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send(newEmployee)

    expect(res.status).toBe(201)
    expect(res.body.employee.email).toBe('nuevo@test.com')
    expect(res.body.employee.rol).toBe('encargado')
  })

  it('devuelve 400 si faltan campos obligatorios', async () => {
    const { token } = await createEmployee({ rol: 'admin' })

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Solo nombre' })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('Missing fields')
  })

  it('devuelve 400 si se intenta crear un admin', async () => {
    const { token } = await createEmployee({ rol: 'admin' })

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...newEmployee, rol: 'admin', email: 'admin2@test.com' })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('admin')
  })

  it('devuelve 409 si el email ya está registrado', async () => {
    const { token } = await createEmployee({ rol: 'admin' })
    await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send(newEmployee)

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send(newEmployee)

    expect(res.status).toBe(409)
  })
})

describe('POST /api/auth/forgot-password', () => {
  it('devuelve 400 si falta el email', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({})
    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Email obligatorio')
  })

  it('devuelve 200 aunque el email no exista (seguridad)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'noexiste@example.com' })
    expect(res.status).toBe(200)
  })
})

describe('POST /api/auth/reset-password', () => {
  it('devuelve 400 si faltan token o password', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'abc' })
    expect(res.status).toBe(400)
  })

  it('devuelve 400 si la contraseña tiene menos de 6 caracteres', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'cualquier-token', password: '123' })
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('6 caracteres')
  })

  it('devuelve 400 si el token es inválido o caducado', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'token-invalido-xyz', password: 'nuevaClave123' })
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('inválido')
  })
})

describe('Rutas no existentes', () => {
  it('devuelve 404 para rutas desconocidas', async () => {
    const res = await request(app).get('/api/ruta-no-existe')
    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Endpoint not found')
  })
})
