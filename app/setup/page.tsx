import { getCurrentUser } from '@/lib/auth'
import { RoleSelection } from '@/components/auth/role-selection'
import { redirect } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const user = await getCurrentUser()

  // 인증되지 않은 사용자는 로그인 페이지로
  if (!user) {
    redirect('/auth')
  }

  console.log('🔍 SETUP PAGE DEBUG - User data:', {
    email: user.email,
    role: user.role,
    roleType: typeof user.role,
    id: user.id,
    fullUser: user
  })

  // 관리자는 이 페이지를 볼 수 없음
  if (user.role === 'admin') {
    redirect('/dashboard')
  }

  // 이미 역할이 설정된 사용자는 대시보드로
  const isEmpty = (role: string): role is '' => role === ''
  if (user.role && !isEmpty(user.role)) {
    redirect('/dashboard')
  }

  return <RoleSelection user={user} />
}