/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["notebook-two-pink.vercel.app", "*.vercel.app", "*.gclass.ice.go.kr"]
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
  // 시험 배포용 - 운영 전 타입 에러 수정 필요
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
}

module.exports = nextConfig