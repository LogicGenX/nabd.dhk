const { randomUUID } = require('crypto')

const LIST_RELATIONS = ['items','items.tax_lines','shipping_address','billing_address','customer','payments','fulfillments','shipping_methods','discounts','gift_cards']
const DETAIL_RELATIONS = ['items','items.tax_lines','items.variant','items.variant.product','shipping_address','billing_address','customer','payments','fulfillments','fulfillments.tracking_links','shipping_methods','discounts','gift_cards','refunds']
const NOTE_KEY = 'admin_lite_notes'
const MAX_LIST_LIMIT = 50
const DEFAULT_LIST_LIMIT = 20
const EXPORT_DEFAULT_LIMIT = 500
const EXPORT_MAX_LIMIT = 2000

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

const toArray = (value) => {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null) return []
  return String(value).split(',')
}

const parseStatuses = (value) => {
  const parts = toArray(value)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
  return parts.length ? parts : undefined
}

const parseDateRange = (from, to) => {
  const range = {}
  if (from) {
    const start = new Date(from)
    if (!Number.isNaN(start.valueOf())) range.gte = start
  }
  if (to) {
    const end = new Date(to)
    if (!Number.isNaN(end.valueOf())) range.lte = end
  }
  return Object.keys(range).length ? range : undefined
}

const resolveTotalsService = (scope) => {
  try {
    return scope.resolve('totalsService')
  } catch (err) {
    return null
  }
}

const computeTotals = async (scope, order) => {
  const totalsService = resolveTotalsService(scope)
  if (totalsService && typeof totalsService.getTotals === 'function') {
    try {
      const totals = await totalsService.getTotals(order, { force_taxes: true })
      if (totals) return totals
    } catch (err) {
      const logger = scope && scope.resolve ? scope.resolve('logger') : null
      if (logger && logger.warn) logger.warn('Admin Lite totals fallback: ' + err.message)
    }
  }
  return {
    subtotal: order.subtotal || 0,
    shipping_total: order.shipping_total || 0,
    tax_total: order.tax_total || 0,
    discount_total: order.discount_total || 0,
    total: order.total || 0,
    paid_total: order.paid_total || 0,
    refunded_total: order.refunded_total || 0,
  }
}

const buildName = (source) => {
  if (!source) return ''
  const parts = [source.first_name, source.last_name].filter(Boolean)
  return parts.join(' ').trim()
}

const buildCustomerSummary = (order) => {
  const billingName = buildName(order.billing_address)
  const shippingName = buildName(order.shipping_address)
  const customerName = buildName(order.customer)
  const name = billingName || shippingName || customerName || ''
  const email = order.email || (order.customer && order.customer.email) || null
  const phone =
    (order.shipping_address && order.shipping_address.phone) ||
    (order.billing_address && order.billing_address.phone) ||
    (order.customer && order.customer.phone) ||
    null
  return { name: name || null, email, phone }
}

const countItems = (order) => {
  if (!order.items) return 0
  return order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
}

const formatAddress = (addr) => {
  if (!addr) return null
  return {
    first_name: addr.first_name || null,
    last_name: addr.last_name || null,
    company: addr.company || null,
    address_1: addr.address_1 || null,
    address_2: addr.address_2 || null,
    city: addr.city || null,
    province: addr.province || null,
    postal_code: addr.postal_code || null,
    country_code: addr.country_code || null,
    phone: addr.phone || null,
  }
}

const mapVariantOptions = (item) => {
  if (!item.variant || !Array.isArray(item.variant.options)) return []
  const productOptions = Array.isArray(item.variant.product && item.variant.product.options)
    ? item.variant.product.options
    : []
  return item.variant.options.map((opt) => {
    const meta = productOptions.find((po) => po.id === opt.option_id)
    return { option_id: opt.option_id, title: meta ? meta.title : null, value: opt.value }
  })
}

const formatLineItem = (item) => ({
  id: item.id,
  title: item.title,
  description: item.description,
  sku: item.sku || (item.variant && item.variant.sku) || null,
  variant_title: (item.variant && item.variant.title) || item.title,
  quantity: item.quantity || 0,
  unit_price: item.unit_price || 0,
  subtotal: item.subtotal || item.unit_price * (item.quantity || 0) || 0,
  total: item.total || item.unit_price * (item.quantity || 0) || 0,
  tax_total: item.tax_total || 0,
  discount_total: item.discount_total || 0,
  original_total: item.original_total || item.total || 0,
  thumbnail: item.thumbnail || null,
  options: mapVariantOptions(item),
})

const formatPayments = (order) => {
  if (!Array.isArray(order.payments)) return []
  return order.payments.map((payment) => ({
    id: payment.id,
    provider_id: payment.provider_id,
    amount: payment.amount || 0,
    captured_amount: payment.captured_amount || 0,
    refunded_amount: payment.refunded_amount || 0,
    currency_code: payment.currency_code || order.currency_code,
    status: payment.status || order.payment_status,
    created_at: payment.created_at,
    captured_at: payment.captured_at,
    canceled_at: payment.canceled_at,
  }))
}

const formatFulfillments = (order) => {
  if (!Array.isArray(order.fulfillments)) return []
  return order.fulfillments.map((fulfillment) => ({
    id: fulfillment.id,
    status: fulfillment.status,
    shipped_at: fulfillment.shipped_at,
    canceled_at: fulfillment.canceled_at,
    tracking_links: Array.isArray(fulfillment.tracking_links)
      ? fulfillment.tracking_links.map((link) => ({
          id: link.id,
          url: link.url || null,
          tracking_number: link.tracking_number || null,
        }))
      : [],
    metadata: fulfillment.metadata || null,
  }))
}

const getNotes = (order) => {
  if (!order.metadata) return []
  const raw = order.metadata[NOTE_KEY]
  return Array.isArray(raw) ? raw : []
}

const formatListRecord = async (scope, order) => {
  const totals = await computeTotals(scope, order)
  const customer = buildCustomerSummary(order)
  return {
    id: order.id,
    display_id: order.display_id,
    order_number: order.display_id,
    created_at: order.created_at,
    updated_at: order.updated_at,
    currency_code: order.currency_code,
    customer,
    totals: {
      subtotal: totals.subtotal,
      shipping_total: totals.shipping_total,
      tax_total: totals.tax_total,
      discount_total: totals.discount_total,
      total: totals.total,
    },
    payment_status: order.payment_status,
    fulfillment_status: order.fulfillment_status,
    items_count: countItems(order),
  }
}

const formatDetailRecord = async (scope, order) => {
  const totals = await computeTotals(scope, order)
  return {
    id: order.id,
    display_id: order.display_id,
    order_number: order.display_id,
    status: order.status,
    created_at: order.created_at,
    updated_at: order.updated_at,
    currency_code: order.currency_code,
    customer: Object.assign(
      { id: order.customer_id || (order.customer && order.customer.id) || null },
      buildCustomerSummary(order)
    ),
    billing_address: formatAddress(order.billing_address),
    shipping_address: formatAddress(order.shipping_address),
    totals: {
      subtotal: totals.subtotal,
      shipping_total: totals.shipping_total,
      tax_total: totals.tax_total,
      discount_total: totals.discount_total,
      total: totals.total,
      paid_total: totals.paid_total,
      refunded_total: totals.refunded_total,
    },
    payment_status: order.payment_status,
    fulfillment_status: order.fulfillment_status,
    shipping_methods: order.shipping_methods || [],
    items: Array.isArray(order.items) ? order.items.map(formatLineItem) : [],
    payments: formatPayments(order),
    fulfillments: formatFulfillments(order),
    notes: getNotes(order),
  }
}

const fetchOrder = async (scope, id) => {
  const orderService = scope.resolve('orderService')
  return await orderService.retrieve(id, { relations: DETAIL_RELATIONS })
}

const listOrders = async (scope, selector, limit, offset) => {
  const orderService = scope.resolve('orderService')
  const listConfig = {
    relations: LIST_RELATIONS,
    skip: offset,
    take: limit,
    order: { created_at: 'DESC' },
  }
  return await orderService.listAndCount(selector, listConfig)
}

const escapeCsv = (value) => {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (!/[",\n\r]/.test(str)) return str
  return '"' + str.replace(/"/g, '""') + '"'
}

const buildItemsSummary = (order) => {
  if (!order.items) return ''
  return order.items
    .map((item) => {
      const title = item.title || 'Item'
      const quantity = item.quantity || 0
      return title + ' x' + quantity
    })
    .join('; ')
}

exports.list = async (req, res) => {
  const limit = sanitizeLimit(req.query.limit, DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT)
  const offset = sanitizeOffset(req.query.offset)
  const selector = {}
  const q = req.query.q && String(req.query.q).trim()
  if (q) selector.q = q
  const paymentStatuses = parseStatuses(req.query.payment_status)
  if (paymentStatuses) selector.payment_status = paymentStatuses
  const fulfillmentStatuses = parseStatuses(req.query.fulfillment_status)
  if (fulfillmentStatuses) selector.fulfillment_status = fulfillmentStatuses
  const createdRange = parseDateRange(req.query.created_from, req.query.created_to)
  if (createdRange) selector.created_at = createdRange
  const [orders, count] = await listOrders(req.scope, selector, limit, offset)
  const results = []
  for (const order of orders) {
    results.push(await formatListRecord(req.scope, order))
  }
  res.json({ orders: results, count, limit, offset })
}

exports.retrieve = async (req, res) => {
  const order = await fetchOrder(req.scope, req.params.id)
  const formatted = await formatDetailRecord(req.scope, order)
  res.json({ order: formatted })
}

exports.updatePayment = async (req, res) => {
  const action = req.body && typeof req.body.action === 'string' ? req.body.action.trim().toLowerCase() : ''
  if (!action) {
    res.status(400).json({ message: 'Action is required' })
    return
  }
  const orderService = req.scope.resolve('orderService')
  const order = await orderService.retrieve(req.params.id, { relations: DETAIL_RELATIONS })
  switch (action) {
    case 'capture':
      await orderService.capturePayment(order.id)
      break
    case 'refund':
      if (!order.paid_total || order.paid_total <= 0) {
        res.status(400).json({ message: 'Order has no captured payment to refund' })
        return
      }
      await orderService.createRefund(
        order.id,
        order.paid_total,
        'admin_lite',
        req.body && req.body.reason ? String(req.body.reason).trim() : 'Admin Lite full refund'
      )
      break
    case 'mark_paid':
      await orderService.markAsPaid(order.id)
      break
    default:
      res.status(400).json({ message: 'Unsupported payment action' })
      return
  }
  const updated = await fetchOrder(req.scope, order.id)
  const formatted = await formatDetailRecord(req.scope, updated)
  res.json({ order: formatted })
}

exports.updateFulfillment = async (req, res) => {
  const action = req.body && typeof req.body.action === 'string' ? req.body.action.trim().toLowerCase() : ''
  if (!action) {
    res.status(400).json({ message: 'Action is required' })
    return
  }
  const orderService = req.scope.resolve('orderService')
  const fulfillmentService = req.scope.resolve('fulfillmentService')
  const order = await orderService.retrieve(req.params.id, { relations: DETAIL_RELATIONS })
  const trackNumber = req.body && req.body.tracking_number ? String(req.body.tracking_number).trim() : ''
  const trackCarrier = req.body && req.body.tracking_carrier ? String(req.body.tracking_carrier).trim() : ''
  const trackingLinks = trackNumber ? [{ tracking_number: trackNumber, carrier: trackCarrier || undefined }] : []
  switch (action) {
    case 'mark_shipped': {
      const target = order.fulfillments && order.fulfillments.find((f) => !f.canceled_at)
      if (!target) {
        res.status(400).json({ message: 'No fulfillment available to mark as shipped' })
        return
      }
      await orderService.createShipment(order.id, target.id, trackingLinks.length ? trackingLinks : undefined)
      break
    }
    case 'cancel_fulfillment': {
      const openFulfillment = order.fulfillments && order.fulfillments.find((f) => !f.canceled_at)
      if (!openFulfillment) {
        res.status(400).json({ message: 'No fulfillment available to cancel' })
        return
      }
      await fulfillmentService.cancelFulfillment(openFulfillment.id)
      break
    }
    case 'mark_delivered': {
      const metadata = Object.assign({}, order.metadata || {})
      metadata.admin_lite_delivered_at = new Date().toISOString()
      await orderService.update(order.id, { metadata })
      break
    }
    default:
      res.status(400).json({ message: 'Unsupported fulfillment action' })
      return
  }
  const updated = await fetchOrder(req.scope, order.id)
  const formatted = await formatDetailRecord(req.scope, updated)
  res.json({ order: formatted })
}

exports.appendNote = async (req, res) => {
  const note = req.body && typeof req.body.note === 'string' ? req.body.note.trim() : ''
  if (!note) {
    res.status(400).json({ message: 'Note is required' })
    return
  }
  if (note.length > 2000) {
    res.status(400).json({ message: 'Note is too long' })
    return
  }
  const orderService = req.scope.resolve('orderService')
  const order = await orderService.retrieve(req.params.id, { select: ['metadata'] })
  const existingNotes = getNotes(order)
  const entry = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    author: (req.liteStaff && (req.liteStaff.email || req.liteStaff.name)) || 'staff',
    note,
  }
  const updatedNotes = existingNotes.concat(entry).slice(-50)
  const metadata = Object.assign({}, order.metadata || {}, { [NOTE_KEY]: updatedNotes })
  await orderService.update(order.id, { metadata })
  const refreshed = await fetchOrder(req.scope, order.id)
  const formatted = await formatDetailRecord(req.scope, refreshed)
  res.json({ order: formatted })
}

exports.exportCsv = async (req, res) => {
  const limit = sanitizeLimit(req.query.limit, EXPORT_DEFAULT_LIMIT, EXPORT_MAX_LIMIT)
  const offset = sanitizeOffset(req.query.offset)
  const selector = {}
  const q = req.query.q && String(req.query.q).trim()
  if (q) selector.q = q
  const paymentStatuses = parseStatuses(req.query.payment_status)
  if (paymentStatuses) selector.payment_status = paymentStatuses
  const fulfillmentStatuses = parseStatuses(req.query.fulfillment_status)
  if (fulfillmentStatuses) selector.fulfillment_status = fulfillmentStatuses
  const createdRange = parseDateRange(req.query.created_from, req.query.created_to)
  if (createdRange) selector.created_at = createdRange
  const [orders] = await listOrders(req.scope, selector, limit, offset)
  const header = [
    'order_id',
    'order_number',
    'created_at',
    'customer_name',
    'customer_email',
    'customer_phone',
    'city',
    'country',
    'items',
    'subtotal',
    'shipping_total',
    'tax_total',
    'discount_total',
    'total',
    'payment_status',
    'fulfillment_status',
  ]
  const rows = [header.map(escapeCsv).join(',')]
  for (const order of orders) {
    const totals = await computeTotals(req.scope, order)
    const customer = buildCustomerSummary(order)
    const city =
      (order.shipping_address && order.shipping_address.city) ||
      (order.billing_address && order.billing_address.city) ||
      ''
    const country =
      (order.shipping_address && order.shipping_address.country_code) ||
      (order.billing_address && order.billing_address.country_code) ||
      ''
    const row = [
      order.id,
      order.display_id,
      order.created_at,
      customer.name || '',
      customer.email || '',
      customer.phone || '',
      city,
      country,
      buildItemsSummary(order),
      totals.subtotal,
      totals.shipping_total,
      totals.tax_total,
      totals.discount_total,
      totals.total,
      order.payment_status,
      order.fulfillment_status,
    ]
    rows.push(row.map(escapeCsv).join(','))
  }
  const content = rows.join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  const filename = 'orders-export-' + new Date().toISOString().slice(0, 10) + '.csv'
  res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"')
  res.send(content)
}
