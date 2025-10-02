'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

interface StatisticsTabsProps {
  loans: any[]
}

export function StatisticsTabs({ loans }: StatisticsTabsProps) {
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [classFilter, setClassFilter] = useState<string>('all')

  // 필터링된 대여 데이터
  const getFilteredLoans = () => {
    return loans.filter(loan => {
      const className = loan.class_name || loan.className
      if (!className) return false

      const [grade, classNum] = className.split('-')

      if (gradeFilter !== 'all' && grade !== gradeFilter) return false
      if (classFilter !== 'all' && className !== classFilter) return false

      return true
    })
  }

  // 감사 로그 통계
  const getAuditStats = () => {
    const filteredLoans = getFilteredLoans()
    const statusMap = new Map()

    filteredLoans.forEach(loan => {
      const status = loan.status
      if (!statusMap.has(status)) {
        statusMap.set(status, 0)
      }
      statusMap.set(status, statusMap.get(status) + 1)
    })

    const statusLabels: Record<string, string> = {
      'requested': '신청됨',
      'approved': '승인됨',
      'picked_up': '수령됨',
      'returned': '반납됨',
      'rejected': '거절됨',
      'cancelled': '취소됨',
      'overdue': '연체됨'
    }

    return Array.from(statusMap.entries()).map(([status, count]) => ({
      status: statusLabels[status] || status,
      count,
      percentage: Math.round((count / filteredLoans.length) * 100)
    }))
  }

  // 백업 관리 통계 (시뮬레이션 데이터)
  const getBackupStats = () => {
    const now = new Date()
    const backupData = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayName = date.toLocaleDateString('ko-KR', { weekday: 'short' })
      const success = Math.random() > 0.1 // 90% 성공률

      backupData.push({
        date: `${date.getMonth() + 1}/${date.getDate()}(${dayName})`,
        status: success ? '성공' : '실패',
        size: `${Math.floor(Math.random() * 50 + 10)}MB`,
        time: `${Math.floor(Math.random() * 5 + 1)}분`
      })
    }

    return backupData
  }

  // 시스템 설정 통계
  const getSystemStats = () => {
    const filteredLoans = getFilteredLoans()
    const totalUsers = new Set(filteredLoans.map(loan => loan.student_id || loan.email)).size
    const totalDevices = 390 // 총 기기 수 (1-3학년, 1-13반, 각 반 10대)
    const activeLoans = filteredLoans.filter(loan => loan.status === 'picked_up').length

    return {
      totalUsers,
      totalDevices,
      activeLoans,
      utilizationRate: Math.round((activeLoans / totalDevices) * 100),
      totalRequests: filteredLoans.length,
      approvalRate: Math.round((filteredLoans.filter(loan => loan.status !== 'rejected').length / filteredLoans.length) * 100)
    }
  }

  // 학급별 이용률 계산 (개선된 버전)
  const getClassStats = () => {
    const filteredLoans = getFilteredLoans()
    const classMap = new Map()

    // 필터에 따른 학급 초기화
    const grades = gradeFilter === 'all' ? [1, 2, 3] : [parseInt(gradeFilter)]

    grades.forEach(grade => {
      for (let classNum = 1; classNum <= 13; classNum++) {
        const className = `${grade}-${classNum}`
        if (classFilter === 'all' || classFilter === className) {
          classMap.set(className, {
            class: `${className}반`,
            grade: grade,
            total: 0,
            active: 0,
            completed: 0,
            approval_rate: 0,
            utilization: 0
          })
        }
      }
    })

    // 실제 대여 데이터로 통계 계산
    filteredLoans.forEach(loan => {
      const className = loan.class_name || loan.className
      if (className && classMap.has(className)) {
        const stats = classMap.get(className)

        // 모든 상태 카운팅
        stats.total++

        if (loan.status === 'picked_up') {
          stats.active++
        } else if (loan.status === 'returned') {
          stats.completed++
        }
      }
    })

    // 이용률 및 승인률 계산
    const allStats = Array.from(classMap.values())
    const totalRequests = filteredLoans.length

    allStats.forEach(stats => {
      // 실제 이용률 (전체 요청 대비 실제 수령한 비율)
      const actualUsage = stats.active + stats.completed
      stats.utilization = totalRequests > 0 ? Math.round((actualUsage / totalRequests) * 100) : 0

      // 해당 학급의 승인률
      const classRequests = filteredLoans.filter(loan => {
        const className = loan.class_name || loan.className
        return className === stats.class.replace('반', '')
      })
      const approvedRequests = classRequests.filter(loan =>
        loan.status !== 'rejected' && loan.status !== 'cancelled'
      )
      stats.approval_rate = classRequests.length > 0 ?
        Math.round((approvedRequests.length / classRequests.length) * 100) : 0
    })

    return allStats.sort((a, b) => b.total - a.total)
  }

  // 월별 이용률
  const getMonthlyStats = () => {
    const filteredLoans = getFilteredLoans()
    const monthMap = new Map()
    const now = new Date()

    // 최근 6개월 초기화
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
      const monthName = `${date.getMonth() + 1}월`

      monthMap.set(monthKey, {
        month: monthName,
        total: 0,
        active: 0,
        completed: 0,
        approval_rate: 0
      })
    }

    filteredLoans.forEach(loan => {
      const createdDate = new Date(loan.created_at || loan.requestedAt)
      const monthKey = `${createdDate.getFullYear()}-${(createdDate.getMonth() + 1).toString().padStart(2, '0')}`

      if (monthMap.has(monthKey)) {
        const stats = monthMap.get(monthKey)
        stats.total++

        if (loan.status === 'picked_up') {
          stats.active++
        } else if (loan.status === 'returned') {
          stats.completed++
        }
      }
    })

    // 승인률 계산
    Array.from(monthMap.values()).forEach(stats => {
      const monthLoans = filteredLoans.filter(loan => {
        const createdDate = new Date(loan.created_at || loan.requestedAt)
        const monthKey = `${createdDate.getFullYear()}-${(createdDate.getMonth() + 1).toString().padStart(2, '0')}`
        return monthMap.has(monthKey)
      })
      const approvedLoans = monthLoans.filter(loan =>
        loan.status !== 'rejected' && loan.status !== 'cancelled'
      )
      stats.approval_rate = monthLoans.length > 0 ?
        Math.round((approvedLoans.length / monthLoans.length) * 100) : 0
    })

    return Array.from(monthMap.values())
  }

  const classStats = getClassStats()
  const monthlyStats = getMonthlyStats()
  const auditStats = getAuditStats()
  const backupStats = getBackupStats()
  const systemStats = getSystemStats()

  // 학급 옵션 생성
  const getClassOptions = (): string[] => {
    const grades = gradeFilter === 'all' ? [1, 2, 3] : [parseInt(gradeFilter)]
    const options: string[] = []

    grades.forEach(grade => {
      for (let classNum = 1; classNum <= 13; classNum++) {
        options.push(`${grade}-${classNum}`)
      }
    })

    return options
  }

  // 차트 색상
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#ff8042']

  return (
    <div className="space-y-6">
      {/* 필터 컨트롤 */}
      <Card>
        <CardHeader>
          <CardTitle>통계 필터</CardTitle>
          <CardDescription>학년과 학급을 선택하여 통계를 필터링할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">학년</label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="1">1학년</SelectItem>
                  <SelectItem value="2">2학년</SelectItem>
                  <SelectItem value="3">3학년</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">학급</label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {getClassOptions().map(option => (
                    <SelectItem key={option} value={option}>
                      {option}반
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Badge variant="secondary">
                {getFilteredLoans().length}건의 데이터
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 탭 컨테이너 */}
      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="usage">이용률 통계</TabsTrigger>
          <TabsTrigger value="audit">감사 로그</TabsTrigger>
          <TabsTrigger value="backup">백업 관리</TabsTrigger>
          <TabsTrigger value="system">시스템 설정</TabsTrigger>
        </TabsList>

        {/* 이용률 통계 탭 */}
        <TabsContent value="usage" className="space-y-6">
          {/* 요약 카드들 */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">총 요청</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.totalRequests}</div>
                <p className="text-xs text-muted-foreground">전체 대여 요청</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">현재 대여중</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.activeLoans}</div>
                <p className="text-xs text-muted-foreground">수령 후 미반납</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">승인률</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.approvalRate}%</div>
                <p className="text-xs text-muted-foreground">요청 대비 승인</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">기기 활용률</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.utilizationRate}%</div>
                <p className="text-xs text-muted-foreground">전체 기기 대비</p>
              </CardContent>
            </Card>
          </div>

          {/* 학급별 이용률 차트 */}
          <Card>
            <CardHeader>
              <CardTitle>학급별 이용률</CardTitle>
              <CardDescription>
                각 학급의 노트북 대여 현황 및 이용률
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classStats.slice(0, 15)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="class" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'total' ? `${value}건` :
                        name === 'active' ? `${value}건` :
                        name === 'completed' ? `${value}건` :
                        `${value}%`,
                        name === 'total' ? '총 요청' :
                        name === 'active' ? '대여중' :
                        name === 'completed' ? '반납완료' :
                        '이용률'
                      ]}
                    />
                    <Bar dataKey="total" fill="#8884d8" name="total" />
                    <Bar dataKey="active" fill="#82ca9d" name="active" />
                    <Bar dataKey="completed" fill="#ffc658" name="completed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 월별 추이 */}
          <Card>
            <CardHeader>
              <CardTitle>월별 이용 추이</CardTitle>
              <CardDescription>최근 6개월간 대여 현황 변화</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [
                        `${value}${name === 'approval_rate' ? '%' : '건'}`,
                        name === 'total' ? '총 요청' :
                        name === 'active' ? '대여중' :
                        name === 'completed' ? '반납완료' :
                        '승인률'
                      ]}
                    />
                    <Line type="monotone" dataKey="total" stroke="#8884d8" name="total" />
                    <Line type="monotone" dataKey="active" stroke="#82ca9d" name="active" />
                    <Line type="monotone" dataKey="completed" stroke="#ffc658" name="completed" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 상세 통계 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle>학급별 상세 통계</CardTitle>
              <CardDescription>
                모든 학급의 노트북 대여 상세 현황
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">학급</th>
                      <th className="text-right p-2">총 요청</th>
                      <th className="text-right p-2">대여중</th>
                      <th className="text-right p-2">반납완료</th>
                      <th className="text-right p-2">승인률</th>
                      <th className="text-right p-2">이용률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStats.map((stats) => (
                      <tr key={stats.class} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{stats.class}</td>
                        <td className="p-2 text-right">{stats.total}건</td>
                        <td className="p-2 text-right">{stats.active}건</td>
                        <td className="p-2 text-right">{stats.completed}건</td>
                        <td className="p-2 text-right">{stats.approval_rate}%</td>
                        <td className="p-2 text-right">{stats.utilization}%</td>
                      </tr>
                    ))}
                    {classStats.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          선택한 조건에 해당하는 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 감사 로그 탭 */}
        <TabsContent value="audit" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>상태별 분포</CardTitle>
                <CardDescription>대여 신청 상태별 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={auditStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, percentage }) => `${status}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {auditStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}건`, '건수']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>로그 요약</CardTitle>
                <CardDescription>감사 로그 통계 요약</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditStats.map((stat) => (
                    <div key={stat.status} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{stat.status}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{stat.count}건</span>
                        <Badge variant="secondary">{stat.percentage}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>최근 활동 로그</CardTitle>
              <CardDescription>최근 대여 신청 및 처리 내역</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">날짜</th>
                      <th className="text-left p-2">학급</th>
                      <th className="text-left p-2">학생</th>
                      <th className="text-left p-2">상태</th>
                      <th className="text-left p-2">기기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredLoans().slice(0, 20).map((loan, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          {new Date(loan.created_at || loan.requestedAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="p-2">{loan.class_name || loan.className}</td>
                        <td className="p-2">{loan.student_name || loan.studentName}</td>
                        <td className="p-2">
                          <Badge variant="secondary">{loan.status}</Badge>
                        </td>
                        <td className="p-2">{loan.device_tag || loan.deviceTag}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 백업 관리 탭 */}
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>최근 백업 현황</CardTitle>
              <CardDescription>지난 7일간 자동 백업 실행 결과</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">날짜</th>
                      <th className="text-left p-2">상태</th>
                      <th className="text-right p-2">크기</th>
                      <th className="text-right p-2">소요시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backupStats.map((backup, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-2">{backup.date}</td>
                        <td className="p-2">
                          <Badge variant={backup.status === '성공' ? 'default' : 'destructive'}>
                            {backup.status}
                          </Badge>
                        </td>
                        <td className="p-2 text-right">{backup.size}</td>
                        <td className="p-2 text-right">{backup.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>백업 설정</CardTitle>
              <CardDescription>자동 백업 스케줄 및 보관 정책</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">백업 주기</label>
                    <p className="text-sm text-muted-foreground">매일 새벽 2시 자동 실행</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">보관 기간</label>
                    <p className="text-sm text-muted-foreground">30일간 보관 후 자동 삭제</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">백업 위치</label>
                    <p className="text-sm text-muted-foreground">Supabase 클라우드 스토리지</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">성공률</label>
                    <p className="text-sm text-muted-foreground">
                      {Math.round((backupStats.filter(b => b.status === '성공').length / backupStats.length) * 100)}% (최근 7일)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 시스템 설정 탭 */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>시스템 현황</CardTitle>
                <CardDescription>전체 시스템 사용 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">등록 사용자</span>
                    <span className="text-sm">{systemStats.totalUsers}명</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">총 기기 수</span>
                    <span className="text-sm">{systemStats.totalDevices}대</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">현재 대여중</span>
                    <span className="text-sm">{systemStats.activeLoans}대</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">기기 활용률</span>
                    <span className="text-sm">{systemStats.utilizationRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>시스템 설정</CardTitle>
                <CardDescription>주요 시스템 설정 정보</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">인증 방식</span>
                    <span className="text-sm">Google Workspace SSO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">허용 도메인</span>
                    <span className="text-sm">gclass.ice.go.kr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">세션 유지 시간</span>
                    <span className="text-sm">24시간</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">대여 기간 제한</span>
                    <span className="text-sm">최대 7일</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>권한 설정</CardTitle>
              <CardDescription>사용자 역할별 권한 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">역할</th>
                      <th className="text-left p-2">권한</th>
                      <th className="text-right p-2">사용자 수</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-medium">관리자</td>
                      <td className="p-2">전체 시스템 관리</td>
                      <td className="p-2 text-right">1명</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">담임교사</td>
                      <td className="p-2">학급 대여 승인</td>
                      <td className="p-2 text-right">39명</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">관리팀</td>
                      <td className="p-2">기기 관리</td>
                      <td className="p-2 text-right">3명</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">학생</td>
                      <td className="p-2">대여 신청</td>
                      <td className="p-2 text-right">{systemStats.totalUsers - 43}명</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}