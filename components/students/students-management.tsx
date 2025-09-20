'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CSVUpload } from '@/components/forms/csv-upload'
import { formatDate, maskPhone, getRoleText, isLoanOverdue, formatDateTime, getStatusText, getStatusColor } from '@/lib/utils'

interface StudentsManagementProps {
  students: any[]
  stats: any
}

export function StudentsManagement({ students: initialStudents, stats: initialStats }: StudentsManagementProps) {
  const [students, setStudents] = useState(initialStudents)
  const [stats, setStats] = useState(initialStats)
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [showActivityLog, setShowActivityLog] = useState(false)

  // Wrapper에서 데이터를 props로 받으므로 useEffect 제거

  const handleRoleChange = async (studentEmail: string, newRole: string) => {
    try {
      // API 호출로 서버에 역할 변경 저장
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: students.find(s => s.id === studentEmail)?.email || studentEmail,
          role: newRole
        }),
      })

      if (!response.ok) {
        throw new Error('역할 변경 실패')
      }

      // 로컬 상태 업데이트
      setStudents(prevStudents =>
        prevStudents.map(student =>
          student.id === studentEmail
            ? { ...student, role: newRole }
            : student
        )
      )

      console.log(`학생 ${studentEmail}의 역할을 ${newRole}로 변경`)
      alert(`역할이 ${getRoleText(newRole)}(으)로 변경되었습니다.`)
    } catch (error) {
      console.error('역할 변경 실패:', error)
      alert('역할 변경 중 오류가 발생했습니다.')
    }
  }

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
        overdue: updatedStudents.filter(s => s.overdueCount > 0).length,
        inactive: updatedStudents.filter(s => s.loanHistory === 0).length,
        active: updatedStudents.filter(s => s.loanHistory > 0).length
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 학생</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">총 등록된 학생</p>
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
            <div className="text-2xl font-bold text-blue-600">{stats.withLoan}</div>
            <p className="text-xs text-muted-foreground">현재 대여 중</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">연체자</CardTitle>
            <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">연체 중인 학생</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이용 경험</CardTitle>
            <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">대여 이력 있음</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">미이용</CardTitle>
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">대여 이력 없음</p>
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
                  <TableHead>역할</TableHead>
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
                      {student.role ? (
                        <Select
                          value={student.role}
                          onValueChange={(value) => handleRoleChange(student.id, value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue placeholder={getRoleText(student.role)} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">학생</SelectItem>
                            <SelectItem value="helper">노트북 관리 도우미</SelectItem>
                            <SelectItem value="homeroom">담임교사</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                          역할 선택 필요
                        </span>
                      )}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedStudent(student)
                            setShowActivityLog(true)
                          }}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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

      {/* 활동 로그 모달 */}
      <Dialog open={showActivityLog} onOpenChange={setShowActivityLog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStudent?.name}님의 활동 로그
            </DialogTitle>
            <DialogDescription>
              {selectedStudent?.email} • {selectedStudent?.className} {selectedStudent?.studentNo}번
            </DialogDescription>
          </DialogHeader>

          {selectedStudent?.allLoans && selectedStudent.allLoans.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                총 {selectedStudent.allLoans.length}건의 대여 기록
              </div>

              <div className="space-y-3">
                {selectedStudent.allLoans
                  .sort((a: any, b: any) => new Date(b.requestedAt || b.created_at).getTime() - new Date(a.requestedAt || a.created_at).getTime())
                  .map((loan: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{loan.deviceTag || loan.device_tag}</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            loan.status === 'rejected' && loan.notes === 'STUDENT_CANCELLED'
                              ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : getStatusColor(loan.status, loan.notes)
                          }`}>
                            {getStatusText(loan.status, loan.notes)}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(loan.requestedAt || loan.created_at)}
                        </span>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>신청일: {formatDateTime(loan.requestedAt || loan.created_at)}</div>
                        {loan.approved_at && (
                          <div>승인일: {formatDateTime(loan.approved_at)}</div>
                        )}
                        {loan.picked_up_at && (
                          <div>수령일: {formatDateTime(loan.picked_up_at)}</div>
                        )}
                        {loan.returned_at && (
                          <div>반납일: {formatDateTime(loan.returned_at)}</div>
                        )}
                        {loan.dueDate && (
                          <div>반납예정: {formatDateTime(loan.dueDate || loan.due_date)}</div>
                        )}
                        {loan.purpose && (
                          <div>사용목적: {loan.purpose}</div>
                        )}
                        {loan.notes && loan.notes !== 'STUDENT_CANCELLED' && (
                          <div>비고: {loan.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              활동 기록이 없습니다.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}