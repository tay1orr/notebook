import { MainLayout } from '@/components/layout/main-layout'
import { requireAuth } from '@/lib/auth'
import { ProfileManagement } from '@/components/profile/profile-management'

export default async function ProfilePage() {
  try {
    const user = await requireAuth()

    const handleUpdate = async (userData: any) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        throw new Error('프로필 업데이트 실패')
      }

      console.log('프로필 업데이트 성공:', userData)
    } catch (error) {
      console.error('프로필 업데이트 오류:', error)
      throw error
    }
  }

    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <ProfileManagement user={user} onUpdate={handleUpdate} />
        </div>
      </MainLayout>
    )
  } catch (error) {
    console.error('Profile page error:', error)
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">프로필을 불러올 수 없습니다</h1>
            <p className="text-gray-600 mt-2">사용자 인증에 문제가 발생했습니다. 다시 로그인해주세요.</p>
          </div>
        </div>
      </MainLayout>
    )
  }
}