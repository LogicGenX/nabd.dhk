const dotenv = require('dotenv')
dotenv.config()

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
    './plugins/cod',
    'medusa-fulfillment-manual',
    './admin-extensions',
    {
      resolve: '@medusajs/admin',
      /** @type {import('@medusajs/admin').PluginOptions} */
      options: {
        // Serve the admin dashboard under "/app" to avoid clashing with
        // Medusa's own "/admin" API routes. Hitting "/admin" now correctly
        // resolves to the backend API while the UI is available at
        // "http://<host>:<port>/app".
        path: '/app',
        serve: true,
        autoRebuild: true,
        // Ensure the admin UI points to the same backend that
        // exposes the Medusa API. Without this the UI defaults to
        // http://localhost:9000 which breaks authentication when the
        // backend is served on a different port (e.g. 7001 in the
        // docker-compose setup).
        backend: process.env.MEDUSA_ADMIN_BACKEND_URL || 'http://localhost:7001'
      }
    }
  ]
}
