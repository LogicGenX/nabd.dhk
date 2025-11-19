const dotenv = require('dotenv')
dotenv.config()

const resolveUploadsBaseUrl = () => {
  const candidates = [
    process.env.MEDUSA_UPLOADS_BASE_URL,
    process.env.MEDUSA_FILE_BASE_URL,
    process.env.MEDUSA_BACKEND_URL,
    process.env.MEDUSA_ADMIN_BACKEND_URL,
    process.env.RENDER_EXTERNAL_URL,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim().replace(/\/$/, '')
    }
  }

  return '/api'
}

const uploadsBaseUrl = resolveUploadsBaseUrl()

module.exports = {
  projectConfig: {
    redis_url: process.env.REDIS_URL,
    database_url: process.env.DATABASE_URL,
    jwt_secret: process.env.JWT_SECRET,
    cookie_secret: process.env.COOKIE_SECRET,
    store_cors: process.env.MEDUSA_STORE_CORS,
    admin_cors: process.env.MEDUSA_ADMIN_CORS,
  },
  plugins: [
    './plugins/bkash',
    {
      resolve: 'medusa-payment-manual',
      options: {
        automatic_capture: true,
      },
    },
    './plugins/product-policy',
    'medusa-fulfillment-manual',
    './admin-extensions',
    {
      resolve: 'medusa-file-local',
      options: {
        upload_dir: 'uploads',
        base_url: uploadsBaseUrl,
      },
    },
    {
      resolve: '@medusajs/admin',
      options: {
        path: '/app',
        serve: false,
        backend:
          process.env.MEDUSA_ADMIN_BACKEND_URL ||
          process.env.MEDUSA_BACKEND_URL ||
          'http://localhost:7001',
        autoRebuild: true,
      },
    },
  ],
  modules: {
    eventBus: { resolve: '@medusajs/event-bus-local' },
    cacheService: { resolve: '@medusajs/cache-inmemory' },
  },
  featureFlags: {
    product_categories: true,
  },
}
