import { MainLayout } from '@/components/layout/main-layout'
import { requireRole } from '@/lib/auth'
import { LoansManagement } from '@/components/loans/loans-management'

export default async function LoansPage() {
  const user = await requireRole(['admin', 'homeroom', 'helper'])

  // 임시 데이터 (실제로는 데이터베이스에서 가져와야 함)
  const pendingLoans = [
    {
      id: '1',
      studentName: '김학생',
      studentNo: '10101',
      className: '1-1',
      requestedDevice: 'NB-2024-001',
      requestedAt: '2024-09-16 14:30',
      status: 'requested',
      notes: '수학 수행평가용'
    },
    {
      id: '2',
      studentName: '이학생',
      studentNo: '10102',
      className: '1-1',
      requestedDevice: 'NB-2024-002',
      requestedAt: '2024-09-16 15:15',
      status: 'requested',
      notes: '과학 보고서 작성'
    }
  ]

  const activeLoans = [
    {
      id: '3',
      studentName: '박학생',
      studentNo: '10103',
      className: '1-2',
      deviceTag: 'NB-2024-003',
      approvedAt: '2024-09-15 16:00',
      pickedUpAt: '2024-09-15 16:45',
      dueDate: '2024-09-16 08:45',
      status: 'picked_up'
    },
    {
      id: '4',
      studentName: '최학생',
      studentNo: '10104',
      className: '1-2',
      deviceTag: 'NB-2024-004',
      approvedAt: '2024-09-15 15:30',
      pickedUpAt: null,
      dueDate: '2024-09-16 08:45',
      status: 'approved'
    }
  ]

  const overdueLoans = [
    {
      id: '5',
      studentName: '정학생',
      studentNo: '10105',
      className: '1-3',
      deviceTag: 'NB-2024-005',
      dueDate: '2024-09-15 08:45',
      status: 'overdue',
      overdueDays: 1
    }
  ]

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <LoansManagement
          pendingLoans={pendingLoans}
          activeLoans={activeLoans}
          overdueLoans={overdueLoans}
        />
      </div>
    </MainLayout>
  )
}