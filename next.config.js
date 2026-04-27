/** @type {import('next').NextConfig} */
const path = require('path')
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: { unoptimized: true },
  transpilePackages: ['munsell'],
  webpack: (config) => {
    config.resolve.alias = config.resolve.alias || {}
    config.resolve.alias.munsell = path.resolve(__dirname, 'node_modules/munsell/dist/src/index.js')
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      'node_modules',
      ...(config.resolve.modules || []),
    ]
    return config
  },
}

module.exports = nextConfig