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
  if (user.role === 'admin' && user.email === 'taylorr@gclass.ice.go.kr') {
    redirect('/dashboard')
  }

  // 임시로 모든 비관리자 사용자는 역할 선택이 필요하도록 강제
  // if (user.role && user.role !== '') {
  //   redirect('/dashboard')
  // }

  const handleComplete = async (userData: any) => {
    // TODO: API 호출로 사용자 정보 업데이트
    console.log('역할 설정 완료:', userData)

    // 임시로 localStorage에 저장 (실제로는 API 호출)
    if (typeof window !== 'undefined') {
      localStorage.setItem('userProfile', JSON.stringify({
        ...user,
        ...userData,
        setupComplete: true
      }))
    }

    // 대시보드로 리다이렉트
    window.location.href = '/dashboard'
  }

  return <RoleSelection user={user} onComplete={handleComplete} />
}