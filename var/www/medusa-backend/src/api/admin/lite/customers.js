const DEFAULT_LIST_LIMIT = 20
const MAX_LIST_LIMIT = 50
const NOTE_KEY = 'admin_lite_customer_note'

const sanitizeLimit = (value, fallback, max) => {
  const parsed = parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

const sanitizeOffset = (value) => {
  const parsed = parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

const buildName = (customer) => {
  if (!customer) return ''
  const parts = [customer.first_name, customer.last_name].filter(Boolean)
  return parts.join(' ').trim()
}

const formatAddress = (addr) => {
  if (!addr) return null
  return {
    id: addr.id,
    company: addr.company || null,
    first_name: addr.first_name || null,
    last_name: addr.last_name || null,
    address_1: addr.address_1 || null,
    address_2: addr.address_2 || null,
    city: addr.city || null,
    province: addr.province || null,
    postal_code: addr.postal_code || null,
    country_code: addr.country_code || null,
    phone: addr.phone || null,
    metadata: addr.metadata || null,
  }
}

const formatCustomerListRecord = async (scope, customer) => {
  const orderService = scope.resolve('orderService')
  const [orders, count] = await orderService.listAndCount(
    { customer_id: customer.id },
    { take: 1, order: { created_at: 'DESC' } }
  )
  const lastOrder = orders[0]
  return {
    id: customer.id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
    name: buildName(customer) || customer.email,
    phone: customer.phone || null,
    created_at: customer.created_at,
    updated_at: customer.updated_at,
    orders_count: count,
    last_order_at: lastOrder ? lastOrder.created_at : null,
  }
}

const formatOrderSummary = (order) => ({
  id: order.id,
  display_id: order.display_id,
  status: order.status,
  payment_status: order.payment_status,
  fulfillment_status: order.fulfillment_status,
  created_at: order.created_at,
  total: order.total || 0,
  currency_code: order.currency_code,
})

exports.list = async (req, res) => {
  const limit = sanitizeLimit(req.query.limit, DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT)
  const offset = sanitizeOffset(req.query.offset)
  const selector = {}
  const q = req.query.q && String(req.query.q).trim()
  if (q) selector.q = q
  const customerService = req.scope.resolve('customerService')
  const [customers, count] = await customerService.listAndCount(selector, {
    skip: offset,
    take: limit,
  })
  const results = []
  for (const customer of customers) {
    results.push(await formatCustomerListRecord(req.scope, customer))
  }
  res.json({ customers: results, count, limit, offset })
}

exports.retrieve = async (req, res) => {
  const customerService = req.scope.resolve('customerService')
  const orderService = req.scope.resolve('orderService')
  const customer = await customerService.retrieve(req.params.id, {
    relations: ['addresses'],
  })
  const orders = await orderService.list(
    { customer_id: customer.id },
    { take: 5, order: { created_at: 'DESC' } }
  )
  const metadata = customer.metadata || {}
  res.json({
    customer: {
      id: customer.id,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
      name: buildName(customer) || customer.email,
      phone: customer.phone || null,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
      note: metadata[NOTE_KEY] || null,
      addresses: Array.isArray(customer.addresses)
        ? customer.addresses.map(formatAddress)
        : [],
      recent_orders: orders.map(formatOrderSummary),
    },
  })
}

exports.update = async (req, res) => {
  const body = req.body || {}
  const payload = {}
  if (body.first_name !== undefined) payload.first_name = body.first_name || null
  if (body.last_name !== undefined) payload.last_name = body.last_name || null
  if (body.phone !== undefined) payload.phone = body.phone || null
  if (body.note !== undefined) {
    payload.metadata = payload.metadata || {}
    payload.metadata[NOTE_KEY] = body.note ? String(body.note) : null
  }
  if (Object.keys(payload).length === 0) {
    res.status(400).json({ message: 'No update fields provided' })
    return
  }
  const customerService = req.scope.resolve('customerService')
  await customerService.update(req.params.id, payload)
  const updated = await customerService.retrieve(req.params.id, {
    relations: ['addresses'],
  })
  const orderService = req.scope.resolve('orderService')
  const orders = await orderService.list(
    { customer_id: updated.id },
    { take: 5, order: { created_at: 'DESC' } }
  )
  res.json({
    customer: {
      id: updated.id,
      email: updated.email,
      first_name: updated.first_name,
      last_name: updated.last_name,
      name: buildName(updated) || updated.email,
      phone: updated.phone || null,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      note: (updated.metadata && updated.metadata[NOTE_KEY]) || null,
      addresses: Array.isArray(updated.addresses)
        ? updated.addresses.map(formatAddress)
        : [],
      recent_orders: orders.map(formatOrderSummary),
    },
  })
}
