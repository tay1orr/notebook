import { MainLayout } from '@/components/layout/main-layout'
import { requireRole } from '@/lib/auth'
import { LoansManagement } from '@/components/loans/loans-management'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function LoansPage() {
  const user = await requireRole(['admin', 'homeroom', 'helper'])

  // TODO: 실제로는 데이터베이스에서 가져와야 함
  // 지금은 임시로 빈 배열로 시작 (실제 신청 내역은 클라이언트 컴포넌트에서 관리)
  const pendingLoans: any[] = []
  const activeLoans: any[] = []
  const overdueLoans: any[] = []

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <LoansManagement
          pendingLoans={pendingLoans}
          activeLoans={activeLoans}
          overdueLoans={overdueLoans}
          userRole={user.role}
          userName={user.name}
        />
      </div>
    </MainLayout>
  )
}