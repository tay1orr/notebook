import { MainLayout } from '@/components/layout/main-layout'
import { requireAuth } from '@/lib/auth'
import { ProfileManagement } from '@/components/profile/profile-management'

export default async function ProfilePage() {
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
}