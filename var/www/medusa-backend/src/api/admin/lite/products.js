const DEFAULT_RELATIONS = [
  'variants',
  'variants.prices',
  'variants.options',
  'options',
  'images',
  'categories',
  'collection',
]

const slugify = (value, fallbackPrefix) => {
  if (!value || typeof value !== 'string') {
    return fallbackPrefix + '-' + Date.now()
  }
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (base) return base
  return fallbackPrefix + '-' + Date.now()
}

const mapPrice = (product, currency) => {
  const variants = product.variants || []
  const variant = variants[0]
  if (!variant || !Array.isArray(variant.prices) || variant.prices.length === 0) {
    return { amount: 0, currency_code: currency }
  }
  const prioritized =
    variant.prices.find((price) => price.currency_code === currency) || variant.prices[0]
  return { amount: prioritized.amount || 0, currency_code: prioritized.currency_code || currency, variant_id: variant.id }
}

const mapVariantOptions = (variant) => {
  if (!variant || !Array.isArray(variant.options)) {
    return []
  }

  return variant.options.map((option) => ({
    id: option.id,
    option_id: option.option_id,
    value: option.value ?? null,
  }))
}

const mapVariantPrices = (variant, currency) => {
  if (!variant || !Array.isArray(variant.prices)) {
    return []
  }

  return variant.prices.map((price) => ({
    id: price.id,
    amount: typeof price.amount === 'number' ? price.amount : 0,
    currency_code: (price.currency_code || currency || '').toLowerCase(),
  }))
}

const mapVariants = (product, currency) => {
  if (!product || !Array.isArray(product.variants)) {
    return []
  }

  return product.variants.map((variant, index) => {
    const prices = mapVariantPrices(variant, currency)
    const prioritized =
      prices.find((price) => price.currency_code === currency) || prices[0] || null

    return {
      id: variant.id,
      title:
        variant.title ||
        (product.variants.length === 1
          ? 'Default'
          : 'Variant ' + (index + 1)),
      sku: variant.sku || null,
      inventory_quantity:
        typeof variant.inventory_quantity === 'number'
          ? variant.inventory_quantity
          : null,
      manage_inventory: !!variant.manage_inventory,
      allow_backorder: !!variant.allow_backorder,
      prices,
      price: prioritized ? prioritized.amount : 0,
      currency_code: prioritized ? prioritized.currency_code : currency,
      options: mapVariantOptions(variant),
      metadata: variant.metadata || null,
      created_at: variant.created_at,
      updated_at: variant.updated_at,
    }
  })
}

const toStringArray = (values) => {
  if (!Array.isArray(values)) {
    return []
  }
  return values
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

const uniqueStringArray = (values) => {
  const normalized = toStringArray(values)
  if (!normalized.length) return []
  const seen = new Set()
  const result = []
  for (const value of normalized) {
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }
  return result
}

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key)

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return fallback
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false
  }
  return fallback
}

const parseInventoryQuantity = (value, fallback = 0) => {
  const source = value !== undefined ? value : fallback
  const numeric = Number(source)
  if (!Number.isFinite(numeric)) return Math.max(0, Math.round(Number(fallback) || 0))
  const rounded = Math.round(numeric)
  if (rounded < 0) return 0
  return rounded
}

const coerceInventoryQuantity = (value) => {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return 0
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) return null
    const rounded = Math.round(parsed)
    return rounded < 0 ? 0 : rounded
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    const rounded = Math.round(value)
    return rounded < 0 ? 0 : rounded
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const rounded = Math.round(parsed)
  return rounded < 0 ? 0 : rounded
}

const normalizeVariantOptionUpdates = (entries, productOptions) => {
  if (!Array.isArray(entries) || !entries.length) return []
  const allowed = new Set(
    Array.isArray(productOptions)
      ? productOptions
          .map((option) => (option && typeof option.id === 'string' ? option.id : null))
          .filter(Boolean)
      : []
  )
  if (!allowed.size) return []
  const normalized = []
  const seen = new Set()
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const optionId =
      typeof entry.option_id === 'string' && entry.option_id.trim()
        ? entry.option_id.trim()
        : typeof entry.id === 'string' && entry.id.trim()
          ? entry.id.trim()
          : null
    if (!optionId || !allowed.has(optionId) || seen.has(optionId)) continue
    seen.add(optionId)
    const value =
      entry.value === null || entry.value === undefined ? '' : String(entry.value)
    normalized.push({ option_id: optionId, value })
  }
  return normalized
}

const normalizeVariantConfig = (variant, legacy = {}) => {
  const base = variant && typeof variant === 'object' ? variant : {}
  const fallback = legacy && typeof legacy === 'object' ? legacy : {}
  const rawSku = base.sku ?? fallback.sku ?? null
  const manageInventory = parseBoolean(
    base.manage_inventory,
    parseBoolean(fallback.manage_inventory, true)
  )
  const allowBackorder = parseBoolean(
    base.allow_backorder,
    parseBoolean(fallback.allow_backorder, false)
  )
  const inventoryQuantity = parseInventoryQuantity(
    base.inventory_quantity ?? fallback.inventory_quantity ?? 0,
    0
  )

  return {
    sku: typeof rawSku === 'string' && rawSku.trim() ? rawSku.trim() : null,
    manage_inventory: manageInventory,
    allow_backorder: allowBackorder,
    inventory_quantity: manageInventory ? inventoryQuantity : inventoryQuantity,
  }
}

const resolveLogger = (req) => {
  const scope = req && typeof req === 'object' ? req.scope : null
  if (!scope || typeof scope.resolve !== 'function') return null
  try {
    return scope.resolve('logger')
  } catch (error) {
    return null
  }
}

const resolveDefaultSalesChannel = async (req) => {
  const scope = req && typeof req === 'object' ? req.scope : null
  if (!scope || typeof scope.resolve !== 'function') return null

  let service = null
  try {
    service = scope.resolve('salesChannelService')
  } catch (error) {
    return null
  }

  if (!service || typeof service !== 'object') return null

  if (typeof service.retrieveDefault === 'function') {
    try {
      const channel = await service.retrieveDefault()
      if (channel && typeof channel.id === 'string') return channel.id
    } catch (error) {
      const logger = resolveLogger(req)
      if (logger && typeof logger.warn === 'function') {
        logger.warn('[admin-lite] default sales channel lookup failed: ' + (error?.message || error))
      }
    }
  }

  if (typeof service.listAndCount === 'function') {
    try {
      const result = await service.listAndCount({ is_default: true }, { skip: 0, take: 1 })
      const channels = Array.isArray(result) ? result[0] : []
      const entry = Array.isArray(channels) ? channels[0] : channels
      if (entry && typeof entry.id === 'string') return entry.id
    } catch (error) {
      const logger = resolveLogger(req)
      if (logger && typeof logger.warn === 'function') {
        logger.warn('[admin-lite] fallback default sales channel lookup failed: ' + (error?.message || error))
      }
    }
  }

  return null
}

const ensureProductInDefaultSalesChannel = async (req, productId) => {
  if (!productId) return
  const scope = req && typeof req === 'object' ? req.scope : null
  if (!scope || typeof scope.resolve !== 'function') return

  let service = null
  try {
    service = scope.resolve('salesChannelService')
  } catch (error) {
    return
  }

  if (!service || typeof service.addProducts !== 'function') return

  const channelId = await resolveDefaultSalesChannel(req)
  if (!channelId) return

  try {
    await service.addProducts(channelId, [productId])
  } catch (error) {
    const logger = resolveLogger(req)
    if (logger && typeof logger.warn === 'function') {
      logger.warn('[admin-lite] failed to add product ' + productId + ' to sales channel ' + channelId + ': ' + (error?.message || error))
    }
  }
}

const collectSizeValuesFromProduct = (product) => {
  const result = []
  const seen = new Set()

  const options = Array.isArray(product?.options) ? product.options : []
  const sizeOption = options.find((option) => {
    if (!option || typeof option?.title !== 'string') return false
    return option.title.trim().toLowerCase() === 'size'
  })

  if (sizeOption && sizeOption.id) {
    const variants = Array.isArray(product?.variants) ? product.variants : []
    for (const variant of variants) {
      const variantOptions = Array.isArray(variant?.options) ? variant.options : []
      const match = variantOptions.find((opt) => opt?.option_id === sizeOption.id)
      const rawValue = typeof match?.value === 'string' ? match.value.trim() : ''
      if (!rawValue) continue
      const key = rawValue.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      result.push(rawValue)
    }
  }

  const metadataSizes = uniqueStringArray(product?.metadata?.available_sizes)
  for (const entry of metadataSizes) {
    const key = entry.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(entry)
  }

  return result
}

const collectColorValuesFromProduct = (product) => {
  return uniqueStringArray(product?.metadata?.available_colors)
}

const listCategories = async (categoryService, config = {}) => {
  const selector = {}
  const baseConfig = { skip: 0, take: 1000, ...config }

  if (categoryService && typeof categoryService.list === 'function') {
    return categoryService.list(selector, baseConfig)
  }

  if (categoryService && typeof categoryService.listAndCount === 'function') {
    const [categories] = await categoryService.listAndCount(selector, baseConfig)
    return categories
  }

  throw new Error('Product category service does not support listing categories')
}

const isDuplicateHandleError = (error) => {
  if (!error || typeof error !== 'object') return false
  if (typeof error.code === 'string' && error.code === '23505' && typeof error.detail === 'string') {
    return error.detail.toLowerCase().includes('handle')
  }
  if (typeof error.message === 'string') {
    return error.message.toLowerCase().includes('handle') && error.message.toLowerCase().includes('duplicate')
  }
  return false
}

const serializeProduct = (product, currency) => {
  const price = mapPrice(product, currency)
  const variants = mapVariants(product, currency)
  const options = Array.isArray(product.options)
    ? product.options.map((option) => ({
        id: option.id,
        title: option.title,
      }))
    : []
  const metadata =
    product && product.metadata && typeof product.metadata === 'object'
      ? product.metadata
      : null
  const sizeValues = collectSizeValuesFromProduct(product)
  const colorValues = collectColorValuesFromProduct(product)
  const primaryVariant = variants[0] || null
  const variantDefaults = primaryVariant
    ? {
        sku: primaryVariant.sku,
        manage_inventory: !!primaryVariant.manage_inventory,
        allow_backorder: !!primaryVariant.allow_backorder,
        inventory_quantity:
          typeof primaryVariant.inventory_quantity === 'number'
            ? primaryVariant.inventory_quantity
            : 0,
      }
    : {
        sku: null,
        manage_inventory: true,
        allow_backorder: false,
        inventory_quantity: 0,
      }
  const inStock = variants.some((variant) => {
    if (!variant.manage_inventory) return true
    return (variant.inventory_quantity ?? 0) > 0
  })

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    status: product.status,
    description: product.description,
    collection: product.collection
      ? { id: product.collection.id, title: product.collection.title }
      : null,
    collection_id: product.collection_id || (product.collection && product.collection.id) || null,
    categories: Array.isArray(product.categories)
      ? product.categories.map((category) => ({ id: category.id, name: category.name }))
      : [],
    category_ids: Array.isArray(product.categories) ? product.categories.map((category) => category.id) : [],
    thumbnail: product.thumbnail || (product.images && product.images[0] && product.images[0].url) || null,
    images: Array.isArray(product.images) ? product.images.map((image) => image.url) : [],
    image_objects: Array.isArray(product.images)
      ? product.images.map((image) => ({ id: image.id, url: image.url }))
      : [],
    options,
    variants,
    in_stock: inStock,
    price: price.amount || 0,
    currency_code: price.currency_code || currency,
    variant_id: price.variant_id || null,
    sku: product.variants && product.variants[0] ? product.variants[0].sku : null,
    metadata,
    available_sizes: sizeValues,
    available_colors: colorValues,
    variant_defaults: variantDefaults,
    created_at: product.created_at,
    updated_at: product.updated_at,
  }
}
const extractProductSizes = (products) => {
  if (!Array.isArray(products)) return []

  const sizes = new Map()

  for (const product of products) {
    const values = collectSizeValuesFromProduct(product)
    for (const value of values) {
      const normalized = value.toLowerCase()
      if (!sizes.has(normalized)) sizes.set(normalized, value)
    }
  }

  return Array.from(sizes.values()).sort((a, b) => a.localeCompare(b))
}

const extractProductColors = (products) => {
  if (!Array.isArray(products)) return []

  const colors = new Map()
  for (const product of products) {
    const values = collectColorValuesFromProduct(product)
    for (const value of values) {
      const normalized = value.toLowerCase()
      if (!colors.has(normalized)) colors.set(normalized, value)
    }
  }

  return Array.from(colors.values()).sort((a, b) => a.localeCompare(b))
}

const parseLimit = (value, fallback, max) => {
  const parsed = parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

const parseOffset = (value) => {
  const parsed = parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const DEFAULT_CURRENCY = (process.env.ADMIN_LITE_CURRENCY_CODE || 'bdt').toLowerCase()

exports.list = async (req, res) => {
  const limit = parseLimit(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT)
  const offset = parseOffset(req.query.offset)
  const selector = {}
  if (req.query.q) selector.q = String(req.query.q).trim()
  if (req.query.collection_id) selector.collection_id = req.query.collection_id
  if (req.query.status) selector.status = req.query.status

  const sizeFilter = req.query.size ? String(req.query.size).trim().toLowerCase() : null

  const productService = req.scope.resolve('productService')

  const mapAndRespond = (products, count) => {
    const payload = products.map((product) => serializeProduct(product, DEFAULT_CURRENCY))
    res.json({ products: payload, count, limit, offset })
  }

  if (sizeFilter) {
    const allProducts = await productService.list(selector, {
      relations: DEFAULT_RELATIONS,
    })

    const filtered = allProducts.filter((product) => {
      if (!Array.isArray(product.options)) return false
      const sizeOption = product.options.find((option) => option?.title && option.title.toLowerCase() === 'size')
      if (!sizeOption || !sizeOption.id) return false
      return Array.isArray(product.variants) && product.variants.some((variant) => {
        return Array.isArray(variant.options) && variant.options.some((option) => {
          return option?.option_id === sizeOption.id && typeof option?.value === 'string' && option.value.toLowerCase() === sizeFilter
        })
      })
    })

    const count = filtered.length
    const paginated = filtered.slice(offset, offset + limit)
    return mapAndRespond(paginated, count)
  }

  const [products, count] = await productService.listAndCount(selector, {
    relations: DEFAULT_RELATIONS,
    skip: offset,
    take: limit,
  })

  mapAndRespond(products, count)
}

exports.retrieve = async (req, res) => {
  const productService = req.scope.resolve('productService')
  const product = await productService.retrieve(req.params.id, {
    relations: DEFAULT_RELATIONS,
  })
  res.json({ product: serializeProduct(product, DEFAULT_CURRENCY) })
}

const validateProductPayload = (body) => {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid payload')
  }
  if (!body.title || !body.title.trim()) {
    throw new Error('Title is required')
  }
  if (!body.collection_id) {
    throw new Error('Collection is required')
  }
  if (typeof body.collection_id === 'string' && !body.collection_id.trim()) {
    throw new Error('Collection is required')
  }
  if (
    !Array.isArray(body.category_ids) ||
    toStringArray(body.category_ids).length === 0
  ) {
    throw new Error('At least one category is required')
  }
  if (body.price === undefined || body.price === null || Number.isNaN(Number(body.price))) {
    throw new Error('Price is required')
  }
}

exports.create = async (req, res) => {
  try {
    validateProductPayload(req.body)
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }

  const {
    title,
    description,
    handle,
    status = 'published',
    collection_id,
    category_ids,
    price,
    thumbnail,
    images = [],
    metadata,
    variant,
    inventory_quantity,
    manage_inventory,
    allow_backorder,
    sku,
    available_sizes,
    available_colors,
    sizes,
    colors,
  } = req.body

  const productService = req.scope.resolve('productService')
  const numericPrice = Math.round(Number(price))
  const imageUrls = toStringArray(images)
  const categoryRecords = toStringArray(category_ids).map((id) => ({ id }))
  const collectionId = typeof collection_id === 'string' ? collection_id.trim() : collection_id
  const thumbnailUrl =
    typeof thumbnail === 'string' && thumbnail.trim()
      ? thumbnail.trim()
      : imageUrls[0] || undefined
  const metadataPayloadBase =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? { ...metadata } : {}
  const sizeValues = uniqueStringArray(available_sizes ?? sizes)
  const colorValues = uniqueStringArray(available_colors ?? colors)
  if (sizeValues.length) metadataPayloadBase.available_sizes = sizeValues
  if (colorValues.length) metadataPayloadBase.available_colors = colorValues
  const metadataPayload =
    metadataPayloadBase && Object.keys(metadataPayloadBase).length > 0
      ? metadataPayloadBase
      : undefined
  const normalizedHandle =
    typeof handle === 'string' && handle.trim()
      ? handle.trim()
      : slugify(title, 'product')
  const variantConfig = normalizeVariantConfig(variant, {
    inventory_quantity,
    manage_inventory,
    allow_backorder,
    sku,
  })

  const payload = {
    title,
    description,
    handle: normalizedHandle,
    status,
    collection_id: collectionId,
    categories: categoryRecords,
    images: imageUrls,
    thumbnail: thumbnailUrl,
    metadata: metadataPayload,
    options: [],
    variants: [
      {
        title: 'Default',
        sku: variantConfig.sku || undefined,
        inventory_quantity: variantConfig.inventory_quantity,
        manage_inventory: variantConfig.manage_inventory,
        allow_backorder: variantConfig.allow_backorder,
        prices: [
          {
            amount: numericPrice,
            currency_code: DEFAULT_CURRENCY,
          },
        ],
        options: [],
      },
    ],
  }

  let created
  try {
    created = await productService.create(payload)
  } catch (error) {
    if (isDuplicateHandleError(error)) {
      const retryPayload = {
        ...payload,
        handle: slugify(title + '-' + Date.now(), 'product'),
      }
      try {
        created = await productService.create(retryPayload)
      } catch (retryError) {
        const statusCode = typeof retryError?.statusCode === 'number' ? retryError.statusCode : 500
        const message =
          typeof retryError?.message === 'string' && retryError.message.trim()
            ? retryError.message
            : 'Failed to create product'
        const logger = req.scope?.resolve?.('logger')
        if (logger?.error) {
          logger.error('[admin-lite] create product failed after retry', { message, error: retryError })
        } else {
          console.error('[admin-lite] create product failed after retry', retryError)
        }
        return res.status(statusCode).json({ message })
      }
    } else {
      const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500
      const message =
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Failed to create product'
      const logger = req.scope?.resolve?.('logger')
      if (logger?.error) {
        logger.error('[admin-lite] create product failed', { message, error })
      } else {
        console.error('[admin-lite] create product failed', error)
      }
      return res.status(statusCode).json({ message })
    }
  }
  await ensureProductInDefaultSalesChannel(req, created?.id)
  const product = await productService.retrieve(created.id, { relations: DEFAULT_RELATIONS })
  res.status(201).json({ product: serializeProduct(product, DEFAULT_CURRENCY) })
}

exports.update = async (req, res) => {
  const productId = req.params.id
  const {
    title,
    description,
    handle,
    status,
    collection_id,
    category_ids,
    price,
    thumbnail,
    images,
    metadata,
    variant,
    inventory_quantity,
    manage_inventory,
    allow_backorder,
    sku,
    available_sizes,
    available_colors,
    sizes,
    colors,
  } = req.body || {}

  if (
    category_ids !== undefined &&
    (
      !Array.isArray(category_ids) ||
      toStringArray(category_ids).length === 0
    )
  ) {
    return res.status(400).json({ message: 'At least one category is required' })
  }

  const productService = req.scope.resolve('productService')
  const productVariantService = req.scope.resolve('productVariantService')

  let existing
  try {
    existing = await productService.retrieve(productId, {
      relations: ['variants', 'variants.prices'],
    })
  } catch (error) {
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500
    const message =
      typeof error?.message === 'string' && error.message.trim()
        ? error.message
        : 'Failed to load product'
    return res.status(statusCode).json({ message })
  }

  const updatePayload = {}
  if (title !== undefined) updatePayload.title = title
  if (description !== undefined) updatePayload.description = description
  if (status !== undefined) updatePayload.status = status
  if (collection_id !== undefined) {
    if (typeof collection_id === 'string') {
      const trimmedCollection = collection_id.trim()
      updatePayload.collection_id = trimmedCollection || null
    } else {
      updatePayload.collection_id = collection_id
    }
  }
  if (thumbnail !== undefined) {
    if (typeof thumbnail === 'string') {
      const trimmedThumbnail = thumbnail.trim()
      updatePayload.thumbnail = trimmedThumbnail || null
    } else {
      updatePayload.thumbnail = thumbnail
    }
  }
  const metadataProvided =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
  let metadataBase = metadataProvided
    ? { ...metadata }
    : existing.metadata && typeof existing.metadata === 'object'
      ? { ...existing.metadata }
      : {}
  let metadataChanged = !!metadataProvided

  const sizeInput = available_sizes !== undefined ? available_sizes : sizes
  if (sizeInput !== undefined) {
    const values = uniqueStringArray(sizeInput)
    metadataChanged = true
    if (values.length) metadataBase.available_sizes = values
    else delete metadataBase.available_sizes
  }

  const colorInput = available_colors !== undefined ? available_colors : colors
  if (colorInput !== undefined) {
    const values = uniqueStringArray(colorInput)
    metadataChanged = true
    if (values.length) metadataBase.available_colors = values
    else delete metadataBase.available_colors
  }

  if (metadataChanged) {
    updatePayload.metadata = metadataBase
  }

  if (Array.isArray(images)) updatePayload.images = toStringArray(images)
  if (Array.isArray(category_ids)) updatePayload.categories = toStringArray(category_ids).map((id) => ({ id }))
  if (handle !== undefined) {
    if (typeof handle === 'string' && handle.trim()) {
      updatePayload.handle = handle.trim()
    } else if (typeof title === 'string' && title.trim()) {
      updatePayload.handle = slugify(title, 'product')
    }
  }

  if (Object.keys(updatePayload).length > 0) {
    try {
      await productService.update(productId, updatePayload)
    } catch (error) {
      if (isDuplicateHandleError(error)) {
        const fallbackHandle =
          typeof updatePayload.handle === 'string' && updatePayload.handle.trim()
            ? updatePayload.handle + '-' + Date.now()
            : slugify((typeof title === 'string' && title.trim() ? title : 'product') + '-' + Date.now(), 'product')
        await productService.update(productId, { ...updatePayload, handle: fallbackHandle })
      } else {
        throw error
      }
    }
  }

  const variantBody = variant && typeof variant === 'object' ? variant : {}
  const manageProvided = hasOwn(variantBody, 'manage_inventory') || manage_inventory !== undefined
  const allowProvided = hasOwn(variantBody, 'allow_backorder') || allow_backorder !== undefined
  const inventoryProvided =
    hasOwn(variantBody, 'inventory_quantity') || inventory_quantity !== undefined
  const skuProvided = hasOwn(variantBody, 'sku') || sku !== undefined

  const variantUpdate = {}
  if (manageProvided || allowProvided || inventoryProvided || skuProvided) {
    if (!existing.variants || !existing.variants.length) {
      return res.status(400).json({ message: 'Product has no variants to update' })
    }
    const config = normalizeVariantConfig(variantBody, {
      inventory_quantity,
      manage_inventory,
      allow_backorder,
      sku,
    })
    if (manageProvided) variantUpdate.manage_inventory = config.manage_inventory
    if (allowProvided) variantUpdate.allow_backorder = config.allow_backorder
    if (inventoryProvided) variantUpdate.inventory_quantity = config.inventory_quantity
    if (skuProvided) variantUpdate.sku = config.sku
  }

  if (price !== undefined && price !== null && !Number.isNaN(Number(price))) {
    const numericPrice = Math.round(Number(price))
    variantUpdate.prices = [
      {
        amount: numericPrice,
        currency_code: DEFAULT_CURRENCY,
      },
    ]
  }

  if (Object.keys(variantUpdate).length > 0) {
    const targetVariant = existing.variants && existing.variants[0]
    if (!targetVariant) {
      return res.status(400).json({ message: 'Product has no variants to update' })
    }
    await productVariantService.update(targetVariant.id, variantUpdate)
  }

  await ensureProductInDefaultSalesChannel(req, productId)
  const refreshed = await productService.retrieve(productId, { relations: DEFAULT_RELATIONS })
  res.json({ product: serializeProduct(refreshed, DEFAULT_CURRENCY) })
}

exports.catalog = async (req, res) => {
  const collectionService = req.scope.resolve('productCollectionService')
  const categoryService = req.scope.resolve('productCategoryService')
  const productService = req.scope.resolve('productService')

  const categoryConfig = { select: ['id', 'name', 'handle'] }

  const [collections, categories, products] = await Promise.all([
    collectionService.list({}, { select: ['id', 'title', 'handle'] }),
    listCategories(categoryService, categoryConfig),
    productService.list(
      {},
      {
        select: ['id'],
        relations: ['options', 'variants', 'variants.options'],
        skip: 0,
        take: 1000,
      }
    ),
  ])

  res.json({
    collections: collections.map((collection) => ({
      id: collection.id,
      title: collection.title,
      handle: collection.handle,
    })),
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      handle: category.handle,
    })),
    sizes: extractProductSizes(products),
    colors: extractProductColors(products),
  })
}

exports.createCollection = async (req, res) => {
  const { title, handle } = req.body || {}
  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Collection title is required' })
  }

  const collectionService = req.scope.resolve('productCollectionService')
  const payload = {
    title: title.trim(),
    handle: typeof handle === 'string' && handle.trim()
      ? handle.trim().toLowerCase()
      : slugify(title, 'collection'),
  }

  const created = await collectionService.create(payload)
  res.status(201).json({
    collection: {
      id: created.id,
      title: created.title,
      handle: created.handle,
    },
  })
}

exports.createCategory = async (req, res) => {
  const { name, handle, parent_category_id: parentCategoryId } = req.body || {}
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Category name is required' })
  }

  const categoryService = req.scope.resolve('productCategoryService')
  const payload = {
    name: name.trim(),
    handle: typeof handle === 'string' && handle.trim()
      ? handle.trim().toLowerCase()
      : slugify(name, 'category'),
    is_active: true,
    is_internal: false,
  }

  if (parentCategoryId) {
    payload.parent_category_id = parentCategoryId
  }

  const created = await categoryService.create(payload)
  res.status(201).json({
    category: {
      id: created.id,
      name: created.name,
      handle: created.handle,
    },
  })
}

exports.updateVariant = async (req, res) => {
  const variantId = req.params.id
  if (!variantId) {
    return res.status(400).json({ message: 'Variant id is required' })
  }

  const body = req.body || {}
  const hasManageInventory = hasOwn(body, 'manage_inventory')
  const hasAllowBackorder = hasOwn(body, 'allow_backorder')
  const hasInventory = hasOwn(body, 'inventory_quantity')
  const hasOptions = Array.isArray(body.options)

  if (!hasManageInventory && !hasAllowBackorder && !hasInventory && !hasOptions) {
    return res.status(400).json({ message: 'No variant fields provided' })
  }

  const variantService = req.scope.resolve('productVariantService')
  const productService = req.scope.resolve('productService')
  const manager = req.scope.resolve('manager')

  let variant
  try {
    variant = await variantService.retrieve(variantId, {
      relations: ['product', 'product.options', 'options'],
    })
  } catch (error) {
    return res.status(404).json({ message: 'Variant not found' })
  }

  const updates = {}

  if (hasManageInventory) {
    updates.manage_inventory = parseBoolean(body.manage_inventory, !!variant.manage_inventory)
  }

  if (hasAllowBackorder) {
    updates.allow_backorder = parseBoolean(body.allow_backorder, !!variant.allow_backorder)
  }

  if (hasInventory) {
    const coerced = coerceInventoryQuantity(body.inventory_quantity)
    if (coerced === null) {
      return res.status(400).json({ message: 'inventory_quantity must be numeric' })
    }
    updates.inventory_quantity = coerced
  }

  if (updates.manage_inventory === false && !hasInventory) {
    updates.inventory_quantity = 0
  }

  const optionUpdates = normalizeVariantOptionUpdates(
    body.options,
    variant?.product?.options || []
  )
  if (optionUpdates.length) {
    updates.options = optionUpdates
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ message: 'No valid variant fields to update' })
  }

  try {
    await manager.transaction(async (transactionManager) => {
      await variantService.withTransaction(transactionManager).update(variantId, updates)
    })

    const product = await productService.retrieve(variant.product_id, {
      relations: DEFAULT_RELATIONS,
    })
    res.json({ product: serializeProduct(product, DEFAULT_CURRENCY) })
  } catch (error) {
    let logger = null
    try {
      logger = req.scope?.resolve('logger')
    } catch (loggerError) {
      logger = null
    }
    if (logger?.error) {
      logger.error(
        '[admin-lite] variant update failed for ' +
          variantId +
          ': ' +
          (error?.message || error)
      )
    }
    res.status(500).json({ message: 'Failed to update variant' })
  }
}

exports.updateInventory = async (req, res) => {
  const productId = req.params.id
  const { in_stock, variant_ids: variantIds } = req.body || {}
  if (typeof in_stock !== 'boolean') {
    return res.status(400).json({ message: 'in_stock must be boolean' })
  }

  const productService = req.scope.resolve('productService')
  const productVariantService = req.scope.resolve('productVariantService')
  const manager = req.scope.resolve('manager')

  const product = await productService.retrieve(productId, {
    relations: ['variants'],
  })

  if (!Array.isArray(product.variants) || product.variants.length === 0) {
    return res.status(400).json({ message: 'Product has no variants to update' })
  }

  const targetIds = Array.isArray(variantIds) && variantIds.length
    ? product.variants.filter((variant) => variantIds.includes(variant.id)).map((variant) => variant.id)
    : product.variants.map((variant) => variant.id)

  if (!targetIds.length) {
    return res.status(400).json({ message: 'No matching variants found for update' })
  }

  await manager.transaction(async (transactionManager) => {
    const variantRepo = productVariantService.withTransaction(transactionManager)
    for (const variant of product.variants) {
      if (!targetIds.includes(variant.id)) continue
      const payload = {
        manage_inventory: true,
      }
      if (in_stock) {
        const quantity = typeof variant.inventory_quantity === 'number' ? variant.inventory_quantity : 0
        payload.inventory_quantity = quantity > 0 ? quantity : 1
      } else {
        payload.inventory_quantity = 0
      }
      payload.allow_backorder = !!variant.allow_backorder && in_stock
      await variantRepo.update(variant.id, payload)
    }
  })

  const refreshed = await productService.retrieve(productId, { relations: DEFAULT_RELATIONS })
  res.json({ product: serializeProduct(refreshed, DEFAULT_CURRENCY) })
}
