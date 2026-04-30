import express from 'express'
import cors from 'cors'
import authRoutes from '../../src/routes/auth.routes.js'
import {
  incidenceRoutes,
  orderRoutes,
  productRoutes,
  providerRoutes,
  truckRoutes,
  employeesRoutes,
} from '../../src/routes/index.routes.js'
import batchRoutes, { batchRouterStatus } from '../../src/routes/batch.routes.js'

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.use('/api/auth', authRoutes)
  app.use('/api/providers', providerRoutes)
  app.use('/api/trucks', truckRoutes)
  app.use('/api/orders', orderRoutes)
  app.use('/api/orders', batchRoutes)
  app.use('/api/lots', batchRouterStatus)
  app.use('/api/products', productRoutes)
  app.use('/api/incidences', incidenceRoutes)
  app.use('/api/employees', employeesRoutes)

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Server is running' })
  })

  app.use((_req, res) => {
    res.status(404).json({ message: 'Endpoint not found' })
  })

  return app
}
