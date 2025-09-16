'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HomeLoanRequestForm } from '@/components/forms/home-loan-request-form'
import { formatDateTime, getStatusColor, getStatusText } from '@/lib/utils'

interface StudentDashboardProps {
  student: {
    id: string
    name: string
    studentNo: string
    className: string
    email: string
  }
  currentLoans: any[]
  loanHistory: any[]
}

export function StudentDashboard({ student, currentLoans, loanHistory }: StudentDashboardProps) {
  const [showLoanRequest, setShowLoanRequest] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLoanRequest = async (requestData: any) => {
    setIsSubmitting(true)
    try {
      // TODO: 실제 API 호출
      console.log('Submitting loan request:', requestData)

      // 임시로 성공 처리
      await new Promise(resolve => setTimeout(resolve, 2000))

      alert('가정대여 신청이 완료되었습니다. 승인 결과는 이메일로 안내드리겠습니다.')
      setShowLoanRequest(false)
    } catch (error) {
      console.error('Loan request failed:', error)
      alert('신청 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasActiveLoan = currentLoans.some(loan => ['requested', 'approved', 'picked_up'].includes(loan.status))

  return (
    <div className="space-y-6">
      {/* 환영 메시지 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          안녕하세요, {student.name}님! 👋
        </h1>
        <p className="text-gray-600">
          {student.className} {student.studentNo}번 • 노트북 관리 시스템에 오신 것을 환영합니다.
        </p>
      </div>

      {/* 대여 신청 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>가정대여 신청</CardTitle>
          <CardDescription>
            집에서 사용할 노트북을 대여 신청할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasActiveLoan ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">진행 중인 대여가 있습니다</h3>
              <p className="text-gray-600 mb-4">
                현재 대여 신청 중이거나 사용 중인 노트북이 있어 새로운 신청을 할 수 없습니다.
              </p>
              <Badge className="bg-blue-100 text-blue-800">
                {currentLoans.find(loan => ['requested', 'approved', 'picked_up'].includes(loan.status))?.status === 'requested' && '승인 대기 중'}
                {currentLoans.find(loan => ['requested', 'approved', 'picked_up'].includes(loan.status))?.status === 'approved' && '수령 대기 중'}
                {currentLoans.find(loan => ['requested', 'approved', 'picked_up'].includes(loan.status))?.status === 'picked_up' && '사용 중'}
              </Badge>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">노트북 대여 신청</h3>
              <p className="text-gray-600 mb-4">
                과제나 학습을 위해 노트북을 집에서 사용하고 싶다면 가정대여를 신청하세요.
              </p>
              <Button onClick={() => setShowLoanRequest(true)} size="lg">
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                가정대여 신청하기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 현재 대여 현황 */}
      {currentLoans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>현재 대여 현황</CardTitle>
            <CardDescription>
              현재 신청 중이거나 사용 중인 노트북 정보입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentLoans.map((loan) => (
                <div key={loan.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">
                        {loan.deviceTag ? `기기: ${loan.deviceTag}` : '기기 배정 대기 중'}
                      </h4>
                      <Badge className={getStatusColor(loan.status)}>
                        {getStatusText(loan.status)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">신청일:</span>
                      <span className="ml-2">{formatDateTime(loan.requestedAt)}</span>
                    </div>
                    {loan.approvedAt && (
                      <div>
                        <span className="text-gray-600">승인일:</span>
                        <span className="ml-2">{formatDateTime(loan.approvedAt)}</span>
                      </div>
                    )}
                    {loan.dueDate && (
                      <div>
                        <span className="text-gray-600">반납 예정:</span>
                        <span className="ml-2">{formatDateTime(loan.dueDate)}</span>
                      </div>
                    )}
                    {loan.purpose && (
                      <div>
                        <span className="text-gray-600">사용 목적:</span>
                        <span className="ml-2">{loan.purpose}</span>
                      </div>
                    )}
                  </div>

                  {loan.status === 'approved' && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>승인 완료!</strong> 노트북 관리실에서 기기를 수령하세요.
                      </p>
                    </div>
                  )}

                  {loan.status === 'picked_up' && loan.dueDate && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        <strong>사용 중</strong> • 반납 예정일을 지켜주세요.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 대여 이력 */}
      <Card>
        <CardHeader>
          <CardTitle>대여 이력</CardTitle>
          <CardDescription>
            지금까지의 노트북 대여 기록입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loanHistory.length > 0 ? (
            <div className="space-y-3">
              {loanHistory.slice(0, 5).map((loan) => (
                <div key={loan.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{loan.deviceTag || '기기 정보 없음'}</span>
                      <Badge variant="outline" className={getStatusColor(loan.status)}>
                        {getStatusText(loan.status)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDateTime(loan.requestedAt)}
                      {loan.returnedAt && ` ~ ${formatDateTime(loan.returnedAt)}`}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {loan.purpose}
                  </div>
                </div>
              ))}
              {loanHistory.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="ghost" size="sm">
                    더 보기 ({loanHistory.length - 5}개 더)
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              아직 대여 이력이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 대여 신청 모달 */}
      <HomeLoanRequestForm
        isOpen={showLoanRequest}
        onClose={() => setShowLoanRequest(false)}
        onSubmit={handleLoanRequest}
        isSubmitting={isSubmitting}
        studentInfo={student}
      />
    </div>
  )
}