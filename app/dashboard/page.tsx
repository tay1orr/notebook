import { MainLayout } from '@/components/layout/main-layout'
import { requireAuth } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StudentDashboard } from '@/components/student/student-dashboard'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { HelperDashboard } from '@/components/helper/helper-dashboard'

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
      studentNo: user.studentNo || '', // 프로필에서 가져온 학번 사용
      className: user.grade && user.class ? `${user.grade}-${user.class}` : '', // 프로필에서 가져온 학급 정보 사용
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

  // 노트북 관리 도우미/담임교사인 경우 통합 대시보드 표시
  if (user.role === 'helper' || user.role === 'homeroom') {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <HelperDashboard user={user} />
        </div>
      </MainLayout>
    )
  }

  // 관리자/교사인 경우 관리자 대시보드 표시
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <AdminDashboard user={user} />
      </div>
    </MainLayout>
  )
}