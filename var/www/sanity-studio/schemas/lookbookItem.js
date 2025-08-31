export default {
  name: 'lookbookItem',
  title: 'Lookbook Item',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'photo', title: 'Photo', type: 'image' },
    { name: 'season', title: 'Season', type: 'string' },
    {
      name: 'collection',
      title: 'Medusa Collection ID/Handle',
      type: 'string',
      description:
        'Enter the Medusa collection ID or handle to link this lookbook to the shop filtered by this collection',
    },
    { name: 'order', title: 'Order', type: 'number' },
  ],
}
