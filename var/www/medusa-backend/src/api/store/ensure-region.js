const { scheduleBootstrap } = require('../../utils/store-region-bootstrap')

const resolveRequestPath = (req) => {
  if (!req) {
    return ''
  }
  const scrubQuery = (value) => {
    if (typeof value !== 'string') {
      return ''
    }
    const idx = value.indexOf('?')
    return idx === -1 ? value : value.slice(0, idx)
  }
  const original = scrubQuery(req.originalUrl)
  if (original) {
    return original
  }
  const base = typeof req.baseUrl === 'string' ? req.baseUrl : ''
  const rel = scrubQuery(typeof req.path === 'string' ? req.path : req.url || '')
  return base + rel
}

const shouldGuardRequest = (req) => {
  if (!req?.method) {
    return false
  }
  const method = req.method.toUpperCase()
  if (method !== 'GET' && method !== 'POST' && method !== 'OPTIONS') {
    return false
  }
  const pathname = resolveRequestPath(req)
  return (
    pathname.startsWith('/store/regions') ||
    pathname.startsWith('/store/carts') ||
    pathname.startsWith('/store/checkout')
  )
}

module.exports = (router) => {
  router.use((req, res, next) => {
    if (!shouldGuardRequest(req)) {
      return next()
    }
    if (!req.scope) {
      return next()
    }
    scheduleBootstrap(req.scope)
      .catch(() => {
        // already logged
      })
      .finally(() => next())
  })
}
