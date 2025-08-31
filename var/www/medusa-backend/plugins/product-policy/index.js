const { asClass } = require('awilix')
const { ProductService } = require('@medusajs/medusa')

class ProductPolicyService extends ProductService {
  async create(data, context) {
    const collectionId = data.collection_id || (data.collection && data.collection.id)
    const categories = data.categories || data.category_ids
    if (!collectionId || !Array.isArray(categories) || categories.length === 0) {
      throw new Error('Product must include a collection and at least one category')
    }
    return await super.create(data, context)
  }

  async update(productId, data) {
    // If caller explicitly clears either, block it
    if ('collection_id' in data && !data.collection_id) {
      throw new Error('Product must include a collection')
    }
    if ('categories' in data && (!Array.isArray(data.categories) || data.categories.length === 0)) {
      throw new Error('Product must include at least one category')
    }
    if ('category_ids' in data && (!Array.isArray(data.category_ids) || data.category_ids.length === 0)) {
      throw new Error('Product must include at least one category')
    }
    return await super.update(productId, data)
  }
}

module.exports = (container) => {
  try {
    container.register({
      productService: asClass(ProductPolicyService).singleton(),
    })
  } catch (e) {
    const logger = container.resolve('logger')
    logger ? logger.warn(`Product policy plugin failed to register: ${e.message}`) : console.warn(e)
  }
}

