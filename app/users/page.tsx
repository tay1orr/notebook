import { MainLayout } from '@/components/layout/main-layout'
import { requireAuth } from '@/lib/auth'
import { UsersManagement } from '@/components/users/users-management'

export default async function UsersPage() {
  const user = await requireAuth()

  // 관리자만 접근 가능
  if (user.role !== 'admin') {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">접근 권한이 없습니다</h1>
            <p className="text-muted-foreground">관리자만 사용자 관리 페이지에 접근할 수 있습니다.</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <UsersManagement />
      </div>
    </MainLayout>
  )
}