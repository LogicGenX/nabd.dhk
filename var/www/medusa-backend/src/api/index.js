const adminLite = require('./admin/lite')

module.exports = (router) => {
  adminLite(router)
  return router
}
