import { MainLayout } from '@/components/layout/main-layout'
import { requireAuth } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getRoleText, getStatusColor, getStatusText } from '@/lib/utils'
import { StudentDashboard } from '@/components/student/student-dashboard'

export default async function DashboardPage() {
  const user = await requireAuth()

  // 학생용 임시 데이터
  const studentCurrentLoans = [
    // 테스트용 임시 데이터 - 신청 후 상태 확인용
    // {
    //   id: 'temp1',
    //   status: 'requested',
    //   requestedAt: new Date().toISOString(),
    //   purpose: '과제 작성',
    //   purposeDetail: '국어 독서감상문 작성',
    //   returnDate: '2024-09-18',
    //   studentContact: '010-1234-5678'
    // }
  ]

  const studentLoanHistory = [
    // 임시 이력 데이터
    {
      id: '1',
      deviceTag: 'NB-2024-001',
      status: 'returned',
      requestedAt: '2024-09-01 14:30',
      returnedAt: '2024-09-05 08:30',
      purpose: '과제 작성'
    }
  ]

  // 학생인 경우 학생용 대시보드 표시
  if (user.role === 'student') {
    const studentInfo = {
      id: user.id,
      name: user.name,
      studentNo: user.email.split('@')[0], // 이메일 앞부분을 학번으로 사용
      className: '1-1', // 임시 데이터, 실제로는 DB에서 가져와야 함
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

  // 관리자/교사용 임시 데이터 (실제로는 데이터베이스에서 가져와야 함)
  const dashboardStats = {
    todayPickups: 3,
    tomorrowReturns: 5,
    overdueLoans: 1,
    availableDevices: 12
  }

  const recentLoans = [
    {
      id: '1',
      studentName: '김학생',
      studentNo: '10101',
      className: '1-1',
      deviceTag: 'NB-2024-001',
      status: 'picked_up',
      dueDate: '2024-09-16 08:45'
    },
    {
      id: '2',
      studentName: '이학생',
      studentNo: '10102',
      className: '1-1',
      deviceTag: 'NB-2024-002',
      status: 'approved',
      dueDate: '2024-09-16 08:45'
    }
  ]

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
            <p className="text-muted-foreground">
              안녕하세요, <strong>{user.name}</strong>님 ({getRoleText(user.role)})
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              인천중산고등학교
            </Badge>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">오늘 수령 예정</CardTitle>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.todayPickups}</div>
              <p className="text-xs text-muted-foreground">종례 시간 전 수령</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">내일 반납 예정</CardTitle>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.tomorrowReturns}</div>
              <p className="text-xs text-muted-foreground">조회 시간 전 반납</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">연체 (무단대여)</CardTitle>
              <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{dashboardStats.overdueLoans}</div>
              <p className="text-xs text-muted-foreground">즉시 확인 필요</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">잔여 노트북</CardTitle>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{dashboardStats.availableDevices}</div>
              <p className="text-xs text-muted-foreground">대여 가능 기기</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 최근 대여 현황 */}
          <Card>
            <CardHeader>
              <CardTitle>최근 대여 현황</CardTitle>
              <CardDescription>
                최근 대여 신청 및 진행 상황
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentLoans.map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{loan.studentName}</span>
                        <span className="text-sm text-muted-foreground">
                          {loan.className} {loan.studentNo}번
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {loan.deviceTag} • 반납: {loan.dueDate}
                      </div>
                    </div>
                    <Badge className={getStatusColor(loan.status)}>
                      {getStatusText(loan.status)}
                    </Badge>
                  </div>
                ))}
              </div>
              {recentLoans.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  최근 대여 기록이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>

          {/* 빠른 작업 */}
          <Card>
            <CardHeader>
              <CardTitle>빠른 작업</CardTitle>
              <CardDescription>
                자주 사용하는 기능들
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {(user.role === 'admin' || user.role === 'helper' || user.role === 'homeroom') && (
                  <>
                    <Button className="w-full justify-start" variant="outline">
                      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      새 대여 신청
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      대여 승인 처리
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V7a2 2 0 012-2h4a2 2 0 012 2v0M8 7v10a2 2 0 002 2h4a2 2 0 002-2V7" />
                      </svg>
                      수령/반납 처리
                    </Button>
                  </>
                )}
                <Button className="w-full justify-start" variant="outline">
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  학생/기기 검색
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  월별 리포트
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </MainLayout>
  )
}