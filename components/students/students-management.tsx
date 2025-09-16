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
import { formatDate, maskPhone } from '@/lib/utils'

interface StudentsManagementProps {
  students: any[]
  stats: any
}

export function StudentsManagement({ students: initialStudents, stats: initialStats }: StudentsManagementProps) {
  const [students, setStudents] = useState(initialStudents)
  const [stats, setStats] = useState(initialStats)
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleCSVUpload = async (csvData: any[]) => {
    setIsUploading(true)
    try {
      // TODO: 실제 API 호출로 데이터 업로드
      console.log('Uploading student data:', csvData)

      // 임시로 기존 데이터에 추가 (실제로는 서버에서 처리)
      const newStudents = csvData.map((data, index) => ({
        id: String(students.length + index + 1),
        studentNo: data.studentNo,
        name: data.name,
        className: data.className,
        email: data.email,
        phone: data.phone || '',
        parentPhone: data.parentPhone || '',
        currentLoan: null,
        loanHistory: 0,
        overdueCount: 0,
        status: 'active'
      }))

      const updatedStudents = [...students, ...newStudents]
      setStudents(updatedStudents)

      // 통계 업데이트 (간단한 계산)
      const newStats = {
        total: updatedStudents.length,
        withLoan: updatedStudents.filter(s => s.currentLoan).length,
        overdue: updatedStudents.filter(s => s.overdueCount > 0).length
      }
      setStats(newStats)

      setShowCSVUpload(false)

      // TODO: 성공 토스트 메시지 표시
      alert(`${csvData.length}명의 학생이 성공적으로 등록되었습니다.`)
    } catch (error) {
      console.error('Upload failed:', error)
      alert('업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusBadge = (student: any) => {
    if (student.overdueCount > 0) {
      return <Badge variant="destructive">연체 {student.overdueCount}회</Badge>
    }
    if (student.currentLoan) {
      return <Badge className="bg-blue-100 text-blue-800">대여중</Badge>
    }
    return <Badge className="bg-green-100 text-green-800">정상</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">학생 관리</h1>
          <p className="text-muted-foreground">
            학생 정보 및 대여 현황 관리
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
            학생 등록
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 학생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">대여 중</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.withLoan}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">연체자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>학생 목록</CardTitle>
          <CardDescription>
            등록된 모든 학생의 정보와 대여 현황을 확인할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 검색 및 필터 */}
          <div className="flex items-center space-x-4 mb-4">
            <Input
              placeholder="이름, 학번으로 검색..."
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
                <SelectItem value="2-1">2-1</SelectItem>
                <SelectItem value="2-2">2-2</SelectItem>
                <SelectItem value="2-3">2-3</SelectItem>
                <SelectItem value="3-1">3-1</SelectItem>
                <SelectItem value="3-2">3-2</SelectItem>
                <SelectItem value="3-3">3-3</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="normal">정상</SelectItem>
                <SelectItem value="with_loan">대여중</SelectItem>
                <SelectItem value="overdue">연체</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 학생 테이블 */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>학번</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>학급</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>현재 대여</TableHead>
                  <TableHead>대여 이력</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.studentNo}
                    </TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.className}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div>{maskPhone(student.phone) || '-'}</div>
                        <div className="text-muted-foreground">
                          보호자: {maskPhone(student.parentPhone) || '-'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {student.currentLoan ? (
                        <div className="space-y-1">
                          <div className="font-medium">{student.currentLoan}</div>
                          <div className="text-sm text-muted-foreground">
                            {student.dueDate && formatDate(student.dueDate)}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {student.loanHistory}회
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(student)}
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {students.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              등록된 학생이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSV 업로드 모달 */}
      <Dialog open={showCSVUpload} onOpenChange={setShowCSVUpload}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>학생 CSV 업로드</DialogTitle>
            <DialogDescription>
              CSV 파일을 통해 학생 정보를 일괄 등록할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <CSVUpload
            type="students"
            onUpload={handleCSVUpload}
            isUploading={isUploading}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}