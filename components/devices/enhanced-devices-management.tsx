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

interface EnhancedDevicesManagementProps {
  devices: any[]
  stats: any
}

export function EnhancedDevicesManagement({ devices: initialDevices, stats: initialStats }: EnhancedDevicesManagementProps) {
  const [devices, setDevices] = useState(initialDevices)
  const [stats, setStats] = useState(initialStats)
  const [loanData, setLoanData] = useState<any[]>([])
  const [overdueData, setOverdueData] = useState<any[]>([])
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showLoanHistory, setShowLoanHistory] = useState(false)
  const [selectedDeviceLoanHistory, setSelectedDeviceLoanHistory] = useState<any[]>([])
  const [selectedDeviceAsset, setSelectedDeviceAsset] = useState('')
  const [showDetailedLogs, setShowDetailedLogs] = useState(false)
  const [selectedDeviceLogs, setSelectedDeviceLogs] = useState<any[]>([])
  const [selectedDeviceInfo, setSelectedDeviceInfo] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('devices')

  // 대여 현황 및 연체 데이터 로드
  useEffect(() => {
    const loadLoanData = async () => {
      try {
        const response = await fetch('/api/loans', { cache: 'no-store' })
        if (response.ok) {
          const { loans } = await response.json()

          // 현재 대여 중인 기기들
          const currentLoans = loans.filter((loan: any) => loan.status === 'picked_up')
          setLoanData(currentLoans)

          // 연체된 대여들
          const overdueLoans = currentLoans.filter((loan: any) => {
            if (!loan.due_date && !loan.dueDate) return false
            const dueDate = new Date(loan.due_date || loan.dueDate)
            return new Date() > dueDate
          })
          setOverdueData(overdueLoans)
        }
      } catch (error) {
        console.error('Failed to load loan data:', error)
      }
    }

    loadLoanData()
  }, [])

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
      console.log('Uploading device data:', csvData)

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

      const newStats = {
        total: updatedDevices.length,
        available: updatedDevices.filter(d => d.status === 'available').length,
        loaned: updatedDevices.filter(d => d.status === 'loaned').length,
        maintenance: updatedDevices.filter(d => d.status === 'maintenance').length,
      }
      setStats(newStats)

      setShowCSVUpload(false)
      alert(`${csvData.length}개의 기기가 성공적으로 등록되었습니다.`)
    } catch (error) {
      console.error('Upload failed:', error)
      alert('업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  const filteredDevices = devices.filter((device) => {
    const matchesSearch = !searchTerm ||
      device.assetNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.assignedClass?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.currentUser?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || device.status === statusFilter
    const deviceGrade = device.assignedClass?.split('-')[0]
    const matchesGrade = gradeFilter === 'all' || deviceGrade === gradeFilter
    const deviceClass = device.assignedClass?.split('-')[1]?.replace('반', '')
    const matchesClass = classFilter === 'all' || deviceClass === classFilter

    return matchesSearch && matchesStatus && matchesGrade && matchesClass
  })

  const handleStatusChange = async (deviceId: string, newStatus: string) => {
    try {
      const device = devices.find(d => d.id === deviceId)
      const assetNumber = device?.assetNumber || deviceId

      const requestBody = {
        deviceTag: assetNumber,
        status: newStatus,
        currentUser: newStatus === 'loaned' ? '관리자 설정' : null,
        notes: `상태 변경: ${getDeviceStatusText(newStatus)}`
      }

      const response = await fetch('/api/devices', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        setDevices(prevDevices =>
          prevDevices.map(d =>
            d.id === deviceId
              ? { ...d, status: newStatus, currentUser: requestBody.currentUser }
              : d
          )
        )

        const updatedDevices = devices.map(d =>
          d.id === deviceId ? { ...d, status: newStatus } : d
        )

        const newStats = {
          total: updatedDevices.length,
          available: updatedDevices.filter(d => d.status === 'available').length,
          loaned: updatedDevices.filter(d => d.status === 'loaned').length,
          maintenance: updatedDevices.filter(d => d.status === 'maintenance').length,
        }
        setStats(newStats)

        alert('기기 상태가 성공적으로 변경되었습니다.')
      } else {
        const errorData = await response.json()
        alert(`상태 변경 실패: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Status change error:', error)
      alert('상태 변경 중 오류가 발생했습니다.')
    }
  }

  const handleShowLoanHistory = async (assetNumber: string) => {
    try {
      console.log('🔍 CLIENT - Fetching history for:', assetNumber)
      const response = await fetch(`/api/loans/device/${assetNumber}`)

      console.log('🔍 CLIENT - Response status:', response.status)

      if (response.ok) {
        const responseData = await response.json()
        console.log('🔍 CLIENT - API Response:', responseData)
        console.log('🔍 CLIENT - DEBUG INFO:')
        console.log('  Sample device_tags in DB:', responseData.debug?.sampleTags)
        console.log('  All sample loans (including null device_tag):', responseData.debug?.allSampleLoans)
        console.log('  Total loans in DB:', responseData.debug?.totalLoansInDB)
        console.log('  Loans with device_tag:', responseData.debug?.loansWithDeviceTag)
        console.log('  Queried patterns:', responseData.debug?.queriedPatterns)

        const { history: deviceLoans } = responseData
        console.log('🔍 CLIENT - Device loans:', deviceLoans)
        console.log('🔍 CLIENT - Device loans length:', deviceLoans?.length)

        const sortedLoans = (deviceLoans || []).sort((a: any, b: any) =>
          new Date(b.timestamp || b.created_at || b.requestedAt).getTime() - new Date(a.timestamp || a.created_at || a.requestedAt).getTime()
        )

        console.log('🔍 CLIENT - Sorted loans:', sortedLoans)

        setSelectedDeviceAsset(assetNumber)
        setSelectedDeviceLoanHistory(sortedLoans)
        setShowLoanHistory(true)
      } else {
        const errorText = await response.text()
        console.error('🔍 CLIENT - API Error:', response.status, errorText)
        alert('대여 기록을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('Loan history error:', error)
      alert('대여 기록을 불러오는 중 오류가 발생했습니다.')
    }
  }

  // 상세 로그 조회 함수
  const handleShowDetailedLogs = async (deviceId: string) => {
    try {
      console.log('🔍 Fetching detailed logs for device:', deviceId)
      const response = await fetch(`/api/devices/${deviceId}/logs`)

      if (response.ok) {
        const responseData = await response.json()
        console.log('🔍 Detailed logs response:', responseData)

        setSelectedDeviceInfo(responseData.device)
        setSelectedDeviceLogs(responseData.logs || [])
        setShowDetailedLogs(true)
      } else {
        const errorText = await response.text()
        console.error('🔍 Detailed logs API error:', response.status, errorText)
        alert('상세 로그를 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('Detailed logs error:', error)
      alert('상세 로그를 불러오는 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">기기 관리</h1>
          <p className="text-muted-foreground">
            기기 현황, 대여 상태, 연체 관리를 통합하여 관리합니다.
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 기기</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">관리 대상 기기</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">대여 중</CardTitle>
            <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{loanData.length}</div>
            <p className="text-xs text-muted-foreground">현재 대여 중인 기기</p>
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
            <div className="text-2xl font-bold text-red-600">{overdueData.length}</div>
            <p className="text-xs text-muted-foreground">연체된 대여</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">대여 가능</CardTitle>
            <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
            <p className="text-xs text-muted-foreground">대여 가능한 기기</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="devices">
            기기 목록 ({devices.length})
          </TabsTrigger>
          <TabsTrigger value="loans">
            대여 현황 ({loanData.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            연체 관리
            {overdueData.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {overdueData.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
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
                  <SelectTrigger className="w-24">
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
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="학급" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {[...Array(13)].map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1}반
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
                      <TableHead>모델명</TableHead>
                      <TableHead>시리얼번호</TableHead>
                      <TableHead>배정 학급</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>현재 사용자</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDevices.length > 0 ? (
                      filteredDevices.map((device) => (
                        <TableRow key={device.id}>
                          <TableCell className="font-medium">{device.assetNumber || device.deviceTag}</TableCell>
                          <TableCell>{device.model || device.deviceModel || '-'}</TableCell>
                          <TableCell>{device.serialNumber || device.serial || '-'}</TableCell>
                          <TableCell>{device.assignedClass || '-'}</TableCell>
                          <TableCell>
                            <Badge className={getDeviceStatusColor(device.status)}>
                              {getDeviceStatusText(device.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{device.currentUser || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Select onValueChange={(value) => handleStatusChange(device.id, value)}>
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="상태 변경" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="available">대여 가능</SelectItem>
                                  <SelectItem value="loaned">대여 중</SelectItem>
                                  <SelectItem value="maintenance">점검 중</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleShowLoanHistory(device.assetNumber || device.deviceTag)}
                              >
                                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                이력
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleShowDetailedLogs(device.assetNumber || device.deviceTag)}
                              >
                                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                상세 로그
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          기기가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>현재 대여 현황</CardTitle>
              <CardDescription>
                현재 대여 중인 모든 기기의 상태를 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>기기</TableHead>
                      <TableHead>학생</TableHead>
                      <TableHead>학급</TableHead>
                      <TableHead>대여일</TableHead>
                      <TableHead>반납 예정일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loanData.length > 0 ? (
                      loanData.map((loan) => {
                        const isOverdue = loan.due_date || loan.dueDate ?
                          new Date() > new Date(loan.due_date || loan.dueDate) : false

                        return (
                          <TableRow key={loan.id}>
                            <TableCell className="font-medium">
                              {loan.device_tag || loan.deviceTag}
                            </TableCell>
                            <TableCell>{loan.student_name || loan.studentName}</TableCell>
                            <TableCell>{loan.class_name || loan.className}</TableCell>
                            <TableCell>
                              {loan.created_at ?
                                new Date(loan.created_at).toLocaleString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: false
                                }) :
                                loan.requestedAt ? new Date(loan.requestedAt).toLocaleString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: false
                                }) : '-'
                              }
                            </TableCell>
                            <TableCell>
                              {(loan.due_date || loan.dueDate) ?
                                new Date(loan.due_date || loan.dueDate).toLocaleString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: false
                                }) : '-'
                              }
                            </TableCell>
                            <TableCell>
                              {isOverdue ? (
                                <Badge variant="destructive">연체</Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-800">대여중</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm">
                                반납 처리
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          현재 대여 중인 기기가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>연체 관리</CardTitle>
              <CardDescription>
                반납 기한이 지난 대여 기기들을 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>기기</TableHead>
                      <TableHead>학생</TableHead>
                      <TableHead>학급</TableHead>
                      <TableHead>대여일</TableHead>
                      <TableHead>반납 예정일</TableHead>
                      <TableHead>연체일</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueData.length > 0 ? (
                      overdueData.map((loan) => {
                        const dueDate = new Date(loan.due_date || loan.dueDate)
                        const today = new Date()
                        const overdueDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

                        return (
                          <TableRow key={loan.id}>
                            <TableCell className="font-medium">
                              {loan.device_tag || loan.deviceTag}
                            </TableCell>
                            <TableCell>{loan.student_name || loan.studentName}</TableCell>
                            <TableCell>{loan.class_name || loan.className}</TableCell>
                            <TableCell>
                              {loan.created_at ?
                                new Date(loan.created_at).toLocaleString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: false
                                }) :
                                loan.requestedAt ? new Date(loan.requestedAt).toLocaleString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: false
                                }) : '-'
                              }
                            </TableCell>
                            <TableCell>
                              {dueDate.toLocaleString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: false
                                })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive">
                                {overdueDays}일 연체
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">
                                  연락
                                </Button>
                                <Button variant="outline" size="sm">
                                  강제 반납
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          연체된 대여가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CSV 업로드 다이얼로그 */}
      <Dialog open={showCSVUpload} onOpenChange={setShowCSVUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>기기 정보 CSV 업로드</DialogTitle>
            <DialogDescription>
              CSV 파일을 선택하여 기기 정보를 일괄 등록할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <CSVUpload
            onUpload={handleCSVUpload}
            isUploading={isUploading}
            expectedHeaders={['assetTag', 'model', 'serial', 'assignedClass']}
            templateData={[
              { assetTag: 'NB-001', model: 'MacBook Air', serial: 'ABC123', assignedClass: '1-1' },
              { assetTag: 'NB-002', model: 'MacBook Air', serial: 'ABC124', assignedClass: '1-2' }
            ]}
          />
        </DialogContent>
      </Dialog>

      {/* 대여 이력 다이얼로그 */}
      <Dialog open={showLoanHistory} onOpenChange={setShowLoanHistory}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>기기 대여 이력</DialogTitle>
            <DialogDescription>
              {selectedDeviceAsset} 기기의 대여 이력입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>학생</TableHead>
                  <TableHead>학급</TableHead>
                  <TableHead>대여일</TableHead>
                  <TableHead>반납일</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDeviceLoanHistory.map((loan, index) => (
                  <TableRow key={index}>
                    <TableCell>{loan.student_name || loan.studentName}</TableCell>
                    <TableCell>{loan.class_name || loan.className}</TableCell>
                    <TableCell>
                      {loan.created_at ?
                        new Date(loan.created_at).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        }) :
                        loan.requestedAt ? new Date(loan.requestedAt).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        }) : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {loan.returned_at ?
                        new Date(loan.returned_at).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        }) :
                        loan.returnedAt ? new Date(loan.returnedAt).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        }) : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          loan.status === '반납완료' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                          loan.status === '대여중' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                          loan.status === '대여신청중' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                          loan.status === '취소됨' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                          loan.status === '거절됨' ? 'bg-red-100 text-red-700 border-red-300' :
                          'bg-gray-100 text-gray-700 border-gray-300'
                        }
                      >
                        {loan.status || '대여중'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* 상세 로그 다이얼로그 */}
      <Dialog open={showDetailedLogs} onOpenChange={setShowDetailedLogs}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>기기 상세 로그</DialogTitle>
            <DialogDescription>
              {selectedDeviceInfo?.asset_tag} 기기의 모든 활동 로그입니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 기기 정보 요약 */}
            {selectedDeviceInfo && (
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-500">자산태그</p>
                      <p className="font-mono">{selectedDeviceInfo.asset_tag}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">모델</p>
                      <p>{selectedDeviceInfo.model}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">시리얼번호</p>
                      <p className="font-mono">{selectedDeviceInfo.serial_number}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">현재 상태</p>
                      <Badge variant="outline">
                        {selectedDeviceInfo.status === '충전함' ? '대여가능' :
                         selectedDeviceInfo.status === '대여중' ? '대여중' :
                         selectedDeviceInfo.status === '점검' ? '점검중' :
                         selectedDeviceInfo.status === '분실' ? '분실' :
                         selectedDeviceInfo.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 로그 목록 */}
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">시간</TableHead>
                    <TableHead className="w-[100px]">종류</TableHead>
                    <TableHead className="w-[120px]">작업</TableHead>
                    <TableHead className="w-[120px]">작업자</TableHead>
                    <TableHead>세부사항</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDeviceLogs.length > 0 ? selectedDeviceLogs.map((log, index) => (
                    <TableRow key={log.id || index}>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.timestamp).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={log.type === 'audit' ?
                            'bg-purple-100 text-purple-700 border-purple-300' :
                            'bg-blue-100 text-blue-700 border-blue-300'
                          }
                        >
                          {log.type === 'audit' ? '시스템' : '대여'}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell className="truncate" title={log.actor}>
                        {log.actor}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        로그가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}