'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

  const getDeviceStatusText = (status: string) => {
    const statusMap = {
      'available': '대여 가능',
      'loaned': '대여 중',
      'maintenance': '점검 중',
      'retired': '폐기'
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  const getDeviceStatusColor = (status: string) => {
    const colorMap = {
      'available': 'bg-green-100 text-green-800',
      'loaned': 'bg-blue-100 text-blue-800',
      'maintenance': 'bg-yellow-100 text-yellow-800',
      'retired': 'bg-red-100 text-red-800'
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
        retired: updatedDevices.filter(d => d.status === 'retired').length
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">폐기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.retired}</div>
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
          <div className="flex items-center space-x-4 mb-4">
            <Input
              placeholder="자산번호, 모델명, 시리얼번호로 검색..."
              className="max-w-sm"
            />
            <Select>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="available">대여 가능</SelectItem>
                <SelectItem value="loaned">대여 중</SelectItem>
                <SelectItem value="maintenance">점검 중</SelectItem>
                <SelectItem value="retired">폐기</SelectItem>
              </SelectContent>
            </Select>
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
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">
                      {device.assetTag}
                    </TableCell>
                    <TableCell>{device.model}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {device.serial}
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
                        <Button variant="ghost" size="sm">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button variant="ghost" size="sm">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </Button>
                        <Button variant="ghost" size="sm">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4V2m0 2v2M12 4h.01" />
                          </svg>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {devices.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              등록된 기기가 없습니다.
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
    </div>
  )
}