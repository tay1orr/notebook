'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CSVUpload } from '@/components/forms/csv-upload'

interface DevicesManagementProps {
  devices: any[]
  stats: any
}

export function DevicesManagement({ devices: initialDevices, stats: initialStats }: DevicesManagementProps) {
  const [devices, setDevices] = useState(initialDevices)
  const [stats, setStats] = useState(initialStats)
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showLoanHistory, setShowLoanHistory] = useState(false)
  const [selectedDeviceLoanHistory, setSelectedDeviceLoanHistory] = useState<any[]>([])
  const [selectedDeviceAsset, setSelectedDeviceAsset] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')

  const getDeviceStatusText = (status: string) => {
    const statusMap = {
      'available': '대여 가능',
      'loaned': '대여 중',
      'maintenance': '점검 중'
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  const getDeviceStatusColor = (status: string) => {
    const colorMap = {
      'available': 'bg-green-100 text-green-800',
      'loaned': 'bg-blue-100 text-blue-800',
      'maintenance': 'bg-yellow-100 text-yellow-800'
    }
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800'
  }

  const handleCSVUpload = async (csvData: any[]) => {
    setIsUploading(true)
    try {
      // TODO: 실제 API 호출로 데이터 업로드
      console.log('Uploading device data:', csvData)

      // 임시로 기존 데이터에 추가 (실제로는 서버에서 처리)
      const newDevices = csvData.map((data, index) => ({
        id: String(devices.length + index + 1),
        assetTag: data.assetTag,
        model: data.model,
        serial: data.serial,
        status: data.status || 'available',
        assignedClass: data.assignedClass || null,
        currentUser: null,
        notes: data.notes || '',
        lastMaintenance: new Date().toISOString().split('T')[0]
      }))

      const updatedDevices = [...devices, ...newDevices]
      setDevices(updatedDevices)

      // 통계 업데이트
      const newStats = {
        total: updatedDevices.length,
        available: updatedDevices.filter(d => d.status === 'available').length,
        loaned: updatedDevices.filter(d => d.status === 'loaned').length,
        maintenance: updatedDevices.filter(d => d.status === 'maintenance').length,
        // retired 제거
      }
      setStats(newStats)

      setShowCSVUpload(false)

      // TODO: 성공 토스트 메시지 표시
      alert(`${csvData.length}개의 기기가 성공적으로 등록되었습니다.`)
    } catch (error) {
      console.error('Upload failed:', error)
      alert('업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  // 필터링된 기기 목록
  const filteredDevices = devices.filter((device) => {
    // 검색어 필터링
    const matchesSearch = !searchTerm ||
      device.assetNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.assignedClass?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.currentUser?.toLowerCase().includes(searchTerm.toLowerCase())

    // 상태 필터링
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter

    // 학년 필터링
    const deviceGrade = device.assignedClass?.split('-')[0]
    const matchesGrade = gradeFilter === 'all' || deviceGrade === gradeFilter

    // 반 필터링 (예: "1반" -> "1")
    const deviceClass = device.assignedClass?.split('-')[1]?.replace('반', '')
    const matchesClass = classFilter === 'all' || deviceClass === classFilter

    return matchesSearch && matchesStatus && matchesGrade && matchesClass
  })

  // 기기 상태 변경 함수
  const handleStatusChange = async (deviceId: string, newStatus: string) => {
    console.log('handleStatusChange called:', { deviceId, newStatus })

    try {
      // deviceId가 실제로는 assetNumber일 수 있으므로 확인
      const device = devices.find(d => d.id === deviceId)
      const assetNumber = device?.assetNumber || deviceId

      const requestBody = {
        deviceTag: assetNumber,
        status: newStatus,
        currentUser: newStatus === 'loaned' ? '관리자 설정' : null,
        notes: `상태 변경: ${getDeviceStatusText(newStatus)}`
      }

      console.log('Request body:', requestBody)

      const response = await fetch('/api/devices', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      console.log('Response status:', response.status)

      const responseData = await response.json()
      console.log('Response data:', responseData)

      if (response.ok) {
        // 로컬 상태 업데이트
        setDevices(prev => prev.map(device =>
          device.id === deviceId
            ? { ...device, status: newStatus, updatedAt: new Date().toISOString() }
            : device
        ))

        // 통계 업데이트
        const updatedDevices = devices.map(device =>
          device.id === deviceId ? { ...device, status: newStatus } : device
        )
        const newStats = {
          total: updatedDevices.length,
          available: updatedDevices.filter(d => d.status === 'available').length,
          loaned: updatedDevices.filter(d => d.status === 'loaned').length,
          maintenance: updatedDevices.filter(d => d.status === 'maintenance').length,
          // retired 제거
        }
        setStats(newStats)

        alert('기기 상태가 변경되었습니다.')
      } else {
        console.error('API error response:', responseData)
        alert(`상태 변경에 실패했습니다.\n오류: ${responseData.error || '알 수 없는 오류'}\n세부사항: ${responseData.details || '없음'}`)
      }
    } catch (error) {
      console.error('Status change error:', error)
      alert(`상태 변경 중 오류가 발생했습니다.\n오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  // 기기 대여 기록 보기 함수
  const handleViewLoanHistory = async (assetNumber: string) => {
    try {
      const response = await fetch(`/api/loans?deviceTag=${assetNumber}`)
      if (response.ok) {
        const { loans } = await response.json()
        const deviceLoans = loans.filter((loan: any) => {
          // device_tag 매칭 확인
          if (loan.device_tag) {
            const parts = loan.device_tag.split('-')
            if (parts.length === 3) {
              const serialNumber = `${parts[0]}${parts[1]}${parts[2]}`
              const assetTag = `ICH-${serialNumber}`
              return assetTag === assetNumber
            }
          }
          return loan.device_tag === assetNumber
        })

        // 대여 기록을 시간순으로 정렬
        const sortedLoans = deviceLoans.sort((a: any, b: any) =>
          new Date(b.created_at || b.requestedAt).getTime() - new Date(a.created_at || a.requestedAt).getTime()
        )

        setSelectedDeviceAsset(assetNumber)
        setSelectedDeviceLoanHistory(sortedLoans)
        setShowLoanHistory(true)
      } else {
        alert('대여 기록을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('Loan history error:', error)
      alert('대여 기록을 불러오는 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">기기 관리</h1>
          <p className="text-muted-foreground">
            노트북 및 태블릿 기기 현황 관리
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setShowCSVUpload(true)}>
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            CSV 업로드
          </Button>
          <Button>
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            기기 등록
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 기기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">대여 가능</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">대여 중</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.loaned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">점검 중</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.maintenance}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>기기 목록</CardTitle>
          <CardDescription>
            등록된 모든 기기의 상태를 확인하고 관리할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 검색 및 필터 */}
          <div className="flex items-center space-x-4 mb-4 flex-wrap gap-2">
            <Input
              placeholder="자산번호, 모델명, 시리얼번호로 검색..."
              className="max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="available">대여 가능</SelectItem>
                <SelectItem value="loaned">대여 중</SelectItem>
                <SelectItem value="maintenance">점검 중</SelectItem>
              </SelectContent>
            </Select>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="학년" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="1">1학년</SelectItem>
                <SelectItem value="2">2학년</SelectItem>
                <SelectItem value="3">3학년</SelectItem>
              </SelectContent>
            </Select>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="반" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {Array.from({length: 13}, (_, i) => i + 1).map(classNum => (
                  <SelectItem key={classNum} value={classNum.toString()}>
                    {classNum}반
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 기기 테이블 */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>자산번호</TableHead>
                  <TableHead>모델</TableHead>
                  <TableHead>시리얼번호</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>배정 학급</TableHead>
                  <TableHead>현재 사용자</TableHead>
                  <TableHead>비고</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">
                      {device.assetNumber}
                    </TableCell>
                    <TableCell>{device.model}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {device.serialNumber}
                    </TableCell>
                    <TableCell>
                      <Badge className={getDeviceStatusColor(device.status)}>
                        {getDeviceStatusText(device.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {device.assignedClass || '-'}
                    </TableCell>
                    <TableCell>
                      {device.currentUser || '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {device.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {/* 상태 변경 선택 */}
                        <Select onValueChange={(value) => handleStatusChange(device.id, value)} value={device.status}>
                          <SelectTrigger className="w-24 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">대여가능</SelectItem>
                            <SelectItem value="loaned">대여중</SelectItem>
                            <SelectItem value="maintenance">점검중</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* 대여 기록 보기 버튼 */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="대여 기록 보기"
                          onClick={() => handleViewLoanHistory(device.assetNumber)}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Button>

                        {/* 기기 정보 버튼 */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="기기 정보"
                          onClick={() => alert(`기기 정보\n자산번호: ${device.assetNumber}\n모델: ${device.model}\n시리얼: ${device.serialNumber}\n배정학급: ${device.assignedClass}\n상태: ${getDeviceStatusText(device.status)}\n현재 사용자: ${device.currentUser || '없음'}`)}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredDevices.length === 0 && devices.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              검색 조건에 맞는 기기가 없습니다.
            </div>
          )}

          {devices.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              등록된 기기가 없습니다.
            </div>
          )}

          {/* 필터링 결과 요약 */}
          {searchTerm && (
            <div className="mt-4 text-sm text-muted-foreground">
              &ldquo;{searchTerm}&rdquo; 검색 결과: {filteredDevices.length}개 기기
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSV 업로드 모달 */}
      <Dialog open={showCSVUpload} onOpenChange={setShowCSVUpload}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>기기 CSV 업로드</DialogTitle>
            <DialogDescription>
              CSV 파일을 통해 기기 정보를 일괄 등록할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <CSVUpload
            type="devices"
            onUpload={handleCSVUpload}
            isUploading={isUploading}
          />
        </DialogContent>
      </Dialog>

      {/* 대여 기록 모달 */}
      <Dialog open={showLoanHistory} onOpenChange={setShowLoanHistory}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDeviceAsset} 대여 기록
            </DialogTitle>
            <DialogDescription>
              이 기기의 모든 대여 기록을 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {selectedDeviceLoanHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">대여 기록 없음</h3>
                <p className="mt-1 text-sm text-gray-500">이 기기의 대여 기록이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDeviceLoanHistory.map((loan, index) => {
                  const date = new Date(loan.created_at || loan.requestedAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })
                  const time = new Date(loan.created_at || loan.requestedAt).toLocaleTimeString('ko-KR')
                  const status = loan.status === 'picked_up' ? '대여중' :
                               loan.status === 'returned' ? '반납완료' :
                               loan.status === 'requested' ? '신청중' :
                               loan.status === 'approved' ? '승인됨' : loan.status

                  const statusColor = loan.status === 'picked_up' ? 'bg-blue-100 text-blue-800' :
                                     loan.status === 'returned' ? 'bg-gray-100 text-gray-800' :
                                     loan.status === 'requested' ? 'bg-yellow-100 text-yellow-800' :
                                     loan.status === 'approved' ? 'bg-green-100 text-green-800' :
                                     'bg-gray-100 text-gray-800'

                  return (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-lg">
                              {loan.student_name || loan.studentName}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({loan.class_name || loan.className})
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                              {status}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            <p>신청일: {date} {time}</p>
                            {loan.purpose && (
                              <p>사용 목적: {loan.purpose}</p>
                            )}
                            {(loan.due_date || loan.dueDate) && (
                              <p>반납 예정: {new Date(loan.due_date || loan.dueDate).toLocaleDateString('ko-KR')}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}