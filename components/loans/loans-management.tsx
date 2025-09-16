'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getStatusColor, getStatusText, formatDateTime } from '@/lib/utils'
import { PickupSignatureModal } from '@/components/forms/pickup-signature-modal'
import { ReturnSignatureModal } from '@/components/forms/return-signature-modal'

interface LoansManagementProps {
  pendingLoans: any[]
  activeLoans: any[]
  overdueLoans: any[]
}

export function LoansManagement({ pendingLoans, activeLoans, overdueLoans }: LoansManagementProps) {
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [modalType, setModalType] = useState<'pickup' | 'return' | null>(null)

  const handlePickupClick = (loan: any) => {
    setSelectedLoan(loan)
    setModalType('pickup')
  }

  const handleReturnClick = (loan: any) => {
    setSelectedLoan(loan)
    setModalType('return')
  }

  const handlePickupSignature = async (signatureData: string) => {
    console.log('Pickup signature:', signatureData, selectedLoan)
    // TODO: 실제 API 호출
  }

  const handleReturnSignature = async (data: {
    signatureData: string
    condition: string
    notes?: string
    damages: string[]
  }) => {
    console.log('Return signature:', data, selectedLoan)
    // TODO: 실제 API 호출
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
        <div className="flex items-center space-x-2">
          <Button>
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            새 대여 신청
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            승인 대기 ({pendingLoans.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            진행중 ({activeLoans.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            연체 ({overdueLoans.length})
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
          <Select>
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
          <Select>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="requested">신청됨</SelectItem>
              <SelectItem value="approved">승인됨</SelectItem>
              <SelectItem value="picked_up">수령됨</SelectItem>
              <SelectItem value="overdue">연체</SelectItem>
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
                {pendingLoans.map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{loan.studentName}</span>
                            <span className="text-sm text-muted-foreground">
                              {loan.className} {loan.studentNo}번
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            요청 기기: {loan.requestedDevice} • 신청: {formatDateTime(loan.requestedAt)}
                          </div>
                          {loan.notes && (
                            <div className="text-sm text-blue-600 mt-1">
                              사유: {loan.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(loan.status)}>
                        {getStatusText(loan.status)}
                      </Badge>
                      <Button variant="outline" size="sm">
                        거절
                      </Button>
                      <Button size="sm">
                        승인
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingLoans.length === 0 && (
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
                승인되었거나 수령된 대여 현황입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeLoans.map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{loan.studentName}</span>
                        <span className="text-sm text-muted-foreground">
                          {loan.className} {loan.studentNo}번
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        기기: {loan.deviceTag} • 반납 예정: {formatDateTime(loan.dueDate)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        승인: {formatDateTime(loan.approvedAt)}
                        {loan.pickedUpAt && ` • 수령: ${formatDateTime(loan.pickedUpAt)}`}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(loan.status)}>
                        {getStatusText(loan.status)}
                      </Badge>
                      {loan.status === 'approved' && (
                        <Button size="sm" variant="outline" onClick={() => handlePickupClick(loan)}>
                          수령 처리
                        </Button>
                      )}
                      {loan.status === 'picked_up' && (
                        <Button size="sm" variant="outline" onClick={() => handleReturnClick(loan)}>
                          반납 처리
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {activeLoans.length === 0 && (
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
                {overdueLoans.map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{loan.studentName}</span>
                        <span className="text-sm text-muted-foreground">
                          {loan.className} {loan.studentNo}번
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        기기: {loan.deviceTag} • 반납 예정이었던 시간: {formatDateTime(loan.dueDate)}
                      </div>
                      <div className="text-sm text-red-600 font-medium">
                        {loan.overdueDays}일 연체 중
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(loan.status)}>
                        {getStatusText(loan.status)}
                      </Badge>
                      <Button size="sm" variant="destructive">
                        긴급 연락
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReturnClick(loan)}>
                        반납 처리
                      </Button>
                    </div>
                  </div>
                ))}
                {overdueLoans.length === 0 && (
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
              <div className="text-center py-8 text-muted-foreground">
                전체 기록 조회 기능은 준비 중입니다.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 수령 서명 모달 */}
      {modalType === 'pickup' && selectedLoan && (
        <PickupSignatureModal
          isOpen={true}
          onClose={closeModal}
          onConfirm={handlePickupSignature}
          loanData={selectedLoan}
        />
      )}

      {/* 반납 서명 모달 */}
      {modalType === 'return' && selectedLoan && (
        <ReturnSignatureModal
          isOpen={true}
          onClose={closeModal}
          onConfirm={handleReturnSignature}
          loanData={selectedLoan}
        />
      )}
    </div>
  )
}