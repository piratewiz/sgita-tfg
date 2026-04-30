import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { beforeAll, afterAll, afterEach } from 'vitest'

process.env.JWT_SECRET = 'test-secret-sgita-2024'
process.env.JWT_EXPIRES_IN = '1h'

let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
}, 30000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
}, 30000)

afterEach(async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key]?.deleteMany({})
  }
})
