module.exports = {
  id: 'lookbook-extension',
  bootstrap(app) {
    app.addMenuItem({
      id: 'lookbook',
      label: 'Lookbook',
      href: '/studio',
    })

    // Add simple NABD branding banner and page title
    if (typeof document !== 'undefined') {
      document.title = 'NABD Admin'
      const banner = document.createElement('div')
      banner.textContent = 'NABD'
      banner.style.background = '#222'
      banner.style.color = '#fff'
      banner.style.padding = '8px'
      banner.style.textAlign = 'center'
      document.body.prepend(banner)
    }
  },
}
