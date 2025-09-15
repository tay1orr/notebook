/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.vercel.app", "*.ichungjungsan.kr"]
    }
  },
  images: {
    domains: ['lh3.googleusercontent.com'],
    formats: ['image/webp', 'image/avif']
  },
  // Vercel 최적화
  compress: true,
  poweredByHeader: false,
  // 환경별 설정
  env: {
    TZ: process.env.TZ || 'Asia/Seoul'
  }
}

module.exports = nextConfig