export default {
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    { name: 'heroTagline', title: 'Hero Tagline', type: 'string' },
    {
      name: 'heroCollectionId',
      title: 'Featured Collection ID',
      type: 'string',
    },
    { name: 'contactEmail', title: 'Contact Email', type: 'string' },
    { name: 'instagramUrl', title: 'Instagram URL', type: 'url' },
  ],
}
