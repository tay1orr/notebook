import { MainLayout } from '@/components/layout/main-layout'
import { requireRole } from '@/lib/auth'
import { UsersManagement } from '@/components/users/users-management'

export default async function UsersPage() {
  try {
    const user = await requireRole(['admin'])

    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <UsersManagement />
        </div>
      </MainLayout>
    )
  } catch (error) {
    console.error('Users page error:', error)
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">접근 권한이 없습니다</h1>
            <p className="text-gray-600 mt-2">관리자만 이 페이지에 접근할 수 있습니다.</p>
          </div>
        </div>
      </MainLayout>
    )
  }
}