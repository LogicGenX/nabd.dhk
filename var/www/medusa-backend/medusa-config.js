const dotenv = require('dotenv')
dotenv.config()

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Start a Postgres instance and set DATABASE_URL before running Medusa.')
}

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
        path: 'admin',
        serve: true,
        autoRebuild: true
      }
    }
  ]
}
