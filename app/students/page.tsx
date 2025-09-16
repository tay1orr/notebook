import { MainLayout } from '@/components/layout/main-layout'
import { requireRole } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function StudentsPage() {
  const user = await requireRole(['admin', 'homeroom', 'helper'])

  // 임시 데이터 (실제로는 데이터베이스에서 가져와야 함)
  const students = [
    {
      id: '1',
      studentNo: '10101',
      name: '김학생',
      className: '1-1',
      email: 'student10101@gclass.ice.go.kr',
      phone: '010-1234-5678',
      currentLoan: {
        deviceTag: 'NB-2024-001',
        dueDate: '2024-09-16 08:45',
        status: 'picked_up'
      },
      loanHistory: {
        total: 5,
        overdue: 0,
        lastLoan: '2024-09-10'
      }
    },
    {
      id: '2',
      studentNo: '10102',
      name: '이학생',
      className: '1-1',
      email: 'student10102@gclass.ice.go.kr',
      phone: '010-2345-6789',
      currentLoan: null,
      loanHistory: {
        total: 3,
        overdue: 1,
        lastLoan: '2024-09-08'
      }
    },
    {
      id: '3',
      studentNo: '10103',
      name: '박학생',
      className: '1-2',
      email: 'student10103@gclass.ice.go.kr',
      phone: '010-3456-7890',
      currentLoan: null,
      loanHistory: {
        total: 8,
        overdue: 0,
        lastLoan: '2024-09-12'
      }
    },
    {
      id: '4',
      studentNo: '10104',
      name: '최학생',
      className: '1-2',
      email: 'student10104@gclass.ice.go.kr',
      phone: '010-4567-8901',
      currentLoan: {
        deviceTag: 'NB-2024-004',
        dueDate: '2024-09-16 08:45',
        status: 'approved'
      },
      loanHistory: {
        total: 2,
        overdue: 0,
        lastLoan: '2024-09-15'
      }
    }
  ]

  const classes = [
    {
      id: '1',
      grade: 1,
      className: '1반',
      fullName: '1-1',
      homeroomTeacher: '김담임',
      studentCount: 25,
      currentLoans: 3,
      deviceQuota: 8
    },
    {
      id: '2',
      grade: 1,
      className: '2반',
      fullName: '1-2',
      homeroomTeacher: '이담임',
      studentCount: 26,
      currentLoans: 2,
      deviceQuota: 8
    },
    {
      id: '3',
      grade: 1,
      className: '3반',
      fullName: '1-3',
      homeroomTeacher: '박담임',
      studentCount: 24,
      currentLoans: 1,
      deviceQuota: 8
    }
  ]

  const studentsWithLoans = students.filter(s => s.currentLoan)
  const studentsWithOverdue = students.filter(s => s.loanHistory.overdue > 0)

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">학생 관리</h1>
            <p className="text-muted-foreground">
              학생 정보 및 대여 현황 관리
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
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

        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students">
              학생 목록 ({students.length})
            </TabsTrigger>
            <TabsTrigger value="classes">
              학급 관리 ({classes.length})
            </TabsTrigger>
            <TabsTrigger value="loans">
              대여 현황 ({studentsWithLoans.length})
            </TabsTrigger>
            <TabsTrigger value="overdue">
              연체 기록 ({studentsWithOverdue.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>학생 목록</CardTitle>
                <CardDescription>
                  등록된 모든 학생의 정보와 대여 이력을 확인할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* 검색 및 필터 */}
                <div className="flex items-center space-x-4 mb-4">
                  <Input
                    placeholder="학생명, 학번으로 검색..."
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
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="대여 상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="current">현재 대여중</SelectItem>
                      <SelectItem value="available">대여 가능</SelectItem>
                      <SelectItem value="overdue">연체 기록</SelectItem>
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
                        <TableHead>이메일</TableHead>
                        <TableHead>현재 대여</TableHead>
                        <TableHead>대여 이력</TableHead>
                        <TableHead>연체 기록</TableHead>
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
                          <TableCell>
                            <Badge variant="outline">
                              {student.className}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {student.email}
                          </TableCell>
                          <TableCell>
                            {student.currentLoan ? (
                              <div className="text-sm">
                                <div className="font-medium">{student.currentLoan.deviceTag}</div>
                                <div className="text-muted-foreground">
                                  {student.currentLoan.status === 'picked_up' ? '수령됨' : '승인됨'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>총 {student.loanHistory.total}회</div>
                              <div className="text-muted-foreground">
                                최근: {student.loanHistory.lastLoan}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {student.loanHistory.overdue > 0 ? (
                              <Badge variant="destructive">
                                {student.loanHistory.overdue}회
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">
                                없음
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button variant="ghost" size="sm">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </Button>
                              <Button variant="ghost" size="sm">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Button>
                              {!student.currentLoan && (
                                <Button variant="ghost" size="sm">
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>학급 관리</CardTitle>
                <CardDescription>
                  학급별 학생 수와 기기 배정 현황을 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {classes.map((cls) => (
                    <Card key={cls.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div>
                              <h3 className="text-lg font-semibold">{cls.fullName}</h3>
                              <p className="text-sm text-muted-foreground">
                                담임교사: {cls.homeroomTeacher}
                              </p>
                            </div>
                            <div className="flex items-center space-x-6">
                              <div className="text-center">
                                <div className="text-2xl font-bold">{cls.studentCount}</div>
                                <div className="text-xs text-muted-foreground">학생 수</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{cls.currentLoans}</div>
                                <div className="text-xs text-muted-foreground">현재 대여</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{cls.deviceQuota}</div>
                                <div className="text-xs text-muted-foreground">기기 할당</div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm">
                              학생 목록
                            </Button>
                            <Button variant="outline" size="sm">
                              설정
                            </Button>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm">
                            <span>기기 사용률</span>
                            <span>{Math.round((cls.currentLoans / cls.deviceQuota) * 100)}%</span>
                          </div>
                          <div className="mt-2 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(cls.currentLoans / cls.deviceQuota) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loans" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>현재 대여 현황</CardTitle>
                <CardDescription>
                  현재 기기를 대여 중인 학생들의 목록입니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {studentsWithLoans.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{student.name}</span>
                          <Badge variant="outline">{student.className}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {student.studentNo}번
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          기기: {student.currentLoan?.deviceTag} • 반납 예정: {student.currentLoan?.dueDate}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={student.currentLoan?.status === 'picked_up' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                          {student.currentLoan?.status === 'picked_up' ? '수령됨' : '승인됨'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          상세보기
                        </Button>
                      </div>
                    </div>
                  ))}
                  {studentsWithLoans.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      현재 대여 중인 학생이 없습니다.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overdue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>연체 기록이 있는 학생</CardTitle>
                <CardDescription>
                  과거에 연체 기록이 있는 학생들의 목록입니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {studentsWithOverdue.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{student.name}</span>
                          <Badge variant="outline">{student.className}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {student.studentNo}번
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          총 대여: {student.loanHistory.total}회 • 연체: {student.loanHistory.overdue}회
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="destructive">
                          연체 {student.loanHistory.overdue}회
                        </Badge>
                        <Button variant="outline" size="sm">
                          상세보기
                        </Button>
                      </div>
                    </div>
                  ))}
                  {studentsWithOverdue.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      연체 기록이 있는 학생이 없습니다.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}