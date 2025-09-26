import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '인천중산고등학교 노트북 관리 시스템',
  description: '학생 노트북 대여 신청, 승인, 관리를 위한 통합 시스템',
  keywords: ['노트북', '대여', '학교', '관리', '인천중산고등학교'],
  authors: [{ name: '인천중산고등학교' }],
  robots: 'noindex, nofollow', // 학교 내부 시스템이므로 검색 엔진 차단
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          defaultTheme="system"
          storageKey="notebook-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}