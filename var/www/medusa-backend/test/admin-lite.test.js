const assert = require('assert')
const express = require('express')
const request = require('supertest')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const adminLite = require('../src/api/admin/lite')

const clone = (value) => JSON.parse(JSON.stringify(value))

module.exports = async () => {
  process.env.ADMIN_LITE_JWT_SECRET = 'test-secret'
  process.env.ADMIN_LITE_RATE_LIMIT = '0'
  process.env.ADMIN_LITE_ALLOWED_ORIGINS = 'https://admin-lite.example.com,https://*.vercel.app'
  process.env.ADMIN_LITE_CURRENCY_CODE = 'bdt'

  const now = () => new Date().toISOString()

  const orderState = {
    id: 'order_1',
    display_id: '1001',
    order_number: '1001',
    status: 'pending',
    created_at: now(),
    updated_at: now(),
    currency_code: 'bdt',
    payment_status: 'awaiting',
    fulfillment_status: 'not_fulfilled',
    email: 'customer@example.com',
    subtotal: 5000,
    shipping_total: 500,
    tax_total: 0,
    discount_total: 0,
    total: 5500,
    paid_total: 0,
    refunded_total: 0,
    metadata: {},
    customer_id: 'cust_1',
    customer: {
      id: 'cust_1',
      email: 'customer@example.com',
      first_name: 'Test',
      last_name: 'Customer',
      phone: '+8801700000000',
    },
    shipping_address: {
      first_name: 'Ship',
      last_name: 'To',
      address_1: '123 Road',
      city: 'Dhaka',
      country_code: 'bd',
      phone: '+8801700000000',
    },
    billing_address: {
      first_name: 'Bill',
      last_name: 'To',
      address_1: '123 Road',
      city: 'Dhaka',
      country_code: 'bd',
      phone: '+8801700000000',
    },
    items: [
      {
        id: 'item_1',
        title: 'Crew Tee',
        description: 'Soft cotton tee',
        sku: 'TEE-1',
        quantity: 1,
        unit_price: 5000,
        subtotal: 5000,
        total: 5000,
        tax_total: 0,
        discount_total: 0,
        thumbnail: null,
        variant: {
          id: 'variant_1',
          title: 'Default',
          sku: 'TEE-1',
          options: [
            {
              option_id: 'opt_size',
              value: 'M',
            },
          ],
          product: {
            options: [
              { id: 'opt_size', title: 'Size' },
            ],
          },
        },
      },
    ],
    payments: [
      {
        id: 'pay_1',
        provider_id: 'manual',
        amount: 5500,
        captured_amount: 0,
        refunded_amount: 0,
        currency_code: 'bdt',
        status: 'pending',
        created_at: now(),
      },
    ],
    fulfillments: [
      {
        id: 'ful_1',
        status: 'not_fulfilled',
        shipped_at: null,
        canceled_at: null,
        tracking_links: [],
        metadata: {},
      },
    ],
    shipping_methods: [],
    discounts: [],
    gift_cards: [],
    refunds: [],
  }

  const customers = [
    {
      id: 'cust_1',
      email: 'customer@example.com',
      first_name: 'Test',
      last_name: 'Customer',
      phone: '+8801700000000',
      created_at: now(),
      updated_at: now(),
      metadata: {},
      addresses: [
        {
          id: 'addr_1',
          first_name: 'Test',
          last_name: 'Customer',
          address_1: '123 Road',
          city: 'Dhaka',
          country_code: 'bd',
          phone: '+8801700000000',
        },
      ],
    },
  ]

  const collections = [
    { id: 'col_1', title: 'Essentials', handle: 'essentials' },
  ]

  const categories = [
    { id: 'cat_tees', name: 'T-Shirts', handle: 't-shirts' },
  ]

  const productState = [
    {
      id: 'prod_1',
      title: 'Sample Tee',
      handle: 'sample-tee',
      status: 'published',
      description: 'Baseline tee',
      collection_id: 'col_1',
      collection: collections[0],
      categories: [{ id: 'cat_tees', name: 'T-Shirts' }],
      images: [{ id: 'img_1', url: 'https://cdn.example.com/sample.jpg' }],
      thumbnail: 'https://cdn.example.com/sample.jpg',
      metadata: {},
      variants: [
        {
          id: 'variant_prod_1',
          sku: 'TEE-1',
          prices: [{ currency_code: 'bdt', amount: 5000 }],
        },
      ],
      created_at: now(),
      updated_at: now(),
    },
  ]

  let productCounter = 2

  const totalsService = {
    getTotals: async () => ({
      subtotal: orderState.subtotal,
      shipping_total: orderState.shipping_total,
      tax_total: orderState.tax_total,
      discount_total: orderState.discount_total,
      total: orderState.total,
      paid_total: orderState.paid_total,
      refunded_total: orderState.refunded_total,
    }),
  }

  const orderService = {
    listAndCount: async () => [[clone(orderState)], 1],
    list: async () => [clone(orderState)],
    retrieve: async (id, config = {}) => {
      if (config.select && config.select.includes('metadata')) {
        return { id: orderState.id, metadata: clone(orderState.metadata) }
      }
      return clone(orderState)
    },
    capturePayment: async () => {
      orderState.payment_status = 'captured'
      orderState.payments[0].captured_amount = orderState.payments[0].amount
      orderState.paid_total = orderState.payments[0].amount
    },
    createRefund: async () => {
      orderState.payment_status = 'refunded'
      orderState.payments[0].refunded_amount = orderState.payments[0].amount
      orderState.refunded_total = orderState.payments[0].amount
    },
    markAsPaid: async () => {
      orderState.payment_status = 'captured'
      orderState.payments[0].captured_amount = orderState.payments[0].amount
      orderState.paid_total = orderState.payments[0].amount
    },
    createShipment: async () => {
      orderState.fulfillment_status = 'shipped'
      orderState.fulfillments[0].status = 'shipped'
    },
    update: async (id, data) => {
      if (data.metadata) {
        orderState.metadata = Object.assign({}, orderState.metadata, data.metadata)
      }
    },
  }

  const fulfillmentService = {
    cancelFulfillment: async () => {
      orderState.fulfillment_status = 'canceled'
      orderState.fulfillments[0].status = 'canceled'
      orderState.fulfillments[0].canceled_at = now()
    },
  }

  const customerService = {
    listAndCount: async () => [clone(customers), customers.length],
    list: async () => [clone(orderState)],
    retrieve: async (id) => {
      const target = customers.find((c) => c.id === id)
      if (!target) throw new Error('not found')
      return clone(target)
    },
    update: async (id, payload) => {
      const target = customers.find((c) => c.id === id)
      if (!target) throw new Error('not found')
      if (payload.note !== undefined) {
        target.metadata = Object.assign({}, target.metadata, { admin_lite_customer_note: payload.note })
        target.note = payload.note
        delete payload.note
      }
      Object.assign(target, payload)
    },
  }

  const productService = {
    listAndCount: async (selector = {}, config = {}) => {
      const { q, collection_id, status } = selector
      const skip = config.skip || 0
      const take = config.take || productState.length
      let results = productState.slice()
      if (q) {
        const query = String(q).toLowerCase()
        results = results.filter(
          (product) =>
            (product.title && product.title.toLowerCase().includes(query)) ||
            (product.handle && product.handle.toLowerCase().includes(query))
        )
      }
      if (collection_id) {
        results = results.filter((product) => product.collection_id === collection_id)
      }
      if (status) {
        results = results.filter((product) => product.status === status)
      }
      const paged = results.slice(skip, skip + take)
      return [clone(paged), results.length]
    },
    retrieve: async (id) => {
      const product = productState.find((entry) => entry.id === id)
      if (!product) throw new Error('not found')
      return clone(product)
    },
    create: async (data) => {
      const id = 'prod_' + productCounter
      productCounter += 1
      const variantId = 'variant_' + id
      const nowTs = now()
      const images = Array.isArray(data.images)
        ? data.images.map((image, index) => ({ id: 'img_' + id + '_' + index, url: image.url || image }))
        : []
      const product = {
        id,
        title: data.title,
        handle: data.handle || id,
        status: data.status || 'published',
        description: data.description || null,
        collection_id: data.collection_id || null,
        collection: collections.find((collection) => collection.id === data.collection_id) || null,
        categories: Array.isArray(data.categories)
          ? data.categories.map(({ id: categoryId }) => {
              const category = categories.find((entry) => entry.id === categoryId)
              return { id: categoryId, name: category ? category.name : categoryId }
            })
          : [],
        images,
        thumbnail: data.thumbnail || (images[0] && images[0].url) || null,
        metadata: data.metadata || {},
        variants: [
          {
            id: variantId,
            sku: data.variants && data.variants[0] ? data.variants[0].sku : null,
            prices: data.variants && data.variants[0] ? data.variants[0].prices : [],
          },
        ],
        created_at: nowTs,
        updated_at: nowTs,
      }
      productState.push(product)
      return clone(product)
    },
    update: async (id, data) => {
      const product = productState.find((entry) => entry.id === id)
      if (!product) throw new Error('not found')
      if (data.title !== undefined) product.title = data.title
      if (data.description !== undefined) product.description = data.description
      if (data.handle !== undefined) product.handle = data.handle
      if (data.status !== undefined) product.status = data.status
      if (data.collection_id !== undefined) {
        product.collection_id = data.collection_id
        product.collection = collections.find((collection) => collection.id === data.collection_id) || null
      }
      if (Array.isArray(data.categories)) {
        product.categories = data.categories.map(({ id: categoryId }) => {
          const category = categories.find((entry) => entry.id === categoryId)
          return { id: categoryId, name: category ? category.name : categoryId }
        })
      }
      if (Array.isArray(data.images)) {
        product.images = data.images.map((image, index) => ({ id: product.id + '_img_' + index, url: image.url || image }))
      }
      if (data.thumbnail !== undefined) product.thumbnail = data.thumbnail
      if (data.metadata) product.metadata = data.metadata
      product.updated_at = now()
      return clone(product)
    },
  }

  const productVariantService = {
    update: async (variantId, data) => {
      const product = productState.find((entry) => entry.variants.some((variant) => variant.id === variantId))
      if (!product) throw new Error('variant not found')
      const variant = product.variants.find((entry) => entry.id === variantId)
      if (data.prices) {
        variant.prices = data.prices
      }
      product.updated_at = now()
      return clone(variant)
    },
  }

  const productCollectionService = {
    list: async () => clone(collections),
  }

  const productCategoryService = {
    list: async () => clone(categories),
  }

  const fileService = {
    upload: async (file) => ({ url: 'https://cdn.example.com/' + file.originalname }),
  }

  const adminUser = {
    id: 'staff_1',
    email: 'staff@nabd.dhk',
    first_name: 'Staff',
    last_name: 'User',
    role: 'admin',
    metadata: {},
    deleted_at: null,
  }

  const adminUserRecord = {
    ...clone(adminUser),
    password_hash: bcrypt.hashSync('supersecret', 8),
  }

  const authService = {
    withTransaction: () => authService,
    authenticate: async (email, password) => {
      if (email === adminUser.email && password === 'supersecret') {
        return { success: true, user: clone(adminUser) }
      }
      return { success: false }
    },
  }

  const userService = {
    withTransaction: () => userService,
    retrieve: async (id) => {
      if (id === adminUserRecord.id) {
        return clone(adminUserRecord)
      }
      throw new Error('User not found')
    },
  }

  const adminRepository = {
    findOne: async ({ where }) => {
      const email = typeof where?.email === 'string' ? where.email.trim().toLowerCase() : ''
      if (!email) return null
      if (email === adminUserRecord.email) {
        return clone(adminUserRecord)
      }
      return null
    },
  }

  const manager = {
    transaction: async (handler) => handler({}),
    getRepository: () => adminRepository,
  }

  const logger = {
    warn: () => {},
    error: () => {},
  }

  const scope = {
    resolve: (key) => {
      switch (key) {
        case 'orderService':
          return orderService
        case 'fulfillmentService':
          return fulfillmentService
        case 'customerService':
          return customerService
        case 'totalsService':
          return totalsService
        case 'productService':
          return productService
        case 'productVariantService':
          return productVariantService
        case 'productCollectionService':
          return productCollectionService
        case 'productCategoryService':
          return productCategoryService
        case 'fileService':
          return fileService
        case 'logger':
          return logger
        case 'authService':
          return authService
        case 'userService':
          return userService
        case 'manager':
          return manager
        default:
          throw new Error('Unexpected scope key ' + key)
      }
    },
  }

  const buildApp = () => {
    const app = express()
    const rootRouter = express.Router()
    adminLite(rootRouter)
    app.use((req, res, next) => {
      req.scope = scope
      next()
    })
    app.use(rootRouter)
    return app
  }

  const token = jwt.sign({ sub: 'staff_1', email: 'staff@nabd.dhk', name: 'Staff User' }, process.env.ADMIN_LITE_JWT_SECRET)
  const authHeader = 'Bearer ' + token

  const originApp = buildApp()

  await request(originApp)
    .get('/admin/lite/orders')
    .set('Authorization', authHeader)
    .set('Origin', 'https://admin-lite.example.com')
    .expect(200)

  await request(originApp)
    .get('/admin/lite/orders')
    .set('Authorization', authHeader)
    .set('Origin', 'https://ops-dashboard.vercel.app')
    .expect(200)

  await request(originApp)
    .get('/admin/lite/orders')
    .set('Authorization', authHeader)
    .set('X-Forwarded-Host', 'ops-dashboard.vercel.app')
    .expect(200)

  const forbiddenRes = await request(originApp)
    .get('/admin/lite/orders')
    .set('Authorization', authHeader)
    .set('Origin', 'https://malicious.example.com')
    .expect(403)

  assert.strictEqual(forbiddenRes.body.message, 'Origin not allowed')

  process.env.ADMIN_LITE_ALLOWED_ORIGINS = ''

  const app = buildApp()

  const loginRes = await request(app)
    .post('/admin/lite/session')
    .send({ email: adminUser.email, password: 'supersecret' })
    .expect(200)

  assert.strictEqual(typeof loginRes.body.token, 'string')
  assert.strictEqual(loginRes.body.user.email, adminUser.email)
  assert.strictEqual(loginRes.body.user.first_name, adminUser.first_name)

  const sessionRes = await request(app)
    .get('/admin/lite/session')
    .set('Authorization', 'Bearer ' + loginRes.body.token)
    .expect(200)

  assert.strictEqual(sessionRes.body.authenticated, true)
  assert.strictEqual(sessionRes.body.user.email, adminUser.email)

  await request(app)
    .post('/admin/lite/session')
    .send({ email: adminUser.email, password: 'wrong-password' })
    .expect(401)

  const listRes = await request(app)
    .get('/admin/lite/orders')
    .set('Authorization', authHeader)
    .expect(200)

  assert.strictEqual(Array.isArray(listRes.body.orders), true)
  assert.strictEqual(listRes.body.orders.length, 1)
  assert.strictEqual(listRes.body.orders[0].customer.email, 'customer@example.com')
  assert.strictEqual(listRes.body.orders[0].totals.total, 5500)

  const detailRes = await request(app)
    .get('/admin/lite/orders/' + orderState.id)
    .set('Authorization', authHeader)
    .expect(200)

  assert.strictEqual(detailRes.body.order.payments.length, 1)
  assert.strictEqual(detailRes.body.order.items[0].options[0].title, 'Size')

  await request(app)
    .post('/admin/lite/orders/' + orderState.id + '/note')
    .set('Authorization', authHeader)
    .send({ note: 'Checked by QA' })
    .expect(200)

  assert.strictEqual(Array.isArray(orderState.metadata.admin_lite_notes), true)
  assert.strictEqual(orderState.metadata.admin_lite_notes[0].note, 'Checked by QA')

  await request(app)
    .patch('/admin/lite/orders/' + orderState.id + '/payment')
    .set('Authorization', authHeader)
    .send({ action: 'capture' })
    .expect(200)

  assert.strictEqual(orderState.payment_status, 'captured')
  assert.strictEqual(orderState.payments[0].captured_amount, 5500)

  await request(app)
    .patch('/admin/lite/orders/' + orderState.id + '/fulfillment')
    .set('Authorization', authHeader)
    .send({ action: 'mark_delivered' })
    .expect(200)

  assert.ok(orderState.metadata.admin_lite_delivered_at)

  const csvRes = await request(app)
    .get('/admin/lite/orders/export')
    .set('Authorization', authHeader)
    .expect(200)

  assert.ok(csvRes.text.includes('order_id'))
  assert.ok(csvRes.text.includes(orderState.id))

  const custList = await request(app)
    .get('/admin/lite/customers')
    .set('Authorization', authHeader)
    .expect(200)

  assert.strictEqual(custList.body.count, 1)
  assert.strictEqual(custList.body.customers[0].orders_count, 1)

  await request(app)
    .patch('/admin/lite/customers/' + customers[0].id)
    .set('Authorization', authHeader)
    .send({ note: 'VIP', phone: '+8801888888888' })
    .expect(200)

  assert.strictEqual(customers[0].metadata.admin_lite_customer_note, 'VIP')
  assert.strictEqual(customers[0].phone, '+8801888888888')

  const productList = await request(app)
    .get('/admin/lite/products')
    .set('Authorization', authHeader)
    .expect(200)

  assert.strictEqual(productList.body.count >= 1, true)
  assert.strictEqual(productList.body.products[0].price, 5000)

  const catalogRes = await request(app)
    .get('/admin/lite/catalog')
    .set('Authorization', authHeader)
    .expect(200)

  assert.strictEqual(catalogRes.body.collections.length, 1)
  assert.strictEqual(catalogRes.body.categories.length, 1)

  const createRes = await request(app)
    .post('/admin/lite/products')
    .set('Authorization', authHeader)
    .send({
      title: 'Fresh Drop',
      description: 'New arrival',
      collection_id: 'col_1',
      category_ids: ['cat_tees'],
      price: 6500,
      images: ['https://cdn.example.com/fresh.jpg'],
    })
    .expect(201)

  const createdProductId = createRes.body.product.id
  assert.strictEqual(createRes.body.product.price, 6500)

  await request(app)
    .put('/admin/lite/products/' + createdProductId)
    .set('Authorization', authHeader)
    .send({ title: 'Fresh Drop Updated', price: 7000 })
    .expect(200)

  const updated = productState.find((product) => product.id === createdProductId)
  assert.strictEqual(updated.title, 'Fresh Drop Updated')
  assert.strictEqual(updated.variants[0].prices[0].amount, 7000)

  const uploadRes = await request(app)
    .post('/admin/lite/uploads')
    .set('Authorization', authHeader)
    .attach('files', Buffer.from('sample'), 'sample.txt')
    .expect(201)

  assert.strictEqual(Array.isArray(uploadRes.body.uploads), true)
  assert.strictEqual(uploadRes.body.uploads[0].url.includes('sample.txt'), true)

  await request(app).get('/admin/lite/orders').expect(401)

  await request(app)
    .patch('/admin/lite/orders/' + orderState.id + '/payment')
    .set('Authorization', authHeader)
    .send({ action: 'unsupported' })
    .expect(400)

  process.env.ADMIN_LITE_JWT_SECRET = ''
  process.env.JWT_SECRET = 'fallback-secret'

  const fallbackApp = buildApp()
  const fallbackToken = jwt.sign(
    { sub: 'staff_fallback', email: 'fallback@nabd.dhk', name: 'Fallback Staff' },
    process.env.JWT_SECRET
  )

  await request(fallbackApp)
    .get('/admin/lite/orders')
    .set('Authorization', 'Bearer ' + fallbackToken)
    .expect(200)
}
