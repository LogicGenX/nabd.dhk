const DEFAULT_RELATIONS = [
  'variants',
  'variants.prices',
  'images',
  'categories',
  'collection',
]

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

const serializeProduct = (product, currency) => {
  const price = mapPrice(product, currency)
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
    price: price.amount || 0,
    currency_code: price.currency_code || currency,
    variant_id: price.variant_id || null,
    sku: product.variants && product.variants[0] ? product.variants[0].sku : null,
    metadata: product.metadata || null,
    created_at: product.created_at,
    updated_at: product.updated_at,
  }
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

  const productService = req.scope.resolve('productService')
  const [products, count] = await productService.listAndCount(selector, {
    relations: DEFAULT_RELATIONS,
    skip: offset,
    take: limit,
  })

  const payload = products.map((product) => serializeProduct(product, DEFAULT_CURRENCY))
  res.json({ products: payload, count, limit, offset })
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
  if (!Array.isArray(body.category_ids) || body.category_ids.length === 0) {
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
  } = req.body

  const productService = req.scope.resolve('productService')
  const numericPrice = Math.round(Number(price))

  const payload = {
    title,
    description,
    handle,
    status,
    collection_id,
    categories: category_ids.map((id) => ({ id })),
    images: images.map((url) => ({ url })),
    thumbnail,
    metadata: metadata && typeof metadata === 'object' ? metadata : undefined,
    options: [],
    variants: [
      {
        title: 'Default',
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

  const created = await productService.create(payload)
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
  } = req.body || {}

  if (category_ids && (!Array.isArray(category_ids) || category_ids.length === 0)) {
    return res.status(400).json({ message: 'At least one category is required' })
  }

  const productService = req.scope.resolve('productService')
  const productVariantService = req.scope.resolve('productVariantService')

  const updatePayload = {}
  if (title !== undefined) updatePayload.title = title
  if (description !== undefined) updatePayload.description = description
  if (handle !== undefined) updatePayload.handle = handle
  if (status !== undefined) updatePayload.status = status
  if (collection_id !== undefined) updatePayload.collection_id = collection_id
  if (thumbnail !== undefined) updatePayload.thumbnail = thumbnail
  if (metadata && typeof metadata === 'object') updatePayload.metadata = metadata
  if (Array.isArray(images)) updatePayload.images = images.map((url) => ({ url }))
  if (Array.isArray(category_ids)) updatePayload.categories = category_ids.map((id) => ({ id }))

  if (Object.keys(updatePayload).length > 0) {
    await productService.update(productId, updatePayload)
  }

  if (price !== undefined && price !== null && !Number.isNaN(Number(price))) {
    const numericPrice = Math.round(Number(price))
    const product = await productService.retrieve(productId, {
      relations: ['variants', 'variants.prices'],
    })
    const variant = product.variants && product.variants[0]
    if (variant) {
      await productVariantService.update(variant.id, {
        prices: [
          {
            amount: numericPrice,
            currency_code: DEFAULT_CURRENCY,
          },
        ],
      })
    }
  }

  const refreshed = await productService.retrieve(productId, { relations: DEFAULT_RELATIONS })
  res.json({ product: serializeProduct(refreshed, DEFAULT_CURRENCY) })
}

exports.catalog = async (req, res) => {
  const collectionService = req.scope.resolve('productCollectionService')
  const categoryService = req.scope.resolve('productCategoryService')

  const [collections, categories] = await Promise.all([
    collectionService.list({}, { select: ['id', 'title', 'handle'] }),
    categoryService.list({}, { select: ['id', 'name', 'handle'] }),
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
  })
}
