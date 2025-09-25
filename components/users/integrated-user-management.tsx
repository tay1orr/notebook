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

interface UserData {
  id: string
  email: string
  name: string
  role: string
  grade?: string
  class?: string
  studentNo?: string
  createdAt?: string
  lastLogin?: string
  className?: string
  phone?: string
  parentPhone?: string
  currentLoan?: string
  loanHistory?: number
  overdueCount?: number
  status?: string
  pendingApproval?: boolean
  requestedRole?: string
  isTeacher?: boolean
  allLoans?: any[]
}

interface IntegratedUserManagementProps {
  currentUser: {
    email: string
    role: string
    grade?: string
    class?: string
    isApprovedHomeroom?: boolean
  }
}

export function IntegratedUserManagement({ currentUser }: IntegratedUserManagementProps) {
  const [users, setUsers] = useState<UserData[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showUserLogsModal, setShowUserLogsModal] = useState(false)
  const [userLogs, setUserLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('all-users')

  // 모든 사용자 데이터와 승인 대기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // 병렬로 데이터 가져오기
        const [usersResponse, loansResponse, pendingResponse] = await Promise.all([
          fetch('/api/users', { cache: 'no-store' }),
          fetch('/api/loans', { cache: 'no-store' }),
          fetch('/api/admin/pending-approvals', { cache: 'no-store' })
        ])

        let allUsers: UserData[] = []

        if (usersResponse.ok) {
          const { users: fetchedUsers } = await usersResponse.json()
          allUsers = fetchedUsers.map((user: any) => ({
            id: user.id,
            email: user.email,
            name: user.name || user.email?.split('@')[0] || '',
            role: user.role || 'student',
            grade: user.grade,
            class: user.class,
            studentNo: user.studentNo,
            createdAt: user.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '',
            lastLogin: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('ko-KR') : null,
            className: user.grade && user.class ? `${user.grade}-${user.class}` : '',
            phone: '',
            parentPhone: '',
            currentLoan: null,
            loanHistory: 0,
            overdueCount: 0,
            status: 'active',
            allLoans: []
          }))
        }

        // 대여 데이터 연결
        if (loansResponse.ok) {
          const { loans } = await loansResponse.json()

          // 사용자별 대여 정보 집계
          const loansByUser = new Map()
          loans.forEach((loan: any) => {
            const email = loan.email
            if (!loansByUser.has(email)) {
              loansByUser.set(email, {
                history: 0,
                overdue: 0,
                current: null,
                allLoans: []
              })
            }

            const userLoans = loansByUser.get(email)
            userLoans.history++
            userLoans.allLoans.push(loan)

            if (loan.status === 'picked_up') {
              userLoans.current = loan.device_tag || loan.deviceTag

              // 연체 확인
              const isOverdue = loan.due_date || loan.dueDate ?
                new Date() > new Date(loan.due_date || loan.dueDate) : false
              if (isOverdue) {
                userLoans.overdue++
              }
            }
          })

          // 대여 정보를 사용자 데이터에 연결
          allUsers = allUsers.map(user => {
            const userLoans = loansByUser.get(user.email)
            if (userLoans) {
              return {
                ...user,
                currentLoan: userLoans.current,
                loanHistory: userLoans.history,
                overdueCount: userLoans.overdue,
                allLoans: userLoans.allLoans
              }
            }
            return user
          })

          // 대여 기록이 있지만 users 테이블에 없는 사용자들 추가
          loans.forEach((loan: any) => {
            const email = loan.email
            const existingUser = allUsers.find(u => u.email === email)
            if (!existingUser) {
              const userLoans = loansByUser.get(email)
              allUsers.push({
                id: email,
                email: email,
                name: loan.student_name || loan.studentName || email.split('@')[0],
                role: 'student',
                className: loan.class_name || loan.className || '',
                phone: loan.student_contact || loan.studentContact || '',
                parentPhone: '',
                currentLoan: userLoans?.current || null,
                loanHistory: userLoans?.history || 0,
                overdueCount: userLoans?.overdue || 0,
                status: 'active',
                allLoans: userLoans?.allLoans || []
              })
            }
          })
        }

        // 승인 대기 사용자 처리
        if (pendingResponse.ok) {
          const { pendingUsers } = await pendingResponse.json()
          setPendingApprovals(pendingUsers || [])

          // 승인 대기 사용자를 사용자 목록에 추가/업데이트
          pendingUsers?.forEach((pendingUser: any) => {
            const existingUserIndex = allUsers.findIndex(u => u.email === pendingUser.email)
            if (existingUserIndex >= 0) {
              // 기존 사용자에 승인 대기 정보 추가
              allUsers[existingUserIndex] = {
                ...allUsers[existingUserIndex],
                pendingApproval: true,
                requestedRole: pendingUser.requested_role || 'homeroom'
              }
            } else {
              // 새로운 승인 대기 사용자 추가
              const classInfo = pendingUser.class_info || {}
              allUsers.push({
                id: pendingUser.email,
                email: pendingUser.email,
                name: pendingUser.name,
                role: 'student',
                className: classInfo.grade && classInfo.class ? `${classInfo.grade}-${classInfo.class}` : '',
                phone: '',
                parentPhone: '',
                currentLoan: null,
                loanHistory: 0,
                overdueCount: 0,
                status: 'active',
                allLoans: [],
                pendingApproval: true,
                requestedRole: pendingUser.requested_role || 'homeroom'
              })
            }
          })
        }

        // 담임교사인 경우 자신의 반 학생만 필터링
        if (currentUser.role === 'homeroom' && currentUser.isApprovedHomeroom && currentUser.grade && currentUser.class) {
          const userGrade = parseInt(currentUser.grade)
          const userClass = parseInt(currentUser.class)

          allUsers = allUsers.filter(user => {
            // 관리자, 관리팀, 다른 담임교사는 표시하지 않음
            if (user.role === 'admin' || user.role === 'manager' || (user.role === 'homeroom' && user.email !== currentUser.email)) {
              return false
            }

            // 자신은 포함
            if (user.email === currentUser.email) {
              return true
            }

            // 학생의 학급 정보 확인
            if (user.className) {
              const match = user.className.match(/(\d+)-(\d+)/)
              if (match) {
                const studentGrade = parseInt(match[1])
                const studentClass = parseInt(match[2])
                return studentGrade === userGrade && studentClass === userClass
              }
            }

            return false
          })
        }

        setUsers(allUsers)
      } catch (error) {
        console.error('Failed to load user data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [currentUser])

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (!response.ok) {
        throw new Error('Failed to update user role')
      }

      // 로컬 상태 업데이트
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      ))

      setShowRoleModal(false)
      setSelectedUser(null)
      alert('역할이 성공적으로 변경되었습니다.')
    } catch (error) {
      console.error('Failed to update user role:', error)
      alert('역할 변경에 실패했습니다.')
    }
  }

  const loadUserLogs = async (userId: string) => {
    setLogsLoading(true)
    try {
      console.log('🔍 Loading user logs for userId:', userId)
      const response = await fetch(`/api/user-logs?userId=${userId}`)
      console.log('🔍 User logs response status:', response.status)
      if (response.ok) {
        const logs = await response.json()
        console.log('🔍 User logs loaded:', logs)
        console.log('🔍 User logs structure check:', {
          hasLogs: logs.logs ? 'YES' : 'NO',
          logsLength: logs.logs ? logs.logs.length : 0,
          directLogsLength: Array.isArray(logs) ? logs.length : 0,
          logsSample: logs.logs ? logs.logs.slice(0, 2) : 'No logs.logs property'
        })

        // API 응답이 { logs: [...] } 형태인지 확인하고 적절히 처리
        if (logs.logs && Array.isArray(logs.logs)) {
          setUserLogs(logs.logs)
        } else if (Array.isArray(logs)) {
          setUserLogs(logs)
        } else {
          console.error('🔍 Unexpected logs format:', logs)
          setUserLogs([])
        }
      } else {
        const errorText = await response.text()
        console.error('Failed to load user logs:', response.status, errorText)
        setUserLogs([])
      }
    } catch (error) {
      console.error('Error loading user logs:', error)
      setUserLogs([])
    } finally {
      setLogsLoading(false)
    }
  }

  const handleApprovalAction = async (userId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/admin/pending-approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, action }),
      })

      if (!response.ok) {
        throw new Error('Failed to process approval')
      }

      // 승인 처리 완료 후 데이터 새로고침
      if (action === 'approve') {
        alert('승인이 완료되었습니다.')
      } else {
        alert('승인 요청이 거절되었습니다.')
      }

      // 페이지 새로고침으로 최신 데이터 반영
      window.location.reload()
    } catch (error) {
      console.error('Failed to process approval:', error)
      alert('승인 처리 중 오류가 발생했습니다.')
    }
  }

  const getRoleText = (role: string) => {
    const roleMap = {
      'admin': '관리자',
      'homeroom': '담임교사',
      'helper': '노트북 관리 도우미',
      'manager': '관리팀',
      'student': '학생'
    }
    return roleMap[role as keyof typeof roleMap] || role
  }

  const getFilteredUsers = () => {
    return users.filter(user => {
      const matchesSearch = !searchTerm ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.className && user.className.includes(searchTerm))

      const matchesRole = roleFilter === 'all' || user.role === roleFilter

      // 탭별 필터링
      if (activeTab === 'pending-approvals') {
        return user.pendingApproval && matchesSearch
      }

      return matchesSearch && matchesRole
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">사용자 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const filteredUsers = getFilteredUsers()
  const pendingCount = pendingApprovals.length

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>사용자 관리</CardTitle>
          <CardDescription>
            시스템에 등록된 모든 사용자를 관리하고 승인 요청을 처리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="all-users">
                전체 사용자 ({users.length})
              </TabsTrigger>
              {(currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'homeroom') && (
                <TabsTrigger value="pending-approvals">
                  승인 대기 {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="all-users" className="space-y-4">
              {/* 검색 및 필터 */}
              <div className="flex items-center space-x-4">
                <Input
                  placeholder="이름, 이메일, 학급으로 검색..."
                  className="max-w-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="역할" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="admin">관리자</SelectItem>
                    <SelectItem value="homeroom">담임교사</SelectItem>
                    <SelectItem value="helper">노트북 관리 도우미</SelectItem>
                    <SelectItem value="manager">관리팀</SelectItem>
                    <SelectItem value="student">학생</SelectItem>
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
                      <TableHead>학급</TableHead>
                      <TableHead>대여 현황</TableHead>
                      <TableHead>가입일</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.name}
                            {user.isTeacher && (
                              <Badge variant="outline" className="ml-2">
                                교사
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {(currentUser.role === 'admin' || currentUser.role === 'manager') ? (
                                <Select
                                  value={user.role}
                                  onValueChange={(newRole) => {
                                    // 권한 체크: 관리팀은 admin이나 manager 역할을 지정할 수 없음
                                    if (currentUser.role === 'manager' && (newRole === 'admin' || newRole === 'manager')) {
                                      alert('관리팀은 관리자나 관리팀 역할을 지정할 수 없습니다.')
                                      return
                                    }

                                    // 관리자 역할은 taylorr@gclass.ice.go.kr만 지정 가능
                                    if (newRole === 'admin' && currentUser.email !== 'taylorr@gclass.ice.go.kr') {
                                      alert('관리자 역할은 최고 관리자만 지정할 수 있습니다.')
                                      return
                                    }

                                    handleRoleChange(user.id, newRole)
                                  }}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="student">학생</SelectItem>
                                    <SelectItem value="helper">노트북 관리 도우미</SelectItem>
                                    <SelectItem value="homeroom">담임교사</SelectItem>
                                    {/* 관리팀은 admin, manager 역할 선택 불가 */}
                                    {currentUser.role === 'admin' && (
                                      <>
                                        <SelectItem value="manager">관리팀</SelectItem>
                                        {currentUser.email === 'taylorr@gclass.ice.go.kr' && (
                                          <SelectItem value="admin">관리자</SelectItem>
                                        )}
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                  {getRoleText(user.role)}
                                </Badge>
                              )}
                              {user.pendingApproval && user.requestedRole && (
                                <Badge variant="outline" className="text-orange-600">
                                  {getRoleText(user.requestedRole)} 승인 대기
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{user.className || '-'}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {user.currentLoan && (
                                <Badge variant="default" className="mb-1">
                                  대여 중: {user.currentLoan}
                                </Badge>
                              )}
                              {user.overdueCount > 0 && (
                                <Badge variant="destructive" className="mb-1">
                                  연체 {user.overdueCount}건
                                </Badge>
                              )}
                              {user.loanHistory > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  총 {user.loanHistory}회 대여
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{user.createdAt || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {(currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'homeroom') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setShowUserLogsModal(true)
                                    // Always use email address for user logs API
                                    loadUserLogs(user.email)
                                  }}
                                  title="사용자 로그 보기"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </Button>
                              )}
                              {user.pendingApproval && (currentUser.role === 'admin' || currentUser.role === 'manager' ||
                                (currentUser.role === 'homeroom' && user.className === `${currentUser.grade}-${currentUser.class}`)) && (
                                <div className="flex space-x-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApprovalAction(user.id, 'approve')}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    승인
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApprovalAction(user.id, 'reject')}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    거절
                                  </Button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {users.length === 0 ? '등록된 사용자가 없습니다.' : '검색 결과가 없습니다.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="pending-approvals" className="space-y-4">
              {/* 승인 대기 사용자 목록 */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>요청 역할</TableHead>
                      <TableHead>신청 학급</TableHead>
                      <TableHead>신청일</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApprovals.length > 0 ? (
                      pendingApprovals.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-orange-600">
                              {getRoleText(user.requested_role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.class_info?.grade && user.class_info?.class
                              ? `${user.class_info.grade}-${user.class_info.class}`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {user.requested_at
                              ? new Date(user.requested_at).toLocaleDateString('ko-KR')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprovalAction(user.id, 'approve')}
                                className="text-green-600 hover:text-green-700"
                              >
                                승인
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprovalAction(user.id, 'reject')}
                                className="text-red-600 hover:text-red-700"
                              >
                                거절
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          승인 대기 중인 사용자가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 역할 변경 모달 */}
      <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 권한 변경</DialogTitle>
            <DialogDescription>
              {selectedUser?.name}님의 권한을 변경합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">현재 권한</label>
              <p className="text-sm text-muted-foreground">
                {selectedUser && getRoleText(selectedUser.role)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">새 권한</label>
              <div className="grid grid-cols-1 gap-2">
                {(() => {
                  const availableRoles = ['student', 'helper', 'homeroom']
                  // admin만 manager 역할 부여 가능
                  if (currentUser.role === 'admin') {
                    availableRoles.push('manager')
                  }
                  // taylorr@gclass.ice.go.kr만 admin 역할 부여 가능
                  if (currentUser.email === 'taylorr@gclass.ice.go.kr') {
                    availableRoles.push('admin')
                  }
                  return availableRoles
                })().map((role) => (
                  <Button
                    key={role}
                    variant={selectedUser?.role === role ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => handleRoleChange(selectedUser?.id || '', role)}
                  >
                    {getRoleText(role)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 사용자 로그 모달 */}
      <Dialog open={showUserLogsModal} onOpenChange={setShowUserLogsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>사용자 활동 로그</DialogTitle>
            <DialogDescription>
              {selectedUser?.name}님의 활동 기록입니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {logsLoading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">로그를 불러오는 중...</div>
              </div>
            ) : userLogs.length > 0 ? (
              <div className="space-y-3">
                {userLogs.map((log, index) => {
                  // 액션별 스타일 및 아이콘 정의
                  const getLogStyle = (action: string) => {
                    switch (action) {
                      case '대여 신청':
                        return {
                          bgColor: 'bg-blue-50 border-blue-200',
                          textColor: 'text-blue-700',
                          badgeColor: 'bg-blue-100 text-blue-800',
                          icon: '📝'
                        }
                      case '대여 승인':
                      case '대여 승인됨':
                        return {
                          bgColor: 'bg-green-50 border-green-200',
                          textColor: 'text-green-700',
                          badgeColor: 'bg-green-100 text-green-800',
                          icon: '✅'
                        }
                      case '대여 승인 작업':
                        return {
                          bgColor: 'bg-emerald-50 border-emerald-200',
                          textColor: 'text-emerald-700',
                          badgeColor: 'bg-emerald-100 text-emerald-800',
                          icon: '✅'
                        }
                      case '기기 수령':
                        return {
                          bgColor: 'bg-purple-50 border-purple-200',
                          textColor: 'text-purple-700',
                          badgeColor: 'bg-purple-100 text-purple-800',
                          icon: '📱'
                        }
                      case '기기 반납':
                        return {
                          bgColor: 'bg-gray-50 border-gray-200',
                          textColor: 'text-gray-700',
                          badgeColor: 'bg-gray-100 text-gray-800',
                          icon: '↩️'
                        }
                      case '반납 처리 작업':
                        return {
                          bgColor: 'bg-slate-50 border-slate-200',
                          textColor: 'text-slate-700',
                          badgeColor: 'bg-slate-100 text-slate-800',
                          icon: '📦'
                        }
                      case '대여 취소 (본인)':
                        return {
                          bgColor: 'bg-orange-50 border-orange-200',
                          textColor: 'text-orange-700',
                          badgeColor: 'bg-orange-100 text-orange-800',
                          icon: '🚫'
                        }
                      case '대여 거절':
                      case '대여 거절됨':
                        return {
                          bgColor: 'bg-red-50 border-red-200',
                          textColor: 'text-red-700',
                          badgeColor: 'bg-red-100 text-red-800',
                          icon: '❌'
                        }
                      case '대여 거절 작업':
                        return {
                          bgColor: 'bg-rose-50 border-rose-200',
                          textColor: 'text-rose-700',
                          badgeColor: 'bg-rose-100 text-rose-800',
                          icon: '❌'
                        }
                      case '대여 취소':
                        return {
                          bgColor: 'bg-orange-50 border-orange-200',
                          textColor: 'text-orange-700',
                          badgeColor: 'bg-orange-100 text-orange-800',
                          icon: '🚫'
                        }
                      case '계정 생성':
                        return {
                          bgColor: 'bg-yellow-50 border-yellow-200',
                          textColor: 'text-yellow-700',
                          badgeColor: 'bg-yellow-100 text-yellow-800',
                          icon: '👤'
                        }
                      default:
                        return {
                          bgColor: 'bg-gray-50 border-gray-200',
                          textColor: 'text-gray-700',
                          badgeColor: 'bg-gray-100 text-gray-800',
                          icon: '📄'
                        }
                    }
                  }

                  const style = getLogStyle(log.action)

                  return (
                    <div key={index} className={`border rounded-lg p-4 ${style.bgColor} hover:shadow-sm transition-shadow`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{style.icon}</span>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${style.badgeColor}`}>
                              {log.action}
                            </span>
                          </div>
                          <div className={`text-sm ${style.textColor} ml-8 leading-relaxed`}>
                            {log.details}
                          </div>
                        </div>
                        <div className={`text-sm ${style.textColor} opacity-75 whitespace-nowrap`}>
                          {new Date(log.timestamp).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      {log.metadata && (
                        <div className="text-xs bg-white bg-opacity-50 p-3 rounded mt-3 ml-8">
                          <pre className="whitespace-pre-wrap text-gray-600">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                활동 기록이 없습니다.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}