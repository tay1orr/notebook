/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.vercel.app"]
    }
  },
  images: {
    domains: ['lh3.googleusercontent.com']
  }
}

module.exports = nextConfig