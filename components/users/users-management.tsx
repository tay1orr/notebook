'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getRoleText } from '@/lib/utils'

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
}

export function UsersManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // 모든 사용자 로드
  useEffect(() => {
    const loadUsers = async () => {
      // API 시도하되 실패하면 즉시 localStorage로 폴백
      let useLocalStorage = false

      try {
        const response = await fetch('/api/loans')
        if (response.ok) {
          const { loans } = await response.json()
          console.log('UsersManagement - Loaded loans from API:', loans)

          // 대여 데이터에서 사용자 정보 추출
          const userMap = new Map()

          // 기본 관리자 추가
          userMap.set('admin@gclass.ice.go.kr', {
            id: '1',
            name: '관리자',
            email: 'admin@gclass.ice.go.kr',
            role: 'admin',
            lastLogin: new Date().toISOString(),
            status: 'active',
            createdAt: '2025-01-01T00:00:00Z'
          })

          loans.forEach(loan => {
            const email = loan.email
            if (email && !userMap.has(email)) {
              userMap.set(email, {
                id: email,
                name: loan.student_name || loan.studentName,
                email: email,
                role: 'student',
                lastLogin: loan.created_at || loan.requestedAt,
                status: 'active',
                createdAt: loan.created_at || loan.requestedAt
              })
            }
          })

          const usersArray = Array.from(userMap.values())
          setUsers(usersArray)

          return // API 성공 시 localStorage 실행 안함
        } else {
          console.error('UsersManagement - API failed, using localStorage:', response.statusText)
          useLocalStorage = true
        }
      } catch (error) {
        console.error('UsersManagement - API error, using localStorage:', error)
        useLocalStorage = true
      }

      // localStorage 폴백 (API 실패 시 또는 기본)
      if (typeof window !== 'undefined') {
        let storedLoans = localStorage.getItem('loanApplications')
        if (!storedLoans) {
          storedLoans = sessionStorage.getItem('loanApplications')
          console.log('UsersManagement - Trying sessionStorage fallback')
        }
        if (storedLoans) {
          try {
            const loans = JSON.parse(storedLoans)
            console.log('UsersManagement - Using localStorage fallback', loans.length, 'loans')

            // 대여 데이터에서 사용자 정보 추출
            const userMap = new Map()

            // 기본 관리자 추가
            userMap.set('admin@gclass.ice.go.kr', {
              id: '1',
              name: '관리자',
              email: 'admin@gclass.ice.go.kr',
              role: 'admin',
              lastLogin: new Date().toISOString(),
              status: 'active',
              createdAt: '2025-01-01T00:00:00Z'
            })

            loans.forEach((loan: any) => {
              const email = loan.email
              if (email && !userMap.has(email)) {
                userMap.set(email, {
                  id: email,
                  name: loan.studentName,
                  email: email,
                  role: 'student',
                  lastLogin: loan.requestedAt,
                  status: 'active',
                  createdAt: loan.requestedAt
                })
              }
            })

            const usersArray = Array.from(userMap.values())
            setUsers(usersArray)

          } catch (error) {
            console.error('Failed to parse loan data:', error)

            // 완전 폴백: 기본 더미 데이터
            const dummyUsers: User[] = [
              {
                id: '1',
                name: '관리자',
                email: 'admin@gclass.ice.go.kr',
                role: 'admin',
                lastLogin: '2025-09-18T10:30:00Z',
                status: 'active',
                createdAt: '2025-01-01T00:00:00Z'
              },
              {
                id: '2',
                name: '1-1 담임교사',
                email: 'teacher11@gclass.ice.go.kr',
                role: 'homeroom',
                className: '1-1',
                lastLogin: '2025-09-18T09:15:00Z',
                status: 'active',
                createdAt: '2025-01-15T00:00:00Z'
              },
              {
                id: '3',
                name: '노트북 도우미',
                email: 'helper@gclass.ice.go.kr',
                role: 'helper',
                className: '1-2',
                lastLogin: '2025-09-18T08:45:00Z',
                status: 'active',
                createdAt: '2025-02-01T00:00:00Z'
              }
            ]
            setUsers(dummyUsers)
          }
        } else {
          // localStorage도 없으면 기본 더미 데이터
          const dummyUsers: User[] = [
            {
              id: '1',
              name: '관리자',
              email: 'admin@gclass.ice.go.kr',
              role: 'admin',
              lastLogin: '2025-09-18T10:30:00Z',
              status: 'active',
              createdAt: '2025-01-01T00:00:00Z'
            }
          ]
          setUsers(dummyUsers)
        }
      }
    }

    loadUsers()

    // BroadcastChannel 리스너 추가 (탭 간 동기화)
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('loan-applications')
      channel.onmessage = (event) => {
        console.log('UsersManagement - Received broadcast:', event.data)
        if (event.data.type === 'NEW_LOAN_APPLICATION') {
          loadUsers() // 데이터 새로고침
        }
      }
    } catch (error) {
      console.log('BroadcastChannel not supported:', error)
    }

    const interval = setInterval(loadUsers, 2000) // 2초마다

    return () => {
      clearInterval(interval)
      if (channel) {
        channel.close()
      }
    }
  }, [])

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                        <Button variant="ghost" size="sm">
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
    </div>
  )
}