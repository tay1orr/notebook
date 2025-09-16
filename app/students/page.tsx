import { MainLayout } from '@/components/layout/main-layout'
import { requireRole } from '@/lib/auth'
import { StudentsManagement } from '@/components/students/students-management'

export default async function StudentsPage() {
  const user = await requireRole(['admin', 'homeroom', 'helper'])

  // 임시 데이터 (실제로는 데이터베이스에서 가져와야 함)
  const students = [
    {
      id: '1',
      studentNo: '10101',
      name: '김학생',
      className: '1-1',
      email: 'student10101@gclass.ice.go.kr',
      phone: '010-1234-5678',
      parentPhone: '010-9876-5432',
      currentLoan: 'NB-2024-001',
      dueDate: '2024-09-16 08:45',
      loanHistory: 5,
      overdueCount: 0
    },
    {
      id: '2',
      studentNo: '10102',
      name: '이학생',
      className: '1-1',
      email: 'student10102@gclass.ice.go.kr',
      phone: '010-2345-6789',
      parentPhone: '010-8765-4321',
      currentLoan: null,
      loanHistory: 3,
      overdueCount: 1
    },
    {
      id: '3',
      studentNo: '10103',
      name: '박학생',
      className: '1-2',
      email: 'student10103@gclass.ice.go.kr',
      phone: '010-3456-7890',
      parentPhone: '010-7654-3210',
      currentLoan: null,
      loanHistory: 8,
      overdueCount: 0
    },
    {
      id: '4',
      studentNo: '10104',
      name: '최학생',
      className: '1-2',
      email: 'student10104@gclass.ice.go.kr',
      phone: '010-4567-8901',
      parentPhone: '010-6543-2109',
      currentLoan: 'NB-2024-004',
      dueDate: '2024-09-16 08:45',
      loanHistory: 2,
      overdueCount: 0
    }
  ]

  const stats = {
    total: students.length,
    withLoan: students.filter(s => s.currentLoan).length,
    overdue: students.filter(s => s.overdueCount > 0).length
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <StudentsManagement students={students} stats={stats} />
      </div>
    </MainLayout>
  )
}