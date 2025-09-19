import { MainLayout } from '@/components/layout/main-layout'
import { requireApprovedHomeroom } from '@/lib/auth'
import { StudentsManagementWrapper } from '@/components/students/students-management-wrapper'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function StudentsPage() {
  try {
    const user = await requireApprovedHomeroom(['admin', 'homeroom', 'helper'])

    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <StudentsManagementWrapper />
        </div>
      </MainLayout>
    )
  } catch (error) {
    console.error('Students page error:', error)
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">오류가 발생했습니다</h1>
            <p className="text-gray-600 mt-2">페이지를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
          </div>
        </div>
      </MainLayout>
    )
  }
}