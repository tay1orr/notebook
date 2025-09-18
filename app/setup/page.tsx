import { requireAuthWithoutRole } from '@/lib/auth'
import { RoleSelection } from '@/components/auth/role-selection'
import { redirect } from 'next/navigation'

export default async function SetupPage() {
  const user = await requireAuthWithoutRole()

  console.log('🔍 SETUP PAGE DEBUG - User data:', {
    email: user.email,
    role: user.role,
    id: user.id
  })

  // 관리자는 이 페이지를 볼 수 없음
  if (user.role === 'admin') {
    redirect('/dashboard')
  }

  // 이미 역할이 설정된 사용자는 대시보드로
  if (user.role && user.role !== '') {
    redirect('/dashboard')
  }

  return <RoleSelection user={user} />
}