'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getRoleText, getStatusColor, getStatusText, formatDateTime, getPurposeText, getCurrentKoreaTime, getLoanStatus } from '@/lib/utils'
import { LoansManagement } from '@/components/loans/loans-management'
import { StudentDashboard } from '@/components/student/student-dashboard'
import { ApprovalSignatureModal } from '@/components/forms/approval-signature-modal'

interface HelperDashboardProps {
  user: {
    name: string
    role: string
    email: string
    className?: string
    studentNo?: string
    grade?: string
    class?: string
    isApprovedHomeroom?: boolean
  }
}

export function HelperDashboard({ user }: HelperDashboardProps) {
  const router = useRouter()
  const [loans, setLoans] = useState<any[]>([])
  const [myLoans, setMyLoans] = useState<any[]>([])
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)

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

  // 도우미/담임교사가 담당하는 반의 대여 신청 필터링
  const getHelperClassLoans = () => {
    // 담임교사인 경우
    if (user.role === 'homeroom' && user.isApprovedHomeroom && user.grade && user.class) {
      const teacherClass = `${user.grade}-${user.class}`
      console.log(`Dashboard - Filtering for homeroom teacher class: ${teacherClass}`)
      return loans.filter((loan: any) => {
        const loanClass = loan.class_name || loan.className
        return loanClass === teacherClass
      })
    }
    // 도우미인 경우 (기존 로직)
    if (!user.className) return []
    return loans.filter((loan: any) =>
      loan.class_name === user.className || loan.className === user.className
    )
  }

  const helperClassLoans = getHelperClassLoans()
  const pendingLoans = helperClassLoans.filter((loan: any) => loan.status === 'requested')
  const activeLoans = helperClassLoans.filter((loan: any) => loan.status === 'picked_up')
  const overdueLoans = helperClassLoans.filter((loan: any) => getLoanStatus(loan) === 'overdue')

  // 승인 처리 함수
  const handleApprove = (loan: any) => {
    setSelectedLoan(loan)
    setShowApprovalModal(true)
  }

  // 거절 처리 함수
  const handleReject = async (loan: any) => {
    if (confirm('정말로 이 신청을 거절하시겠습니까?')) {
      try {
        const response = await fetch('/api/loans', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: loan.id,
            status: 'rejected',
            rejected_at: new Date().toISOString()
          })
        })

        if (response.ok) {
          console.log('HelperDashboard - Successfully rejected via API')
          // 로컬 상태 업데이트
          setLoans(prev => prev.map(l =>
            l.id === loan.id
              ? { ...l, status: 'rejected', rejected_at: new Date().toISOString() }
              : l
          ))
        } else {
          throw new Error('API failed')
        }
      } catch (error) {
        console.error('HelperDashboard - API reject failed:', error)
        alert('거절 처리 중 오류가 발생했습니다.')
      }
    }
  }

  // 승인 서명 처리 함수
  const handleApprovalSignature = async (data: {
    signature: string
    deviceTag: string
    approverName: string
  }) => {
    if (!selectedLoan) return

    try {
      const response = await fetch('/api/loans', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedLoan.id,
          status: 'picked_up',
          device_tag: data.deviceTag,
          approver_signature: data.signature,
          approved_by: data.approverName,
          approved_at: new Date().toISOString()
        })
      })

      if (response.ok) {
        console.log('HelperDashboard - Successfully approved via API')
        // 로컬 상태 업데이트
        setLoans(prev => prev.map(l =>
          l.id === selectedLoan.id
            ? {
                ...l,
                status: 'picked_up',
                device_tag: data.deviceTag,
                approver_signature: data.signature,
                approved_by: data.approverName,
                approved_at: new Date().toISOString()
              }
            : l
        ))
      } else {
        throw new Error('API failed')
      }
    } catch (error) {
      console.error('HelperDashboard - API approval failed:', error)
      alert('승인 처리 중 오류가 발생했습니다.')
    }

    setSelectedLoan(null)
    setShowApprovalModal(false)
  }

  const closeModal = () => {
    setSelectedLoan(null)
    setShowApprovalModal(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {user.role === 'homeroom' ? '담임교사 대시보드' : '도우미 대시보드'}
          </h1>
          <p className="text-muted-foreground">
            안녕하세요, <strong>{user.name}</strong>님 ({getRoleText(user.role)})
            {user.role === 'homeroom' && user.grade && user.class ? ` • 담당 반: ${user.grade}-${user.class}` : user.className ? ` • 담당 반: ${user.className}` : ''}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            인천중산고등학교
          </Badge>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className={`grid gap-4 md:grid-cols-2 ${user.role === 'homeroom' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/loans?tab=pending')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">담당반 신청대기</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingLoans.length}</div>
            <p className="text-xs text-muted-foreground">처리 대기 중인 신청</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/loans?tab=active')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">담당반 사용중</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeLoans.length}</div>
            <p className="text-xs text-muted-foreground">현재 대여 중</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/loans?tab=overdue')}
        >
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

        {user.role === 'helper' && (
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
        )}
      </div>

      {/* 승인 대기 중인 신청 */}
      {pendingLoans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>승인 대기 중인 신청</CardTitle>
            <CardDescription>
              {(user.role === 'homeroom' && user.grade && user.class) ? `${user.grade}-${user.class}반 학생들의 대여 신청을 승인하고 관리할 수 있습니다.` : user.className ? `${user.className}반 학생들의 대여 신청을 승인하고 관리할 수 있습니다.` : '담당반이 설정되지 않았습니다.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingLoans.map((loan: any) => (
                <div key={loan.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{loan.student_name || loan.studentName}</span>
                        <span className="text-sm text-muted-foreground">
                          {loan.class_name || loan.className} {loan.student_no || loan.studentNo}번
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        사용 목적: {getPurposeText(loan.purpose)} • 신청: {formatDateTime(loan.created_at || loan.requestedAt)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        반납 예정: {loan.return_date || loan.dueDate} • 연락처: {loan.student_contact || loan.studentContact}
                      </div>
                      {loan.purposeDetail && (
                        <div className="text-sm text-blue-600 mt-1">
                          상세 목적: {loan.purposeDetail}
                        </div>
                      )}
                      {loan.notes && (
                        <div className="text-sm text-gray-600 mt-1">
                          추가 사항: {loan.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(loan)}
                      >
                        거절
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(loan)}
                      >
                        승인
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 도우미 전용 개인 대여 신청 */}
      {user.role === 'helper' && (
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
      )}

      {/* 승인 서명 모달 */}
      {showApprovalModal && selectedLoan && (
        <ApprovalSignatureModal
          isOpen={true}
          onClose={closeModal}
          onConfirm={handleApprovalSignature}
          loanData={selectedLoan}
          approverName={user.name}
        />
      )}
    </div>
  )
}