import { MainLayout } from '@/components/layout/main-layout'
import { requireRole } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UsersManagementWrapper } from '@/components/users/users-management-wrapper'

export default async function AdminPage() {
  const user = await requireRole(['admin'])

  // 실제 시스템 통계 (실제로는 데이터베이스에서 가져와야 함)
  const totalDevices = 3 * 13 * 35 // 3학년 × 13반 × 35대 = 1,365대

  const systemStats = {
    totalDevices: totalDevices,
    lastBackup: new Date().toISOString().slice(0, 19).replace('T', ' '),
    dbSize: '0KB'
  }

  // 실제 감사 로그는 API에서 가져와야 함
  const auditLogs: any[] = []

  // 실제 백업 기록은 API에서 가져와야 함
  const backupHistory: any[] = []

  const getRoleText = (role: string) => {
    const roleMap = {
      'admin': '관리자',
      'homeroom': '담임교사',
      'helper': '노트북 도우미',
      'teacher': '교사',
      'student': '학생'
    }
    return roleMap[role as keyof typeof roleMap] || role
  }

  const getActionText = (action: string) => {
    const actionMap = {
      'LOAN_APPROVED': '대여 승인',
      'LOAN_REJECTED': '대여 거절',
      'LOAN_RETURNED': '반납 처리',
      'DEVICE_UPDATED': '기기 수정',
      'USER_LOGIN': '로그인',
      'USER_LOGOUT': '로그아웃',
      'ADMIN_ACTION': '관리자 작업'
    }
    return actionMap[action as keyof typeof actionMap] || action
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">시스템 관리</h1>
            <p className="text-muted-foreground">
              시스템 설정, 사용자 관리 및 감사 로그
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              수동 백업
            </Button>
            <Button>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              시스템 설정
            </Button>
          </div>
        </div>

        {/* 시스템 상태 카드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체 기기</CardTitle>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalDevices}</div>
              <p className="text-xs text-muted-foreground">관리 대상 기기</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">마지막 백업</CardTitle>
              <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">자동</div>
              <p className="text-xs text-muted-foreground">{systemStats.lastBackup}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">
              사용자 관리
            </TabsTrigger>
            <TabsTrigger value="audit">
              감사 로그 ({auditLogs.length})
            </TabsTrigger>
            <TabsTrigger value="backup">
              백업 관리
            </TabsTrigger>
            <TabsTrigger value="settings">
              시스템 설정
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <UsersManagementWrapper />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>감사 로그</CardTitle>
                <CardDescription>
                  시스템에서 발생한 모든 중요 활동을 기록합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {getActionText(log.action)}
                            </Badge>
                            <span className="font-medium">{log.user}</span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {log.details}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {log.timestamp} • IP: {log.ipAddress}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      감사 로그가 없습니다.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>백업 상태</CardTitle>
                  <CardDescription>
                    데이터베이스 백업 현황 및 설정
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">마지막 백업</span>
                      <span className="text-sm text-muted-foreground">{systemStats.lastBackup}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">데이터베이스 크기</span>
                      <span className="text-sm text-muted-foreground">{systemStats.dbSize}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">자동 백업</span>
                      <Badge className="bg-green-100 text-green-800">활성화</Badge>
                    </div>
                    <div className="pt-4">
                      <Button className="w-full">
                        수동 백업 실행
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>백업 기록</CardTitle>
                  <CardDescription>
                    최근 백업 실행 기록
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {backupHistory.map((backup) => (
                      <div key={backup.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="text-sm font-medium">
                            {backup.date} {backup.time}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {backup.type === 'AUTO' ? '자동' : '수동'} • {backup.size}
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          성공
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>시스템 설정</CardTitle>
                <CardDescription>
                  노트북 관리 시스템의 전반적인 설정을 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  시스템 설정 기능은 준비 중입니다.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}