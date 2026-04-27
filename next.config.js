/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: { unoptimized: true },
  webpack: (config) => {
    config.resolve.alias = config.resolve.alias || {}
    config.resolve.alias.munsell = require('path').resolve(__dirname, 'node_modules/munsell')
    return config
  },
}

module.exports = nextConfig