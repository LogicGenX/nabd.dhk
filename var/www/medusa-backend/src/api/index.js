const express = require('express')
const adminLite = require('./admin/lite')

module.exports = (rootDirectory = '/', options = {}) => {
  console.log('[admin-lite] registering custom routes', { rootDirectory })
  const router = express.Router()
  adminLite(router)
  return router
}

module.exports.default = module.exports
