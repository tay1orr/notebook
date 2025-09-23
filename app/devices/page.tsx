import { MainLayout } from '@/components/layout/main-layout'
import { requireAuth } from '@/lib/auth'
import { DevicesManagementWrapper } from '@/components/devices/devices-management-wrapper'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function DevicesPage() {
  const user = await requireAuth()

  // 권한 확인: 관리자, 담임교사, 노트북 관리 도우미만 접근 가능
  if (!['admin', 'homeroom', 'helper'].includes(user.role)) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">접근 권한이 없습니다</h1>
            <p className="text-gray-600 mt-2">기기 관리 페이지에 접근할 권한이 없습니다.</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <DevicesManagementWrapper user={user} />
      </div>
    </MainLayout>
  )
}