export default {
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 } },
    { name: 'price', title: 'Price', type: 'number' },
    { name: 'sizes', title: 'Sizes', type: 'array', of: [{ type: 'string' }] },
    { name: 'stock', title: 'Stock', type: 'number' },
    { name: 'images', title: 'Images', type: 'array', of: [{ type: 'image' }] },
    { name: 'description', title: 'Description', type: 'text' },
    { name: 'isFeatured', title: 'Featured', type: 'boolean' }
  ]
}
