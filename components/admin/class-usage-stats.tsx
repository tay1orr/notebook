'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface ClassUsageStatsProps {
  loans: any[]
}

export function ClassUsageStats({ loans }: ClassUsageStatsProps) {
  // 학급별 이용률 계산
  const getClassStats = () => {
    const classMap = new Map()

    // 모든 학급 초기화 (1-1반부터 3-13반까지)
    for (let grade = 1; grade <= 3; grade++) {
      for (let classNum = 1; classNum <= 13; classNum++) {
        const className = `${grade}-${classNum}반`
        classMap.set(className, {
          class: className,
          grade: grade,
          total: 0,
          active: 0,
          completed: 0,
          utilization: 0
        })
      }
    }

    // 실제 대여 데이터로 통계 계산
    loans.forEach(loan => {
      const className = loan.class_name || loan.className
      if (className && classMap.has(className)) {
        const stats = classMap.get(className)
        stats.total++

        if (loan.status === 'picked_up') {
          stats.active++
        } else if (loan.status === 'returned') {
          stats.completed++
        }
      }
    })

    // 이용률 계산 (전체 대여 건수 기준)
    const allStats = Array.from(classMap.values())
    allStats.forEach(stats => {
      stats.utilization = stats.total > 0 ? Math.round((stats.total / loans.length) * 100) : 0
    })

    return allStats.filter(stats => stats.total > 0).sort((a, b) => b.total - a.total)
  }

  // 학년별 통계
  const getGradeStats = () => {
    const gradeMap = new Map()

    // 학년별 초기화
    for (let grade = 1; grade <= 3; grade++) {
      gradeMap.set(grade, {
        grade: `${grade}학년`,
        total: 0,
        active: 0,
        completed: 0
      })
    }

    loans.forEach(loan => {
      const className = loan.class_name || loan.className
      if (className) {
        const grade = parseInt(className.split('-')[0])
        if (gradeMap.has(grade)) {
          const stats = gradeMap.get(grade)
          stats.total++

          if (loan.status === 'picked_up') {
            stats.active++
          } else if (loan.status === 'returned') {
            stats.completed++
          }
        }
      }
    })

    return Array.from(gradeMap.values()).filter(stats => stats.total > 0)
  }

  // 월별 이용률 (최근 6개월)
  const getMonthlyStats = () => {
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
        completed: 0
      })
    }

    loans.forEach(loan => {
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

    return Array.from(monthMap.values())
  }

  const classStats = getClassStats()
  const gradeStats = getGradeStats()
  const monthlyStats = getMonthlyStats()

  // 차트 색상
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe']

  return (
    <div className="space-y-6">
      {/* 학급별 이용률 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>학급별 이용률</CardTitle>
          <CardDescription>
            각 학급의 노트북 대여 이용률 (상위 10개 학급)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classStats.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'total' ? `${value}건` :
                    name === 'active' ? `${value}건` :
                    `${value}건`,
                    name === 'total' ? '총 대여' :
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
        {/* 학년별 통계 */}
        <Card>
          <CardHeader>
            <CardTitle>학년별 이용률</CardTitle>
            <CardDescription>
              학년별 노트북 대여 현황
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

        {/* 월별 이용률 */}
        <Card>
          <CardHeader>
            <CardTitle>월별 이용률</CardTitle>
            <CardDescription>
              최근 6개월간 노트북 대여 추이
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value}건`,
                      name === 'total' ? '총 대여' :
                      name === 'active' ? '대여중' :
                      '반납완료'
                    ]}
                  />
                  <Bar dataKey="total" fill="#8884d8" name="total" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  <th className="text-right p-2">총 대여</th>
                  <th className="text-right p-2">대여중</th>
                  <th className="text-right p-2">반납완료</th>
                  <th className="text-right p-2">이용률(%)</th>
                </tr>
              </thead>
              <tbody>
                {classStats.map((stats) => (
                  <tr key={stats.class} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{stats.class}</td>
                    <td className="p-2 text-right">{stats.total}건</td>
                    <td className="p-2 text-right">{stats.active}건</td>
                    <td className="p-2 text-right">{stats.completed}건</td>
                    <td className="p-2 text-right">{stats.utilization}%</td>
                  </tr>
                ))}
                {classStats.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      아직 대여 기록이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}