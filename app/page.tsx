import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getCurrentUser()

  // 로그인된 사용자
  if (user) {
    // 역할이 없는 사용자는 설정 페이지로
    if (!user.role || user.role === '') {
      redirect('/setup')
    }
    // 역할이 있는 사용자는 대시보드로
    redirect('/dashboard')
  }

  // 로그인하지 않은 사용자는 로그인 페이지로
  redirect('/auth')
}