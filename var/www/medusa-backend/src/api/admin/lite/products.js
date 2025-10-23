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

const serializeProduct = (product, currency) => {
  const price = mapPrice(product, currency)
  const variants = mapVariants(product, currency)
  const options = Array.isArray(product.options)
    ? product.options.map((option) => ({
        id: option.id,
        title: option.title,
      }))
    : []
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
    metadata: product.metadata || null,
    created_at: product.created_at,
    updated_at: product.updated_at,
  }
}
const extractProductSizes = (products) => {
  if (!Array.isArray(products)) return []

  const sizes = new Map()

  for (const product of products) {
    const options = Array.isArray(product?.options) ? product.options : []
    const sizeOption = options.find((option) => {
      if (!option || typeof option?.title !== 'string') return false
      return option.title.trim().toLowerCase() === 'size'
    })
    if (!sizeOption || !sizeOption.id) continue

    const variants = Array.isArray(product?.variants) ? product.variants : []
    for (const variant of variants) {
      const variantOptions = Array.isArray(variant?.options) ? variant.options : []
      const match = variantOptions.find((opt) => opt?.option_id === sizeOption.id)
      const rawValue = typeof match?.value === 'string' ? match.value.trim() : ''
      if (!rawValue) continue
      const normalized = rawValue.toLowerCase()
      if (!sizes.has(normalized)) sizes.set(normalized, rawValue)
    }
  }

  return Array.from(sizes.values()).sort((a, b) => a.localeCompare(b))
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
  } = req.body

  const productService = req.scope.resolve('productService')
  const numericPrice = Math.round(Number(price))
  const imageUrls = toStringArray(images)
  const categoryRecords = toStringArray(category_ids).map((id) => ({ id }))
  const thumbnailUrl =
    typeof thumbnail === 'string' && thumbnail.trim()
      ? thumbnail.trim()
      : imageUrls[0] || undefined
  const metadataPayload = metadata && typeof metadata === 'object' ? metadata : undefined

  const payload = {
    title,
    description,
    handle,
    status,
    collection_id,
    categories: categoryRecords,
    images: imageUrls,
    thumbnail: thumbnailUrl,
    metadata: metadataPayload,
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

  const updatePayload = {}
  if (title !== undefined) updatePayload.title = title
  if (description !== undefined) updatePayload.description = description
  if (handle !== undefined) updatePayload.handle = handle
  if (status !== undefined) updatePayload.status = status
  if (collection_id !== undefined) updatePayload.collection_id = collection_id
  if (thumbnail !== undefined) {
    if (typeof thumbnail === 'string') {
      const trimmedThumbnail = thumbnail.trim()
      updatePayload.thumbnail = trimmedThumbnail || null
    } else {
      updatePayload.thumbnail = thumbnail
    }
  }
  if (metadata && typeof metadata === 'object') updatePayload.metadata = metadata
  if (Array.isArray(images)) updatePayload.images = toStringArray(images)
  if (Array.isArray(category_ids)) updatePayload.categories = toStringArray(category_ids).map((id) => ({ id }))

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
