'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HomeLoanRequestForm } from '@/components/forms/home-loan-request-form'
import { formatDateTime, getStatusColor, getStatusText, getPurposeText, getCurrentKoreaTime } from '@/lib/utils'

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

export function StudentDashboard({ student, currentLoans: initialCurrentLoans, loanHistory }: StudentDashboardProps) {
  const [showLoanRequest, setShowLoanRequest] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Props 안전성 검사
  const safeCurrentLoans = initialCurrentLoans || []
  const safeLoanHistory = loanHistory || []
  const safeStudent = student || { id: '', name: '', studentNo: '', className: '', email: '' }

  // 대여 데이터 정규화 함수 - 더 강력한 처리
  const normalizeLoanData = (loan: any) => {

    // device_tag 정규화 (3-1-35 -> 3-01-35 형식으로 통일)
    let normalizedDeviceTag = loan.device_tag || loan.deviceTag
    if (normalizedDeviceTag && normalizedDeviceTag !== 'null') {
      const parts = normalizedDeviceTag.split('-')
      if (parts.length === 3) {
        normalizedDeviceTag = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
      }
    } else {
      // device_tag가 없으면 class_name과 student_no로 생성
      const className = loan.class_name || loan.className || loan.currentClass
      const studentNo = loan.student_no || loan.studentNo
      if (className && studentNo) {
        const classParts = className.split('-')
        if (classParts.length === 2) {
          const normalizedClass = `${classParts[0]}-${classParts[1].padStart(2, '0')}`
          const normalizedStudentNo = studentNo.toString().padStart(2, '0')
          normalizedDeviceTag = `${normalizedClass}-${normalizedStudentNo}`
        }
      }
    }

    // class_name 정규화
    let normalizedClassName = loan.class_name || loan.className || loan.currentClass
    if (normalizedClassName) {
      const parts = normalizedClassName.split('-')
      if (parts.length === 2) {
        normalizedClassName = `${parts[0]}-${parts[1].padStart(2, '0')}`
      }
    }

    // student_no 정규화
    const normalizedStudentNo = (loan.student_no || loan.studentNo || '').toString().padStart(2, '0')

    return {
      ...loan,
      device_tag: normalizedDeviceTag,
      class_name: normalizedClassName,
      student_no: normalizedStudentNo
    }
  }

  // 초기 데이터를 정규화하여 상태에 설정
  const normalizedInitialLoans = (safeCurrentLoans || []).map(normalizeLoanData)
  const normalizedInitialHistory = (safeLoanHistory || []).map(normalizeLoanData)

  const [currentLoans, setCurrentLoans] = useState<any[]>(normalizedInitialLoans)
  const [loanHistoryData, setLoanHistoryData] = useState(normalizedInitialHistory)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  // 데이터 해시를 useRef로 관리하여 새로고침 시에도 유지
  const lastDataHashRef = useRef('')

  // 데이터 로딩 함수 - 단순화하여 일관성 문제 해결
  const loadStudentLoans = async () => {
      try {
        const response = await fetch('/api/loans')
        if (response.ok) {
          const { loans } = await response.json()

          // 현재 학생의 대여만 필터링
          const studentLoans = loans.filter((loan: any) =>
            loan.email === safeStudent.email &&
            ['requested', 'approved', 'picked_up'].includes(loan.status)
          )

          const studentHistory = loans.filter((loan: any) =>
            loan.email === safeStudent.email &&
            ['returned', 'rejected', 'cancelled'].includes(loan.status)
          )

          // 데이터 변경 여부 확인 (간단한 해시 비교)
          const currentDataHash = JSON.stringify({
            current: (studentLoans || []).map((l: any) => ({
              id: l.id,
              status: l.status,
              created_at: l.created_at,
              device_tag: l.device_tag
            })),
            history: (studentHistory || []).map((l: any) => ({
              id: l.id,
              status: l.status,
              created_at: l.created_at
            }))
          })

          // 데이터가 변경된 경우에만 상태 업데이트
          if (currentDataHash !== lastDataHashRef.current) {
            // 임시 ID 항목들 제거 후 API 데이터로 교체 (데이터 정규화 적용)
            setCurrentLoans(prev => {
              const nonTempLoans = prev.filter(loan => !loan.id.startsWith('temp-'))
              // API에서 온 데이터와 중복되지 않는 로컬 데이터만 유지
              const apiIds = (studentLoans || []).map((l: any) => l.id)
              const uniqueLocalLoans = nonTempLoans.filter(loan => !apiIds.includes(loan.id))
              // 데이터 정규화 적용
              const normalizedApiLoans = (studentLoans || []).map(normalizeLoanData)
              const normalizedLocalLoans = uniqueLocalLoans.map(normalizeLoanData)
              return [...normalizedApiLoans, ...normalizedLocalLoans]
            })
            setLoanHistoryData(studentHistory || [])
            lastDataHashRef.current = currentDataHash
            setIsDataLoaded(true)
          }
          return
        }
      } catch (error) {
        console.error('API error:', error)
      }

      // API 실패 시 localStorage 폴백 (단순화)
      if (typeof window !== 'undefined') {
        const storedLoans = localStorage.getItem('loanApplications')
        if (storedLoans) {
          try {
            const loans = JSON.parse(storedLoans)
            const studentLoans = loans.filter((loan: any) =>
              loan.email === safeStudent.email &&
              ['requested', 'approved', 'picked_up'].includes(loan.status)
            )
            const studentHistory = loans.filter((loan: any) =>
              loan.email === safeStudent.email &&
              ['returned', 'rejected', 'cancelled'].includes(loan.status)
            )

            // localStorage 데이터도 정규화 적용
            const normalizedCurrentLoans = studentLoans.map(normalizeLoanData)
            const normalizedHistory = studentHistory.map(normalizeLoanData)
            setCurrentLoans(normalizedCurrentLoans)
            setLoanHistoryData(normalizedHistory)
          } catch (parseError) {
            console.error('Failed to parse fallback data:', parseError)
          }
        }
      }
    }

  // 초기 해시 설정 및 데이터 로드
  useEffect(() => {
    // 초기 데이터의 해시를 설정하여 중복 업데이트 방지
    if (normalizedInitialLoans.length > 0) {
      const initialHash = JSON.stringify({
        current: normalizedInitialLoans.map((l: any) => ({
          id: l.id,
          status: l.status,
          created_at: l.created_at,
          device_tag: l.device_tag
        })),
        history: normalizedInitialHistory.map((l: any) => ({
          id: l.id,
          status: l.status,
          created_at: l.created_at
        }))
      })
      lastDataHashRef.current = initialHash
      setIsDataLoaded(true)
    }

    // 약간의 지연 후 API 데이터 로드 (초기 데이터 표시 후)
    const loadTimeout = setTimeout(() => {
      loadStudentLoans()
    }, 100)

    // 5초마다 체크 (실시간 상태 변화 반영)
    const interval = setInterval(loadStudentLoans, 5000)

    return () => {
      clearTimeout(loadTimeout)
      clearInterval(interval)
    }
  }, [safeStudent.email])

  const handleLoanRequest = async (requestData: any) => {
    // 중복 신청 방지 체크
    if (hasActiveLoan) {
      alert('이미 진행 중인 대여가 있습니다.')
      return
    }

    setIsSubmitting(true)
    try {

      // 새로운 대여 신청 객체 생성 - API 형식에 맞춤
      const currentKoreaTime = getCurrentKoreaTime()
      const tempId = `temp-${Date.now()}`

      // 데이터 정규화를 위한 기본 값 설정
      const deviceTag = requestData.device_tag || requestData.deviceTag || null
      const className = requestData.className || requestData.currentClass || safeStudent.className
      const studentNo = requestData.studentNo || safeStudent.studentNo

      const newLoanRequest = {
        id: tempId,
        status: 'requested',
        created_at: currentKoreaTime,
        purpose: requestData.purpose,
        purpose_detail: requestData.purposeDetail,
        due_date: `${requestData.returnDate} 09:00`,
        student_contact: requestData.studentContact,
        notes: requestData.notes || '',
        device_tag: deviceTag,
        student_name: requestData.studentName || safeStudent.name,
        student_no: studentNo,
        class_name: className,
        email: safeStudent.email,
        signature: requestData.studentSignature || requestData.signature || null
      }

      // API 시도 (실패해도 localStorage 사용)
      try {
        const response = await fetch('/api/loans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            student_name: requestData.studentName || safeStudent.name,
            student_no: requestData.studentNo || safeStudent.studentNo,
            class_name: requestData.className || safeStudent.className,
            email: safeStudent.email,
            student_contact: requestData.studentContact,
            purpose: requestData.purpose,
            purpose_detail: requestData.purposeDetail,
            return_date: requestData.returnDate,
            return_time: '09:00',
            due_date: newLoanRequest.due_date,
            device_tag: deviceTag,
            signature: requestData.studentSignature || requestData.signature || null,
            notes: requestData.notes || ''
          })
        })

        if (response.ok) {
          const { loan: apiLoanRequest } = await response.json()
          // API에서 받은 실제 데이터로 교체
          Object.assign(newLoanRequest, {
            id: apiLoanRequest.id,
            created_at: apiLoanRequest.created_at,
            device_tag: apiLoanRequest.device_tag,
            class_name: apiLoanRequest.class_name,
            student_no: apiLoanRequest.student_no
          })
        } else {
          console.error('API failed, using localStorage:', response.statusText)
        }
      } catch (apiError) {
        console.error('API error, using localStorage:', apiError)
      }

      // localStorage에 저장 (폴백 및 크로스 브라우저 동기화용)
      if (typeof window !== 'undefined') {
        const existingLoans = localStorage.getItem('loanApplications')
        const loans = existingLoans ? JSON.parse(existingLoans) : []
        loans.push(newLoanRequest)
        localStorage.setItem('loanApplications', JSON.stringify(loans))

        // BroadcastChannel로 다른 탭에 알림
        try {
          const channel = new BroadcastChannel('loan-applications')
          channel.postMessage({
            type: 'NEW_LOAN_APPLICATION',
            data: newLoanRequest,
            allLoans: loans
          })
        } catch (error) {
          // BroadcastChannel not supported in this environment
        }
      }

      // 로컬 상태 즉시 업데이트 (임시 ID가 실제 ID로 교체된 경우 고려)
      setCurrentLoans(prev => {
        // 임시 ID가 실제 ID로 교체된 경우 중복 방지
        const filteredPrev = prev.filter(loan => !loan.id.startsWith('temp-'))
        // 새 데이터도 정규화 적용
        const normalizedNewLoan = normalizeLoanData(newLoanRequest)
        return [normalizedNewLoan, ...filteredPrev]
      })

      // 해시 업데이트로 다음 폴링에서 중복 업데이트 방지
      const normalizedForHash = normalizeLoanData(newLoanRequest)
      const updatedHash = JSON.stringify({
        current: [normalizedForHash].map((l: any) => ({
          id: l.id,
          status: l.status,
          created_at: l.created_at,
          device_tag: l.device_tag
        })),
        history: loanHistoryData.map((l: any) => ({
          id: l.id,
          status: l.status,
          created_at: l.created_at
        }))
      })
      lastDataHashRef.current = updatedHash

      alert(`가정대여 신청이 완료되었습니다!

📋 신청 내용:
• 사용 목적: ${getPurposeText(requestData.purpose)}
• 반납 예정일: ${requestData.returnDate}
• 연락처: ${requestData.studentContact}

✅ 다음 단계:
1. 승인 결과를 기다려 주세요
2. 승인되면 즉시 교실 충전함에서 기기를 사용하실 수 있습니다

⚠️ 주의사항:
• 반납 기한을 반드시 지켜주세요
• 분실/파손 시 즉시 연락바랍니다`)

      setShowLoanRequest(false)

      // 페이지 새로고침 제거 - 로컬 상태로 즉시 반영
    } catch (error) {
      console.error('Loan request failed:', error)
      alert('신청 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasActiveLoan = currentLoans.some(loan => ['requested', 'approved', 'picked_up'].includes(loan.status))


  const handleCancelLoan = async (loanId: string) => {
    if (confirm('정말로 대여 신청을 취소하시겠습니까?')) {
      try {
        // API를 통해 대여 신청 상태를 'rejected'로 업데이트하고 notes에 취소 표시
        const response = await fetch('/api/loans', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: loanId,
            status: 'rejected',
            notes: 'STUDENT_CANCELLED' // 학생이 취소했음을 표시
          })
        })

        if (response.ok) {
          // API 성공 시 로컬 상태 업데이트
          setCurrentLoans(prev => prev.filter(l => l.id !== loanId))

          // localStorage에서도 제거
          if (typeof window !== 'undefined') {
            const existingLoans = localStorage.getItem('loanApplications')
            if (existingLoans) {
              const loans = JSON.parse(existingLoans)
              const updatedLoans = loans.filter((l: any) => l.id !== loanId)
              localStorage.setItem('loanApplications', JSON.stringify(updatedLoans))
            }
          }

          alert('대여 신청이 취소되었습니다.')

          // 즉시 데이터 새로고침으로 취소 상태 반영
          loadStudentLoans()
        } else {
          const errorData = await response.json()
          console.error('Cancel loan API error:', errorData)
          alert('신청 취소 중 오류가 발생했습니다. 다시 시도해주세요.')
        }
      } catch (error) {
        console.error('Cancel loan error:', error)
        alert('신청 취소 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* 환영 메시지 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          안녕하세요, {safeStudent.name}님! 👋
        </h1>
        <p className="text-gray-600">
          노트북 관리 시스템에 오신 것을 환영합니다.
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
              {(() => {
                const activeLoan = currentLoans.find(loan => ['requested', 'approved', 'picked_up'].includes(loan.status))
                const status = activeLoan?.status

                if (status === 'picked_up') {
                  return (
                    <>
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">현재 노트북을 사용중입니다</h3>
                      <p className="text-gray-600 mb-4">
                        이미 노트북을 사용중이므로 새로운 신청을 할 수 없습니다.
                      </p>
                      <Badge className="bg-green-100 text-green-800">사용 중</Badge>
                    </>
                  )
                } else {
                  return (
                    <>
                      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">현재 대여 신청중입니다</h3>
                      <p className="text-gray-600 mb-4">
                        이미 대여 신청이 진행중이므로 새로운 신청을 할 수 없습니다.
                      </p>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {status === 'requested' && '승인 대기 중'}
                        {status === 'picked_up' && '사용 중'}
                      </Badge>
                    </>
                  )
                }
              })()}
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
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">
                          {loan.device_tag ?
                            `신청기기: ${loan.device_tag}번 노트북` :
                           loan.class_name && loan.student_no ?
                            `신청기기: ${loan.class_name}-${loan.student_no}번 노트북` :
                           '기기 배정 대기 중'}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          loan.status === 'rejected' && loan.notes === 'STUDENT_CANCELLED'
                            ? 'bg-orange-100 text-orange-800 border border-orange-200'
                            : getStatusColor(loan.status, loan.notes)
                        }`}>
                          {getStatusText(loan.status, loan.notes)}
                        </span>
                      </div>

                      {/* 학년 반 번호 정보를 항상 표시 - 완전 통일된 형식 */}
                      <div className="text-sm font-medium text-blue-800">
                        {(() => {
                          // 모든 경우에 대해 통일된 태그 생성
                          let deviceTag = loan.device_tag

                          // device_tag가 없으면 class_name과 student_no로 생성
                          if (!deviceTag && loan.class_name && loan.student_no) {
                            deviceTag = `${loan.class_name}-${loan.student_no}`
                          }

                          // deviceTag가 있는 경우에만 표시
                          if (deviceTag) {
                            const parts = deviceTag.split('-')
                            if (parts.length === 3) {
                              return (
                                <>
                                  <span className="text-green-700">📱 할당된 기기:</span>{' '}
                                  {`${parts[0]}학년 ${parts[1]}반 ${parts[2]}번 노트북`}
                                </>
                              )
                            }
                          }

                          // 기본 fallback
                          return <span className="text-gray-600">📋 기기 정보 확인 중...</span>
                        })()}
                      </div>

                      {/* 시리얼 번호 정보 */}
                      {(loan.device_tag || (loan.class_name && loan.student_no)) && (
                        <div className="text-xs text-blue-600">
                          {loan.device_tag ? (
                            <>시리얼번호: {(() => {
                              const parts = loan.device_tag.split('-');
                              return `${parts[0]}${parts[1]}${parts[2]}`;
                            })()}</>
                          ) : (
                            <>예상 시리얼번호: {(() => {
                              const parts = loan.class_name.split('-');
                              return `${parts[0]}${parts[1]}${loan.student_no}`;
                            })()}</>
                          )}
                        </div>
                      )}
                    </div>
                    {loan.status === 'requested' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelLoan(loan.id)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        신청 취소
                      </Button>
                    )}
                  </div>

                  {/* 신청한 기기 정보 표시 - 정규화된 필드 사용 */}
                  {loan.device_tag && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="text-sm font-medium text-blue-900">
                        신청한 노트북: <span className="font-bold">
                          {loan.device_tag}번
                        </span>
                      </div>
                      <div className="text-xs text-blue-700 mt-1">
                        {(() => {
                          const parts = loan.device_tag.split('-');
                          return `${parts[0]}학년 ${parts[1]}반 ${parts[2]}번 노트북`;
                        })()}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        시리얼번호: {(() => {
                          const parts = loan.device_tag.split('-');
                          return `${parts[0]}${parts[1]}${parts[2]}`;
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">신청일:</span>
                      <span className="ml-2">{formatDateTime(loan.created_at || loan.requestedAt)}</span>
                    </div>
                    {(loan.approved_at || loan.approvedAt) && (
                      <div>
                        <span className="text-gray-600">승인일:</span>
                        <span className="ml-2">{formatDateTime(loan.approved_at || loan.approvedAt)}</span>
                      </div>
                    )}
                    {(loan.due_date || loan.dueDate) && (
                      <div>
                        <span className="text-gray-600">반납 예정:</span>
                        <span className="ml-2">{formatDateTime(loan.due_date || loan.dueDate)}</span>
                      </div>
                    )}
                    {loan.purpose && (
                      <div>
                        <span className="text-gray-600">사용 목적:</span>
                        <span className="ml-2">{getPurposeText(loan.purpose)}</span>
                      </div>
                    )}
                  </div>


                  {loan.status === 'picked_up' && loan.dueDate && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-800">
                            <strong>사용 중</strong> • 반납 예정일을 지켜주세요.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // 관리자/담임 페이지의 반납처리 탭으로 이동
                            window.location.href = '/loans?tab=active'
                          }}
                          className="bg-white border-green-300 text-green-700 hover:bg-green-50"
                        >
                          반납 신청
                        </Button>
                      </div>
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
          {loanHistoryData.length > 0 ? (
            <div className="space-y-3">
              {(showAllHistory ? loanHistoryData : loanHistoryData.slice(0, 5)).map((loan) => (
                <div key={loan.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{loan.device_tag || '기기 정보 없음'}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        loan.status === 'rejected' && loan.notes === 'STUDENT_CANCELLED'
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : getStatusColor(loan.status, loan.notes)
                      }`}>
                        {getStatusText(loan.status, loan.notes)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDateTime(loan.created_at || loan.requestedAt)}
                      {(loan.returned_at || loan.returnedAt) && ` ~ ${formatDateTime(loan.returned_at || loan.returnedAt)}`}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {getPurposeText(loan.purpose)}
                  </div>
                </div>
              ))}
              {loanHistoryData.length > 5 && (
                <div className="text-center pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllHistory(!showAllHistory)}
                  >
                    {showAllHistory ?
                      '접기' :
                      `더 보기 (${loanHistoryData.length - 5}개 더)`
                    }
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
        studentInfo={safeStudent}
      />
    </div>
  )
}