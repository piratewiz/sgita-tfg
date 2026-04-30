import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import Employee from '../../src/models/Employee.js'
import Provider from '../../src/models/Provider.js'
import type { Rol } from '../../src/models/Employee.js'

let counter = 0
function uid() {
  return `${Date.now()}${++counter}`
}

export function signToken(id: string, rol: Rol, email: string): string {
  return jwt.sign({ id, rol, email }, process.env.JWT_SECRET!, { expiresIn: '1h' })
}

export async function createEmployee(overrides: Partial<{
  name: string
  surname: string
  dni: string
  nss: string
  numberEmployee: string
  rol: Rol
  email: string
  password: string
  active: boolean
}> = {}) {
  const id = uid()
  const plainPassword = overrides.password ?? 'Password123'
  const hash = await bcrypt.hash(plainPassword, 10)

  const employee = await Employee.create({
    name: overrides.name ?? 'Empleado',
    surname: overrides.surname ?? 'Test',
    dni: overrides.dni ?? `1234567${id.slice(-1)}A`,
    nss: overrides.nss ?? `NSS${id}`,
    numberEmployee: overrides.numberEmployee ?? `EMP${id}`,
    rol: overrides.rol ?? 'empleado',
    email: overrides.email ?? `empleado${id}@test.com`,
    password: hash,
    active: overrides.active ?? true,
  })

  const token = signToken(employee._id.toString(), employee.rol, employee.email)
  return { employee, token, plainPassword }
}

export async function createProvider(overrides: Partial<{
  name: string
  contact: string
  phoneNumber: string
  email: string
  active: boolean
}> = {}) {
  const id = uid()
  return Provider.create({
    name: overrides.name ?? `Proveedor ${id}`,
    contact: overrides.contact ?? 'Contacto Test',
    phoneNumber: overrides.phoneNumber ?? '600000000',
    email: overrides.email ?? `proveedor${id}@test.com`,
    active: overrides.active ?? true,
  })
}

export function newObjectId() {
  return new mongoose.Types.ObjectId()
}
