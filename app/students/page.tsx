import { MainLayout } from '@/components/layout/main-layout'
import { requireRole } from '@/lib/auth'
import { StudentsManagement } from '@/components/students/students-management'

export default async function StudentsPage() {
  const user = await requireRole(['admin', 'homeroom', 'helper'])

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
}