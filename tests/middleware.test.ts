import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { verifyToken, requireRol } from '../src/middlewares/auth.middleware.js'
import type { AuthRequest } from '../src/middlewares/auth.middleware.js'
import type { Response, NextFunction } from 'express'
import { createEmployee } from './helpers/fixtures.js'

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response
  return res
}

function mockReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
  return {
    headers: {},
    ...overrides,
  } as AuthRequest
}

describe('verifyToken', () => {
  it('devuelve 401 si no se envía cabecera Authorization', async () => {
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn() as NextFunction

    await verifyToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' })
    expect(next).not.toHaveBeenCalled()
  })

  it('devuelve 401 si el token es inválido', async () => {
    const req = mockReq({ headers: { authorization: 'Bearer token.invalido' } })
    const res = mockRes()
    const next = vi.fn() as NextFunction

    await verifyToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('devuelve 401 si el empleado no existe en BD', async () => {
    const fakeToken = jwt.sign(
      { id: '000000000000000000000000', rol: 'empleado', email: 'ghost@test.com' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    )
    const req = mockReq({ headers: { authorization: `Bearer ${fakeToken}` } })
    const res = mockRes()
    const next = vi.fn() as NextFunction

    await verifyToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('llama a next() y adjunta employee al request con token válido', async () => {
    const { employee, token } = await createEmployee({ rol: 'encargado' })

    const req = mockReq({ headers: { authorization: `Bearer ${token}` } })
    const res = mockRes()
    const next = vi.fn() as NextFunction

    await verifyToken(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.employee).toMatchObject({
      id: employee._id.toString(),
      rol: 'encargado',
    })
  })

  it('devuelve 401 si el empleado está inactivo', async () => {
    const { token } = await createEmployee({ active: false })

    const req = mockReq({ headers: { authorization: `Bearer ${token}` } })
    const res = mockRes()
    const next = vi.fn() as NextFunction

    await verifyToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('requireRol', () => {
  it('devuelve 401 si el request no tiene employee', () => {
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn() as NextFunction

    requireRol('admin')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' })
    expect(next).not.toHaveBeenCalled()
  })

  it('devuelve 403 si el rol del empleado no está en la lista', () => {
    const req = mockReq({
      employee: { id: '123', rol: 'empleado', email: 'e@test.com' },
    })
    const res = mockRes()
    const next = vi.fn() as NextFunction

    requireRol('admin', 'encargado')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('llama a next() si el rol coincide', () => {
    const req = mockReq({
      employee: { id: '123', rol: 'encargado', email: 'e@test.com' },
    })
    const res = mockRes()
    const next = vi.fn() as NextFunction

    requireRol('admin', 'encargado')(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('llama a next() para rol admin cuando sólo se permite admin', () => {
    const req = mockReq({
      employee: { id: '123', rol: 'admin', email: 'admin@test.com' },
    })
    const res = mockRes()
    const next = vi.fn() as NextFunction

    requireRol('admin')(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
  })
})
