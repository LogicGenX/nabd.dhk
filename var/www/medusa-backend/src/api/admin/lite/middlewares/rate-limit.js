const buckets = new Map()
const parseNumber = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}
const LIMIT = parseNumber(process.env.ADMIN_LITE_RATE_LIMIT, 120)
const WINDOW_MS = parseNumber(process.env.ADMIN_LITE_RATE_WINDOW_MS, 60000)
const CLEANUP_MS = parseNumber(process.env.ADMIN_LITE_RATE_CLEANUP_MS, WINDOW_MS * 2)

const getClientKey = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim()
  }
  if (Array.isArray(forwarded) && forwarded.length) {
    return forwarded[0]
  }
  if (req.ip) return req.ip
  if (req.connection && req.connection.remoteAddress) return req.connection.remoteAddress
  return 'default'
}

if (CLEANUP_MS > 0) {
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets.entries()) {
      if (now >= bucket.reset) buckets.delete(key)
    }
  }, CLEANUP_MS)
  if (timer && timer.unref) timer.unref()
}

module.exports = (req, res, next) => {
  if (!LIMIT || LIMIT <= 0 || !WINDOW_MS) return next()
  const key = getClientKey(req)
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket || now >= bucket.reset) {
    bucket = { count: 0, reset: now + WINDOW_MS }
  }
  bucket.count += 1
  buckets.set(key, bucket)
  res.set('X-RateLimit-Limit', String(LIMIT))
  res.set('X-RateLimit-Remaining', String(Math.max(LIMIT - bucket.count, 0)))
  res.set('X-RateLimit-Reset', String(Math.ceil(bucket.reset / 1000)))
  if (bucket.count > LIMIT) {
    const retryAfter = Math.max(Math.ceil((bucket.reset - now) / 1000), 1)
    res.set('Retry-After', String(retryAfter))
    return res.status(429).json({ message: 'Too many requests' })
  }
  return next()
}

