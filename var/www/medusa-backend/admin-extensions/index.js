module.exports = {
  id: 'lookbook-extension',
  bootstrap(app) {
    app.addMenuItem({
      id: 'lookbook',
      label: 'Lookbook',
      href: 'https://<your-domain>/studio',
    })
  },
}
