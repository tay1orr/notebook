/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["notebook-loan-jungsan.vercel.app", "*.vercel.app", "*.gclass.ice.go.kr"]
    }
  },
  images: {
    domains: ['lh3.googleusercontent.com'],
    formats: ['image/webp', 'image/avif']
  },
  // 보안 헤더 설정
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://lh3.googleusercontent.com",
              "connect-src 'self' https://*.supabase.co",
              "font-src 'self' data:",
            ].join('; ')
          }
        ]
      }
    ]
  },
  // Vercel 최적화
  compress: true,
  poweredByHeader: false,
  // 타입스크립트 오류 수정 완료로 활성화
  typescript: {
    ignoreBuildErrors: false
  },
  eslint: {
    ignoreDuringBuilds: false
  }
}

module.exports = nextConfig