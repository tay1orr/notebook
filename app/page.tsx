import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const user = await getCurrentUser()

  // 이미 로그인된 사용자는 대시보드로
  if (user) {
    redirect('/dashboard')
  }

  // 로그인하지 않은 사용자는 로그인 페이지로
  redirect('/auth')
}