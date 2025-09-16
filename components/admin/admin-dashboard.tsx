'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getRoleText, getStatusColor, getStatusText, formatDateTime } from '@/lib/utils'
import { ClearStorageButton } from '@/components/debug/clear-storage-button'

interface AdminDashboardProps {
  user: {
    name: string
    role: string
  }
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [loans, setLoans] = useState<any[]>([])

  useEffect(() => {
    const loadLoans = async () => {
      try {
        const response = await fetch('/api/loans')
        if (response.ok) {
          const { loans } = await response.json()
          console.log('AdminDashboard - Loaded loans from API:', loans) // 디버깅용
          setLoans(loans)
        } else {
          console.error('AdminDashboard - Failed to fetch loans:', response.statusText)

          // API 실패 시 localStorage 폴백
          if (typeof window !== 'undefined') {
            let storedLoans = localStorage.getItem('loanApplications')
            if (!storedLoans) {
              storedLoans = sessionStorage.getItem('loanApplications')
              console.log('AdminDashboard - Trying sessionStorage fallback:', storedLoans)
            }
            if (storedLoans) {
              try {
                const loans = JSON.parse(storedLoans)
                setLoans(loans)
                console.log('AdminDashboard - Using fallback data')
              } catch (error) {
                console.error('Failed to parse fallback data:', error)
              }
            }
          }
        }
      } catch (error) {
        console.error('AdminDashboard - API request failed:', error)

        // 네트워크 오류 시 localStorage 폴백
        if (typeof window !== 'undefined') {
          const storedLoans = localStorage.getItem('loanApplications') || sessionStorage.getItem('loanApplications')
          if (storedLoans) {
            try {
              const loans = JSON.parse(storedLoans)
              setLoans(loans)
              console.log('AdminDashboard - Using fallback after network error')
            } catch (error) {
              console.error('Failed to parse fallback data:', error)
            }
          }
        }
      }
    }

    loadLoans()
    const interval = setInterval(loadLoans, 3000) // API는 3초마다

    return () => {
      clearInterval(interval)
    }
  }, [])

  // 통계 계산
  const todayPickups = loans.filter(loan => loan.status === 'approved').length
  const tomorrowReturns = loans.filter(loan => loan.status === 'picked_up').length
  const overdueLoans = loans.filter(loan => loan.status === 'overdue').length
  const pendingLoans = loans.filter(loan => loan.status === 'requested').length

  console.log('AdminDashboard - Statistics:', {
    total: loans.length,
    pending: pendingLoans,
    approved: todayPickups,
    pickedUp: tomorrowReturns,
    overdue: overdueLoans
  }) // 디버깅용

  // 최근 대여 현황 (최근 5개)
  const recentLoans = loans
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">승인 대기</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLoans}</div>
            <p className="text-xs text-muted-foreground">처리 대기 중인 신청</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">수령 대기</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayPickups}</div>
            <p className="text-xs text-muted-foreground">승인 완료, 수령 대기</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">사용 중</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tomorrowReturns}</div>
            <p className="text-xs text-muted-foreground">현재 대여 중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">연체</CardTitle>
            <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueLoans}</div>
            <p className="text-xs text-muted-foreground">즉시 확인 필요</p>
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
                      {loan.purpose} • 신청: {formatDateTime(loan.requestedAt)}
                    </div>
                    {loan.dueDate && (
                      <div className="text-sm text-muted-foreground">
                        반납 예정: {loan.dueDate}
                      </div>
                    )}
                  </div>
                  <Badge className={getStatusColor(loan.status)}>
                    {getStatusText(loan.status)}
                  </Badge>
                </div>
              ))}
              {recentLoans.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  최근 대여 기록이 없습니다.
                </div>
              )}
            </div>
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
                  <Button className="w-full justify-start" variant="outline" asChild>
                    <a href="/loans">
                      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      대여 승인 처리
                    </a>
                  </Button>
                  <Button className="w-full justify-start" variant="outline" asChild>
                    <a href="/devices">
                      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      기기 관리
                    </a>
                  </Button>
                  <Button className="w-full justify-start" variant="outline" asChild>
                    <a href="/students">
                      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V7a2 2 0 012-2h4a2 2 0 012 2v0M8 7v10a2 2 0 002 2h4a2 2 0 002-2V7" />
                      </svg>
                      학생 관리
                    </a>
                  </Button>
                </>
              )}
              <Button className="w-full justify-start" variant="outline">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                학생/기기 검색
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 개발용 디버깅 버튼 */}
      <ClearStorageButton />
    </div>
  )
}