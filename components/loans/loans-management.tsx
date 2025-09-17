'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getStatusColor, getStatusText, formatDateTime, getPurposeText, getCurrentKoreaTime, getLoanStatus, getOverdueDays, isLoanOverdue } from '@/lib/utils'
import { ApprovalSignatureModal } from '@/components/forms/approval-signature-modal'
import { ReturnConfirmationModal } from '@/components/forms/return-confirmation-modal'

interface LoansManagementProps {
  pendingLoans: any[]
  activeLoans: any[]
  overdueLoans: any[]
  userRole: string
  userName: string
}

export function LoansManagement({ pendingLoans: initialPendingLoans, activeLoans: initialActiveLoans, overdueLoans: initialOverdueLoans, userRole, userName }: LoansManagementProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [modalType, setModalType] = useState<'approval' | 'return' | null>(null)
  const [pendingLoans, setPendingLoans] = useState<any[]>(initialPendingLoans)
  const [activeLoans, setActiveLoans] = useState<any[]>(initialActiveLoans)
  const [overdueLoans, setOverdueLoans] = useState<any[]>(initialOverdueLoans)
  const [allLoans, setAllLoans] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<string>('pending')

  // 탭 변경 핸들러 - URL 업데이트
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/loans?${params.toString()}`)
  }

  // URL 파라미터에서 tab 확인하고 초기 탭 설정
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'active') {
      setActiveTab('active')
    } else if (tab === 'overdue') {
      setActiveTab('overdue')
    } else if (tab === 'history') {
      setActiveTab('history')
    } else {
      setActiveTab('pending')
    }
  }, [searchParams])

  // API에서 대여 신청 데이터 로드
  useEffect(() => {
    const loadLoanData = async () => {
      let loans: any[] = []

      // API 시도
      try {
        const response = await fetch('/api/loans')
        if (response.ok) {
          const { loans: apiLoans } = await response.json()
          loans = apiLoans
          console.log('LoansManagement - Loaded from API:', loans.length, 'loans')
        } else {
          throw new Error('API failed')
        }
      } catch (error) {
        console.error('LoansManagement - API error, using localStorage:', error)

        // localStorage 폴백
        if (typeof window !== 'undefined') {
          const storedLoans = localStorage.getItem('loanApplications')
          if (storedLoans) {
            try {
              loans = JSON.parse(storedLoans)
              console.log('LoansManagement - Using localStorage fallback:', loans.length, 'loans')
            } catch (parseError) {
              console.error('Failed to parse localStorage data:', parseError)
            }
          }
        }
      }

      // 역할별 필터링 - 도우미/담임교사는 자기 반만, 관리자는 전체
      let filteredLoans = loans
      if (userRole === 'helper' || userRole === 'homeroom') {
        // 도우미/담임교사의 경우 담당 반만 필터링
        const helperClass = userName.includes('1-1') ? '1-1' :
                          userName.includes('1-2') ? '1-2' :
                          userName.includes('1-3') ? '1-3' :
                          userName.includes('2-1') ? '2-1' :
                          userName.includes('2-2') ? '2-2' :
                          userName.includes('2-3') ? '2-3' :
                          userName.includes('3-1') ? '3-1' :
                          userName.includes('3-2') ? '3-2' :
                          userName.includes('3-3') ? '3-3' : '1-1' // 기본값
        filteredLoans = loans.filter((loan: any) => loan.class_name === helperClass || loan.className === helperClass)
      }

      // 상태별로 분류 (실시간 연체 판단 적용)
      const loansWithRealTimeStatus = filteredLoans.map((loan: any) => ({
        ...loan,
        realTimeStatus: getLoanStatus(loan),
        overdueDays: loan.status === 'picked_up' && isLoanOverdue(loan.due_date || loan.dueDate) ? getOverdueDays(loan.due_date || loan.dueDate) : 0
      }))

      const pending = loansWithRealTimeStatus.filter((loan: any) => loan.realTimeStatus === 'requested')
      const active = loansWithRealTimeStatus.filter((loan: any) => loan.realTimeStatus === 'picked_up' && loan.realTimeStatus !== 'overdue')
      const overdue = loansWithRealTimeStatus.filter((loan: any) => loan.realTimeStatus === 'overdue')

      setPendingLoans(pending)
      setActiveLoans(active)
      setOverdueLoans(overdue)
      setAllLoans(filteredLoans) // 모든 기록 저장
    }

    loadLoanData()

    // 500ms마다 체크하여 새로운 신청이 있으면 업데이트
    const interval = setInterval(loadLoanData, 500)

    return () => clearInterval(interval)
  }, [userRole, userName])

  // 관리자용 추가 필터링 (학급별)
  const filterByClass = (loans: any[]) => {
    if (userRole === 'admin' && selectedClass !== 'all') {
      return loans.filter(loan => loan.className === selectedClass)
    }
    return loans
  }

  // 상태별 필터링
  const filterByStatus = (loans: any[]) => {
    if (statusFilter === 'all') {
      return loans
    }
    return loans.filter(loan => loan.status === statusFilter)
  }

  // 화면에 표시할 필터링된 데이터
  const displayPendingLoans = filterByClass(pendingLoans)
  const displayActiveLoans = filterByClass(activeLoans)
  const displayOverdueLoans = filterByClass(overdueLoans)
  const displayAllLoans = filterByStatus(filterByClass(allLoans))

  const handleReturnClick = (loan: any) => {
    setSelectedLoan(loan)
    setModalType('return')
  }

  const handleApprovalSignature = async (data: {
    signature: string
    deviceTag: string
    approverName: string
  }) => {
    if (!selectedLoan) return

    try {
      // API 먼저 시도
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
          approved_by: data.approverName
        })
      })

      if (response.ok) {
        console.log('LoansManagement - Successfully approved via API')
      } else {
        throw new Error('API failed')
      }
    } catch (error) {
      console.error('LoansManagement - API approval failed, using localStorage:', error)

      // localStorage 폴백
      if (typeof window !== 'undefined') {
        const existingLoans = localStorage.getItem('loanApplications')
        if (existingLoans) {
          const loans = JSON.parse(existingLoans)
          const updatedLoans = loans.map((l: any) =>
            l.id === selectedLoan.id
              ? {
                  ...l,
                  status: 'picked_up',
                  deviceTag: data.deviceTag,
                  approverSignature: data.signature,
                  approverName: data.approverName
                }
              : l
          )
          localStorage.setItem('loanApplications', JSON.stringify(updatedLoans))
        }
      }
    }

    // 로컬 상태 업데이트
    setPendingLoans(prev => prev.filter(l => l.id !== selectedLoan.id))
    setActiveLoans(prev => [...prev, {
      ...selectedLoan,
      status: 'picked_up',
      deviceTag: data.deviceTag,
      device_tag: data.deviceTag,
      approverSignature: data.signature,
      approver_signature: data.signature,
      approverName: data.approverName,
      approved_by: data.approverName
    }])

    setSelectedLoan(null)
    setModalType(null)
  }

  const handleReturnSignature = async (data: {
    signature: string
    condition: string
    notes?: string
    receiverName: string
  }) => {
    if (!selectedLoan) return

    try {
      // API 먼저 시도
      const response = await fetch('/api/loans', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedLoan.id,
          status: 'returned',
          returned_at: new Date().toISOString(),
          return_condition: data.condition,
          return_notes: data.notes,
          return_signature: data.signature,
          receiver_name: data.receiverName
        })
      })

      if (response.ok) {
        console.log('LoansManagement - Successfully returned via API')
      } else {
        throw new Error('API failed')
      }
    } catch (error) {
      console.error('LoansManagement - API return failed, using localStorage:', error)

      // localStorage 폴백
      if (typeof window !== 'undefined') {
        const existingLoans = localStorage.getItem('loanApplications')
        if (existingLoans) {
          const loans = JSON.parse(existingLoans)
          const updatedLoans = loans.map((l: any) =>
            l.id === selectedLoan.id
              ? {
                  ...l,
                  status: 'returned',
                  returnedAt: new Date().toISOString(),
                  returnCondition: data.condition,
                  returnNotes: data.notes,
                  returnSignature: data.signature,
                  receiverName: data.receiverName
                }
              : l
          )
          localStorage.setItem('loanApplications', JSON.stringify(updatedLoans))
        }
      }
    }

    // 로컬 상태 업데이트
    setActiveLoans(prev => prev.filter(l => l.id !== selectedLoan.id))
    setOverdueLoans(prev => prev.filter(l => l.id !== selectedLoan.id))

    setSelectedLoan(null)
    setModalType(null)

    // 반납 완료 후 전체 기록 탭으로 이동
    handleTabChange('history')
  }

  const handleApprove = (loan: any) => {
    setSelectedLoan(loan)
    setModalType('approval')
  }

  const handleReject = async (loan: any) => {
    if (confirm('정말로 이 신청을 거절하시겠습니까?')) {
      try {
        // API 먼저 시도
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
          console.log('LoansManagement - Successfully rejected via API')
        } else {
          throw new Error('API failed')
        }
      } catch (error) {
        console.error('LoansManagement - API reject failed, using localStorage:', error)

        // localStorage 폴백
        if (typeof window !== 'undefined') {
          const existingLoans = localStorage.getItem('loanApplications')
          if (existingLoans) {
            const loans = JSON.parse(existingLoans)
            const updatedLoans = loans.map((l: any) =>
              l.id === loan.id
                ? { ...l, status: 'rejected', rejectedAt: new Date().toISOString() }
                : l
            )
            localStorage.setItem('loanApplications', JSON.stringify(updatedLoans))
          }
        }
      }

      // 로컬 상태 업데이트
      setPendingLoans(prev => prev.filter(l => l.id !== loan.id))
    }
  }

  const closeModal = () => {
    setSelectedLoan(null)
    setModalType(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">대여 관리</h1>
          <p className="text-muted-foreground">
            노트북 대여 신청 승인 및 현황 관리
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            승인 대기 ({displayPendingLoans.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            진행중 ({displayActiveLoans.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            연체 ({displayOverdueLoans.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            전체 기록
          </TabsTrigger>
        </TabsList>

        {/* 검색 및 필터 */}
        <div className="flex items-center space-x-4">
          <Input
            placeholder="학생명, 학번, 기기번호로 검색..."
            className="max-w-sm"
          />
          {userRole === 'admin' && (
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="학급" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="1-1">1-1</SelectItem>
                <SelectItem value="1-2">1-2</SelectItem>
                <SelectItem value="1-3">1-3</SelectItem>
              </SelectContent>
            </Select>
          )}
          {(userRole === 'helper' || userRole === 'homeroom') && (
            <div className="text-sm text-muted-foreground px-3 py-2 border rounded">
              담당반만 표시
            </div>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="requested">신청됨</SelectItem>
              <SelectItem value="picked_up">수령됨</SelectItem>
              <SelectItem value="returned">반납됨</SelectItem>
              <SelectItem value="overdue">연체</SelectItem>
              <SelectItem value="rejected">거절됨</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>승인 대기 중인 대여 신청</CardTitle>
              <CardDescription>
                새로운 대여 신청을 검토하고 승인/거절할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayPendingLoans.map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{loan.student_name || loan.studentName}</span>
                            <span className="text-sm text-muted-foreground">
                              {loan.class_name || loan.className} {loan.student_no || loan.studentNo}번
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
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
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        loan.status === 'rejected' && loan.notes === 'STUDENT_CANCELLED'
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : getStatusColor(loan.status, loan.notes)
                      }`}>
                        {getStatusText(loan.status, loan.notes)}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => handleReject(loan)}>
                        거절
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(loan)}>
                        승인
                      </Button>
                    </div>
                  </div>
                ))}
                {displayPendingLoans.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    승인 대기 중인 신청이 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>진행중인 대여</CardTitle>
              <CardDescription>
                현재 사용 중인 대여 현황입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayActiveLoans.map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{loan.student_name || loan.studentName}</span>
                        <span className="text-sm text-muted-foreground">
                          {loan.class_name || loan.className} {loan.student_no || loan.studentNo}번
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        기기: {loan.device_tag || loan.deviceTag} • 반납 예정: {formatDateTime(loan.due_date || loan.dueDate)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        승인: {formatDateTime(loan.approved_at || loan.approvedAt)}
                        {(loan.picked_up_at || loan.pickedUpAt) && ` • 수령: ${formatDateTime(loan.picked_up_at || loan.pickedUpAt)}`}
                        {(loan.approved_by || loan.approverName) && (
                          <span className="ml-2 text-blue-600">
                            • 승인자: {loan.approved_by || loan.approverName}
                          </span>
                        )}
                      </div>
                      {(loan.approver_signature || loan.approverSignature) && (
                        <div className="mt-2 p-2 bg-gray-50 rounded border">
                          <div className="text-xs text-gray-600 mb-1">🖋️ 승인자 서명:</div>
                          <img
                            src={loan.approver_signature || loan.approverSignature}
                            alt="승인자 서명"
                            className="max-h-16 border border-gray-200 rounded bg-white p-1"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        loan.status === 'rejected' && loan.notes === 'STUDENT_CANCELLED'
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : getStatusColor(loan.status, loan.notes)
                      }`}>
                        {getStatusText(loan.status, loan.notes)}
                      </span>
                      {loan.status === 'picked_up' && (
                        <Button size="sm" variant="outline" onClick={() => handleReturnClick(loan)}>
                          반납 처리
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {displayActiveLoans.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    진행중인 대여가 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>연체된 대여</CardTitle>
              <CardDescription>
                반납 기한이 지난 대여 목록입니다. 즉시 확인이 필요합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayOverdueLoans.map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{loan.student_name || loan.studentName}</span>
                        <span className="text-sm text-muted-foreground">
                          {loan.class_name || loan.className} {loan.student_no || loan.studentNo}번
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        기기: {loan.device_tag || loan.deviceTag} • 반납 예정이었던 시간: {formatDateTime(loan.due_date || loan.dueDate)}
                      </div>
                      <div className="text-sm text-red-600 font-medium">
                        {loan.overdueDays || getOverdueDays(loan.due_date || loan.dueDate)}일 연체 중
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(loan.realTimeStatus || loan.status, loan.notes)}`}>
                        {getStatusText(loan.realTimeStatus || loan.status, loan.notes)}
                      </span>
                      <Button size="sm" variant="destructive">
                        긴급 연락
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReturnClick(loan)}>
                        반납 처리
                      </Button>
                    </div>
                  </div>
                ))}
                {displayOverdueLoans.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    연체된 대여가 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>전체 대여 기록</CardTitle>
              <CardDescription>
                모든 대여 기록을 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayAllLoans
                  .sort((a, b) => new Date(b.created_at || b.requestedAt).getTime() - new Date(a.created_at || a.requestedAt).getTime())
                  .map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{loan.student_name || loan.studentName}</span>
                        <span className="text-sm text-muted-foreground">
                          {loan.class_name || loan.className} {loan.student_no || loan.studentNo}번
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        사용 목적: {getPurposeText(loan.purpose)} • 신청: {formatDateTime(loan.created_at || loan.requestedAt)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        기기: {loan.device_tag || loan.deviceTag || '미배정'} • 반납 예정: {formatDateTime(loan.due_date || loan.dueDate)}
                      </div>
                      {(loan.approved_at || loan.approvedAt) && (
                        <div className="text-xs text-muted-foreground mt-1">
                          승인: {formatDateTime(loan.approved_at || loan.approvedAt)}
                          {(loan.picked_up_at || loan.pickedUpAt) && ` • 수령: ${formatDateTime(loan.picked_up_at || loan.pickedUpAt)}`}
                          {(loan.returned_at || loan.returnedAt) && ` • 반납: ${formatDateTime(loan.returned_at || loan.returnedAt)}`}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        loan.status === 'rejected' && loan.notes === 'STUDENT_CANCELLED'
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : getStatusColor(loan.status, loan.notes)
                      }`}>
                        {getStatusText(loan.status, loan.notes)}
                      </span>
                      {loan.status === 'requested' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleReject(loan)}>
                            거절
                          </Button>
                          <Button size="sm" onClick={() => handleApprove(loan)}>
                            승인
                          </Button>
                        </>
                      )}
                      {loan.status === 'picked_up' && (
                        <Button size="sm" variant="outline" onClick={() => handleReturnClick(loan)}>
                          반납 처리
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {displayAllLoans.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {statusFilter === 'all' ? '대여 기록이 없습니다.' : `${getStatusText(statusFilter)} 상태의 기록이 없습니다.`}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 승인 서명 모달 */}
      {modalType === 'approval' && selectedLoan && (
        <ApprovalSignatureModal
          isOpen={true}
          onClose={closeModal}
          onConfirm={handleApprovalSignature}
          loanData={selectedLoan}
          approverName={userName}
        />
      )}

      {/* 반납 확인 모달 */}
      {modalType === 'return' && selectedLoan && (
        <ReturnConfirmationModal
          isOpen={true}
          onClose={closeModal}
          onConfirm={handleReturnSignature}
          loanData={selectedLoan}
          receiverName={userName}
        />
      )}
    </div>
  )
}