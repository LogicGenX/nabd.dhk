/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true
  },
  output: 'standalone',
  images: {
    // allow images from local Medusa uploads and Sanity CDN
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '7001',
        pathname: '/**'
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/uploads/**'
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/**'
      }
    ]
  }
}

module.exports = nextConfig
