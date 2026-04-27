/** @type {import('next').NextConfig} */
const path = require('path')
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: { unoptimized: true },
  webpack: (config) => {
    config.resolve.alias = config.resolve.alias || {}
    config.resolve.alias.munsell = path.resolve(__dirname, 'node_modules/munsell/dist/src/index.js')
    return config
  },
}

module.exports = nextConfig