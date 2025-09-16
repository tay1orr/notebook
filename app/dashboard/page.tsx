import { MainLayout } from '@/components/layout/main-layout'
import { requireAuth } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StudentDashboard } from '@/components/student/student-dashboard'
import { AdminDashboard } from '@/components/admin/admin-dashboard'

export default async function DashboardPage() {
  const user = await requireAuth()

  // 학생용 임시 데이터 - 모두 제거
  const studentCurrentLoans: any[] = []

  const studentLoanHistory: any[] = []

  // 학생인 경우 학생용 대시보드 표시
  if (user.role === 'student') {
    const studentInfo = {
      id: user.id,
      name: user.name,
      studentNo: '', // 학생이 직접 입력하도록 변경
      className: '', // 학생이 직접 입력하도록 변경
      email: user.email
    }

    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <StudentDashboard
            student={studentInfo}
            currentLoans={studentCurrentLoans}
            loanHistory={studentLoanHistory}
          />
        </div>
      </MainLayout>
    )
  }

  // 실제 데이터는 클라이언트 컴포넌트에서 로드

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <AdminDashboard user={user} />
      </div>
    </MainLayout>
  )
}