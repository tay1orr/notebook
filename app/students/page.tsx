import { MainLayout } from '@/components/layout/main-layout'
import { requireRole } from '@/lib/auth'
import { StudentsManagement } from '@/components/students/students-management'

export default async function StudentsPage() {
  try {
    const user = await requireRole(['admin', 'homeroom', 'helper', 'student'])

    // 실제 데이터는 클라이언트 컴포넌트에서 로드
    const students: any[] = []
    const stats = {
      total: 0,
      withLoan: 0,
      overdue: 0
    }

    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <StudentsManagement students={students} stats={stats} />
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