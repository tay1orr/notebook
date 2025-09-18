import { MainLayout } from '@/components/layout/main-layout'
import { requireAuth } from '@/lib/auth'
import { ProfileManagement } from '@/components/profile/profile-management'

export default async function ProfilePage() {
  const user = await requireAuth()

  const handleUpdate = async (userData: any) => {
    // TODO: API 호출로 프로필 업데이트
    console.log('프로필 업데이트:', userData)
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <ProfileManagement user={user} onUpdate={handleUpdate} />
      </div>
    </MainLayout>
  )
}