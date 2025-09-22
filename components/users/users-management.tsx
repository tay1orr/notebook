'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getRoleText, formatDateTime, getStatusText, getStatusColor } from '@/lib/utils'

interface User {
  id: string
  name: string
  email: string
  role: string
  className?: string
  studentNo?: string
  lastLogin?: string
  status: 'active' | 'inactive'
  createdAt: string
  allLoans?: any[]
}

interface UsersManagementProps {
  users: User[]
}

export function UsersManagement({ users: initialUsers }: UsersManagementProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showActivityLog, setShowActivityLog] = useState(false)

  // props가 변경되면 로컬 상태 업데이트
  useEffect(() => {
    setUsers(initialUsers)
  }, [initialUsers])

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? { ...user, role: newRole }
            : user
        )
      )

      // TODO: API 호출로 서버에 역할 변경 저장
      console.log(`사용자 ${userId}의 역할을 ${newRole}로 변경`)
      alert(`역할이 ${getRoleText(newRole)}(으)로 변경되었습니다.`)
    } catch (error) {
      console.error('역할 변경 실패:', error)
      alert('역할 변경 중 오류가 발생했습니다.')
    }
  }

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'inactive') => {
    try {
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? { ...user, status: newStatus }
            : user
        )
      )

      console.log(`사용자 ${userId}의 상태를 ${newStatus}로 변경`)
      alert(`상태가 ${newStatus === 'active' ? '활성' : '비활성'}으로 변경되었습니다.`)
    } catch (error) {
      console.error('상태 변경 실패:', error)
      alert('상태 변경 중 오류가 발생했습니다.')
    }
  }

  // 필터링
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  // 통계 계산
  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    homeroom: users.filter(u => u.role === 'homeroom').length,
    helper: users.filter(u => u.role === 'helper').length,
    student: users.filter(u => u.role === 'student').length,
    noRole: users.filter(u => u.role === '' || !u.role).length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">사용자 관리</h1>
          <p className="text-muted-foreground">
            시스템에 로그인한 사용자 목록 및 권한 관리
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            총 {stats.total}명
          </Badge>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 사용자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">활성: {stats.active}명 • 비활성: {stats.inactive}명</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">관리자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admin}</div>
            <p className="text-xs text-muted-foreground">시스템 관리</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">담임교사</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.homeroom}</div>
            <p className="text-xs text-muted-foreground">담당반 관리</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">도우미</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.helper}</div>
            <p className="text-xs text-muted-foreground">대여 승인 업무</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">학생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.student}</div>
            <p className="text-xs text-muted-foreground">노트북 대여 신청</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">역할 선택 필요</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.noRole}</div>
            <p className="text-xs text-muted-foreground">초기 설정 대기</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>사용자 목록</CardTitle>
          <CardDescription>
            로그인한 모든 사용자의 정보와 권한을 관리할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 검색 및 필터 */}
          <div className="flex items-center space-x-4 mb-4">
            <Input
              placeholder="이름 또는 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="역할 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 역할</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
                <SelectItem value="homeroom">담임교사</SelectItem>
                <SelectItem value="helper">도우미</SelectItem>
                <SelectItem value="student">학생</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 사용자 테이블 */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>담당반</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>최근 로그인</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.email === 'taylorr@gclass.ice.go.kr' ? (
                        <Badge variant="secondary">관리자 (고정)</Badge>
                      ) : user.role === '' ? (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          역할 선택 필요
                        </Badge>
                      ) : (
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">관리자</SelectItem>
                            <SelectItem value="homeroom">담임교사</SelectItem>
                            <SelectItem value="helper">도우미</SelectItem>
                            <SelectItem value="student">학생</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.className || '-'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.status}
                        onValueChange={(value: 'active' | 'inactive') => handleStatusChange(user.id, value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">활성</SelectItem>
                          <SelectItem value="inactive">비활성</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ko-KR') : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user)
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

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              조건에 맞는 사용자가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 활동 로그 모달 */}
      <Dialog open={showActivityLog} onOpenChange={setShowActivityLog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.name}님의 활동 로그
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.email} • {getRoleText(selectedUser?.role || '')}
            </DialogDescription>
          </DialogHeader>

          {selectedUser?.allLoans && selectedUser.allLoans.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                총 {selectedUser.allLoans.length}건의 활동 기록
              </div>

              <div className="space-y-3">
                {selectedUser.allLoans.map((loan: any, index: number) => (
                  <div key={index} className={`border rounded-lg p-4 space-y-2 ${
                    loan.activityType === 'processed' ? 'bg-blue-50 border-blue-200' : ''
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {loan.activityType === 'processed' && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            처리한 업무
                          </span>
                        )}
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
                      {loan.activityType === 'processed' && (
                        <div className="font-medium text-blue-700">
                          신청자: {loan.student_name} ({loan.class_name})
                        </div>
                      )}
                      <div>신청일: {formatDateTime(loan.requestedAt || loan.created_at)}</div>
                      {loan.approved_at && (
                        <div className={loan.activityType === 'processed' ? 'font-medium text-blue-700' : ''}>
                          승인일: {formatDateTime(loan.approved_at)}
                          {loan.approved_by && ` (승인자: ${loan.approved_by})`}
                        </div>
                      )}
                      {loan.picked_up_at && (
                        <div>수령일: {formatDateTime(loan.picked_up_at)}</div>
                      )}
                      {loan.returned_at && (
                        <div className={loan.activityType === 'processed' ? 'font-medium text-blue-700' : ''}>
                          반납일: {formatDateTime(loan.returned_at)}
                        </div>
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