export default {
  name: 'lookbookItem',
  title: 'Lookbook Item',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'photo', title: 'Photo', type: 'image' },
    { name: 'season', title: 'Season', type: 'string' },
    { name: 'order', title: 'Order', type: 'number' }
  ]
}
