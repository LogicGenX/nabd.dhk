/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  output: 'standalone',
  images: {
    remotePatterns: buildImagePatterns(),
  },
}

function buildImagePatterns() {
  const defaults = [
    {
      protocol: 'http',
      hostname: 'localhost',
      port: '7001',
      pathname: '/**',
    },
    {
      protocol: 'https',
      hostname: 'cdn.sanity.io',
      pathname: '/**',
    },
  ]

  const seen = new Set(defaults.map((pattern) => serializePattern(pattern)))
  const addPatternFromEnv = (value) => {
    try {
      if (!value) return
      const parsed = new URL(value)
      if (!parsed.hostname) return
      const pattern = {
        protocol: parsed.protocol.replace(':', ''),
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        pathname: '/**',
      }
      const key = serializePattern(pattern)
      if (!seen.has(key)) {
        defaults.push(pattern)
        seen.add(key)
      }
    } catch (error) {
      console.warn('[next.config.js] Skipping invalid image host', value)
    }
  }

  ;[
    process.env.NEXT_PUBLIC_MEDUSA_URL,
    process.env.MEDUSA_BACKEND_URL,
    process.env.MEDUSA_ADMIN_BACKEND_URL,
    'https://medusa-backend-nabd.onrender.com',
  ].forEach(addPatternFromEnv)

  return defaults
}

function serializePattern(pattern) {
  const portSuffix = pattern.port ? `:${pattern.port}` : ''
  return `${pattern.protocol}://${pattern.hostname}${portSuffix}${pattern.pathname}`
}

module.exports = nextConfig
