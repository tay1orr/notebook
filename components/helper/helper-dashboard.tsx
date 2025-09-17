'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getRoleText, getStatusColor, getStatusText, formatDateTime, getPurposeText, getCurrentKoreaTime, getLoanStatus } from '@/lib/utils'
import { LoansManagement } from '@/components/loans/loans-management'
import { StudentDashboard } from '@/components/student/student-dashboard'

interface HelperDashboardProps {
  user: {
    name: string
    role: string
    email: string
    className?: string
    studentNo?: string
  }
}

export function HelperDashboard({ user }: HelperDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>('management')
  const [loans, setLoans] = useState<any[]>([])
  const [myLoans, setMyLoans] = useState<any[]>([])

  useEffect(() => {
    const loadLoans = async () => {
      try {
        const response = await fetch('/api/loans')
        if (response.ok) {
          const { loans } = await response.json()
          setLoans(loans)

          // 내 대여 신청만 필터링
          const myApplications = loans.filter((loan: any) =>
            loan.email === user.email ||
            (user.className && user.studentNo &&
             loan.class_name === user.className &&
             loan.student_no === user.studentNo)
          )
          setMyLoans(myApplications)
        } else {
          throw new Error('API failed')
        }
      } catch (error) {
        console.error('도우미 대시보드 - API 오류, localStorage 사용:', error)

        if (typeof window !== 'undefined') {
          const storedLoans = localStorage.getItem('loanApplications')
          if (storedLoans) {
            try {
              const loans = JSON.parse(storedLoans)
              setLoans(loans)

              const myApplications = loans.filter((loan: any) =>
                loan.email === user.email ||
                (user.className && user.studentNo &&
                 loan.className === user.className &&
                 loan.studentNo === user.studentNo)
              )
              setMyLoans(myApplications)
            } catch (parseError) {
              console.error('localStorage 파싱 실패:', parseError)
            }
          }
        }
      }
    }

    loadLoans()
    const interval = setInterval(loadLoans, 2000)
    return () => clearInterval(interval)
  }, [user.email, user.className, user.studentNo])

  // 도우미가 담당하는 반의 대여 신청 필터링
  const getHelperClassLoans = () => {
    if (!user.className) return []
    return loans.filter((loan: any) =>
      loan.class_name === user.className || loan.className === user.className
    )
  }

  const helperClassLoans = getHelperClassLoans()
  const pendingLoans = helperClassLoans.filter((loan: any) => loan.status === 'requested')
  const activeLoans = helperClassLoans.filter((loan: any) => loan.status === 'picked_up')
  const overdueLoans = helperClassLoans.filter((loan: any) => getLoanStatus(loan) === 'overdue')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {user.role === 'homeroom' ? '담임교사 대시보드' : '도우미 대시보드'}
          </h1>
          <p className="text-muted-foreground">
            안녕하세요, <strong>{user.name}</strong>님 ({getRoleText(user.role)})
            {user.className && ` • 담당 반: ${user.className}`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            인천중산고등학교
          </Badge>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">담당반 신청대기</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLoans.length}</div>
            <p className="text-xs text-muted-foreground">처리 대기 중인 신청</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">담당반 사용중</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLoans.length}</div>
            <p className="text-xs text-muted-foreground">현재 대여 중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">담당반 연체</CardTitle>
            <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueLoans.length}</div>
            <p className="text-xs text-muted-foreground">즉시 확인 필요</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">내 대여 신청</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myLoans.length}</div>
            <p className="text-xs text-muted-foreground">내 대여 기록</p>
          </CardContent>
        </Card>
      </div>

      {/* 도우미 전용 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="management">
            대여 승인 업무
          </TabsTrigger>
          <TabsTrigger value="personal">
            개인 대여 신청
          </TabsTrigger>
        </TabsList>

        <TabsContent value="management">
          <Card>
            <CardHeader>
              <CardTitle>담당반 대여 관리</CardTitle>
              <CardDescription>
                {user.className ? `${user.className}반 학생들의 대여 신청을 승인하고 관리할 수 있습니다.` : '담당반이 설정되지 않았습니다.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.className ? (
                <div className="space-y-4">
                  {/* 간단한 대여 관리 UI를 여기에 구현 */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{pendingLoans.length}</div>
                      <p className="text-sm text-muted-foreground">승인 대기</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{activeLoans.length}</div>
                      <p className="text-sm text-muted-foreground">사용 중</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{overdueLoans.length}</div>
                      <p className="text-sm text-muted-foreground">연체</p>
                    </div>
                  </div>

                  {pendingLoans.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">승인 대기 중인 신청</h3>
                      {pendingLoans.map((loan: any) => (
                        <div key={loan.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{loan.student_name || loan.studentName}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                {loan.class_name || loan.className} {loan.student_no || loan.studentNo}번
                              </span>
                            </div>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">거절</Button>
                              <Button size="sm">승인</Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  담당반이 설정되지 않았습니다. 관리자에게 문의하세요.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>개인 대여 신청</CardTitle>
              <CardDescription>
                도우미도 필요 시 노트북을 대여할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StudentDashboard
                student={{
                  name: user.name,
                  email: user.email,
                  className: user.className || '',
                  studentNo: user.studentNo || '',
                  phone: ''
                }}
                userRole="helper"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}