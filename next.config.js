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
  // 환경별 설정 (TZ는 Vercel에서 지원하지 않으므로 코드에서 직접 처리)
  // env: {
  //   TZ: process.env.TZ || 'Asia/Seoul'
  // },
  // TypeScript 빌드 에러 무시 (개발 중)
  typescript: {
    ignoreBuildErrors: true
  },
  // ESLint 빌드 에러 무시 (개발 중)
  eslint: {
    ignoreDuringBuilds: true
  }
}

module.exports = nextConfig