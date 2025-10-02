'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

interface StatisticsByCategoryProps {
  loans: any[]
}

export function StatisticsByCategory({ loans }: StatisticsByCategoryProps) {
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

  // 학급별 이용률 계산
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
            approved: 0,
            rejected: 0,
            utilization: 0,
            approval_rate: 0
          })
        }
      }
    })

    // 실제 대여 데이터로 통계 계산
    filteredLoans.forEach(loan => {
      const className = loan.class_name || loan.className
      if (className && classMap.has(className)) {
        const stats = classMap.get(className)

        // 모든 요청 카운팅
        stats.total++

        // 상태별 카운팅
        if (loan.status === 'picked_up') {
          stats.active++
          stats.approved++
        } else if (loan.status === 'returned') {
          stats.completed++
          stats.approved++
        } else if (loan.status === 'approved') {
          stats.approved++
        } else if (loan.status === 'rejected') {
          stats.rejected++
        }
      }
    })

    // 이용률 및 승인률 계산
    const allStats = Array.from(classMap.values())

    allStats.forEach(stats => {
      // 실제 이용률 (수령+반납 / 전체 요청)
      const actualUsage = stats.active + stats.completed
      stats.utilization = stats.total > 0 ? Math.round((actualUsage / stats.total) * 100) : 0

      // 승인률 (승인+수령+반납 / 전체 요청)
      stats.approval_rate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0
    })

    return allStats.filter(stats => stats.total > 0).sort((a, b) => b.total - a.total)
  }

  // 학년별 통계
  const getGradeStats = () => {
    const filteredLoans = getFilteredLoans()
    const gradeMap = new Map()

    // 학년별 초기화
    const grades = gradeFilter === 'all' ? [1, 2, 3] : [parseInt(gradeFilter)]
    grades.forEach(grade => {
      gradeMap.set(grade, {
        grade: `${grade}학년`,
        total: 0,
        active: 0,
        completed: 0
      })
    })

    filteredLoans.forEach(loan => {
      const className = loan.class_name || loan.className
      if (className) {
        const grade = parseInt(className.split('-')[0])
        if (gradeMap.has(grade)) {
          const stats = gradeMap.get(grade)

          // 실제로 이용한 경우만 카운팅
          if (loan.status === 'picked_up' || loan.status === 'returned') {
            stats.total++

            if (loan.status === 'picked_up') {
              stats.active++
            } else if (loan.status === 'returned') {
              stats.completed++
            }
          }
        }
      }
    })

    return Array.from(gradeMap.values()).filter(stats => stats.total > 0)
  }

  // 월별 이용률 (최근 6개월)
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
        requests: 0
      })
    }

    filteredLoans.forEach(loan => {
      const createdDate = new Date(loan.created_at || loan.requestedAt)
      const monthKey = `${createdDate.getFullYear()}-${(createdDate.getMonth() + 1).toString().padStart(2, '0')}`

      if (monthMap.has(monthKey)) {
        const stats = monthMap.get(monthKey)
        stats.requests++ // 전체 요청

        // 실제로 이용한 경우만 카운팅
        if (loan.status === 'picked_up' || loan.status === 'returned') {
          stats.total++

          if (loan.status === 'picked_up') {
            stats.active++
          } else if (loan.status === 'returned') {
            stats.completed++
          }
        }
      }
    })

    return Array.from(monthMap.values())
  }

  const classStats = getClassStats()
  const gradeStats = getGradeStats()
  const monthlyStats = getMonthlyStats()

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
      {/* 탭 컨테이너 */}
      <Tabs defaultValue="class-usage" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="class-usage">학급별 이용률</TabsTrigger>
          <TabsTrigger value="monthly-trend">월별 이용추이</TabsTrigger>
          <TabsTrigger value="detailed-stats">학급별 상세 통계</TabsTrigger>
        </TabsList>

        {/* 학급별 이용률 탭 */}
        <TabsContent value="class-usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>학급별 이용률</CardTitle>
              <CardDescription>
                각 학급의 노트북 대여 현황을 막대그래프로 확인할 수 있습니다.
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
                        `${value}건`,
                        name === 'total' ? '총 요청' :
                        name === 'active' ? '대여중' :
                        '반납완료'
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

          <div className="grid gap-6 md:grid-cols-2">
            {/* 학년별 통계 파이차트 */}
            <Card>
              <CardHeader>
                <CardTitle>학년별 이용 분포</CardTitle>
                <CardDescription>
                  학년별 노트북 실제 대여 현황
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gradeStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ grade, total }) => `${grade}: ${total}건`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="total"
                      >
                        {gradeStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}건`, '총 대여']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 이용률 순위 */}
            <Card>
              <CardHeader>
                <CardTitle>상위 이용 학급 순위</CardTitle>
                <CardDescription>
                  가장 많이 이용하는 학급 TOP 10
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {classStats.slice(0, 10).map((stats, index) => (
                    <div key={stats.class} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant={index < 3 ? 'default' : 'secondary'}>
                          {index + 1}위
                        </Badge>
                        <span className="text-sm font-medium">{stats.class}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{stats.total}건</span>
                        <Badge variant="outline">{stats.utilization}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 월별 이용추이 탭 */}
        <TabsContent value="monthly-trend" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>월별 이용 추이</CardTitle>
              <CardDescription>
                최근 6개월간 노트북 대여 현황의 변화 추이를 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [
                        `${value}건`,
                        name === 'requests' ? '전체 요청' :
                        name === 'total' ? '실제 이용' :
                        name === 'active' ? '대여중' :
                        '반납완료'
                      ]}
                    />
                    <Line type="monotone" dataKey="requests" stroke="#ff7300" name="requests" strokeWidth={2} />
                    <Line type="monotone" dataKey="total" stroke="#8884d8" name="total" strokeWidth={2} />
                    <Line type="monotone" dataKey="active" stroke="#82ca9d" name="active" strokeWidth={2} />
                    <Line type="monotone" dataKey="completed" stroke="#ffc658" name="completed" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            {monthlyStats.slice(-3).map((month, index) => (
              <Card key={month.month}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{month.month}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">전체 요청</span>
                      <span className="text-sm font-medium">{month.requests}건</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">실제 이용</span>
                      <span className="text-sm font-medium">{month.total}건</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">대여중</span>
                      <span className="text-sm font-medium">{month.active}건</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">반납완료</span>
                      <span className="text-sm font-medium">{month.completed}건</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm font-medium">이용률</span>
                      <Badge variant="secondary">
                        {month.requests > 0 ? Math.round((month.total / month.requests) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 학급별 상세 통계 탭 (필터 포함) */}
        <TabsContent value="detailed-stats" className="space-y-6">
          {/* 필터 컨트롤 */}
          <Card>
            <CardHeader>
              <CardTitle>통계 필터</CardTitle>
              <CardDescription>학년과 학급을 선택하여 원하는 범위의 상세 통계를 확인할 수 있습니다.</CardDescription>
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

          {/* 요약 통계 카드 */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">총 요청</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{classStats.reduce((sum, stat) => sum + stat.total, 0)}</div>
                <p className="text-xs text-muted-foreground">전체 대여 요청</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">현재 대여중</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{classStats.reduce((sum, stat) => sum + stat.active, 0)}</div>
                <p className="text-xs text-muted-foreground">수령 후 미반납</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">반납완료</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{classStats.reduce((sum, stat) => sum + stat.completed, 0)}</div>
                <p className="text-xs text-muted-foreground">정상 반납된 건수</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">평균 이용률</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {classStats.length > 0 ? Math.round(classStats.reduce((sum, stat) => sum + stat.utilization, 0) / classStats.length) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">학급별 평균</p>
              </CardContent>
            </Card>
          </div>

          {/* 상세 통계 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle>학급별 상세 통계</CardTitle>
              <CardDescription>
                필터링된 범위의 모든 학급 상세 현황 ({classStats.length}개 학급)
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
                        <td className="p-2 text-right">
                          <Badge variant={stats.approval_rate >= 80 ? 'default' : 'secondary'}>
                            {stats.approval_rate}%
                          </Badge>
                        </td>
                        <td className="p-2 text-right">
                          <Badge variant={stats.utilization >= 80 ? 'default' : 'secondary'}>
                            {stats.utilization}%
                          </Badge>
                        </td>
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
      </Tabs>
    </div>
  )
}