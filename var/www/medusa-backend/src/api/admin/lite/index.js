const express = require('express')
const fileUpload = require('multer')
const os = require('os')
const asyncHandler = require('./utils/async-handler')
const authenticateLite = require('./middlewares/auth')
const rateLimit = require('./middlewares/rate-limit')
const auth = require('./auth')
const sessionDebug = require('./session-debug')
const orders = require('./orders')
const customers = require('./customers')
const products = require('./products')
const uploads = require('./uploads')

const route = express.Router()
const publicRoute = express.Router()
const bodyLimit = process.env.ADMIN_LITE_BODY_LIMIT || '1mb'
const jsonBody = express.json({ limit: bodyLimit })
const urlencodedBody = express.urlencoded({ extended: false })
const uploadMiddleware = fileUpload({ dest: os.tmpdir() })

module.exports = (rootRouter) => {
  publicRoute.use(jsonBody)
  publicRoute.use(urlencodedBody)
  publicRoute.use(rateLimit)
  publicRoute.post('/session-debug', sessionDebug)
  publicRoute.post('/session', asyncHandler(auth.createSession))
  publicRoute.get('/session', authenticateLite, asyncHandler(auth.getSession))
  publicRoute.get('/ping', authenticateLite, (req, res) => res.json({ ok: true }))

  route.use(jsonBody)
  route.use(urlencodedBody)
  route.use(rateLimit)
  route.post('/session-debug', sessionDebug)
  route.post('/session', asyncHandler(auth.createSession))
  route.use(authenticateLite)

  rootRouter.use('/admin-lite', publicRoute)
  rootRouter.use('/admin/lite', route)

  route.get('/session', asyncHandler(auth.getSession))
  route.get('/ping', (req, res) => res.json({ ok: true }))

  route.get('/orders', asyncHandler(orders.list))
  route.get('/orders/export', asyncHandler(orders.exportCsv))
  route.get('/orders/:id', asyncHandler(orders.retrieve))
  route.patch('/orders/:id/payment', jsonBody, asyncHandler(orders.updatePayment))
  route.patch('/orders/:id/fulfillment', jsonBody, asyncHandler(orders.updateFulfillment))
  route.post('/orders/:id/note', jsonBody, asyncHandler(orders.appendNote))

  route.get('/customers', asyncHandler(customers.list))
  route.get('/customers/:id', asyncHandler(customers.retrieve))
  route.patch('/customers/:id', jsonBody, asyncHandler(customers.update))

  route.get('/products', asyncHandler(products.list))
  route.get('/products/:id', asyncHandler(products.retrieve))
  route.post('/products', jsonBody, asyncHandler(products.create))
  route.put('/products/:id', jsonBody, asyncHandler(products.update))
  route.patch('/products/:id/inventory', jsonBody, asyncHandler(products.updateInventory))
  route.get('/catalog', asyncHandler(products.catalog))
  route.post('/catalog/collections', jsonBody, asyncHandler(products.createCollection))
  route.post('/catalog/categories', jsonBody, asyncHandler(products.createCategory))
  route.post('/uploads', uploadMiddleware.array('files'), asyncHandler(uploads.upload))

  return rootRouter
}
