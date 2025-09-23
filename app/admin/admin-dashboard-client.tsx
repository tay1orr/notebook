'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UsersManagementWrapper } from '@/components/users/users-management-wrapper'
import { HomeRoomApprovalWrapper } from '@/components/admin/homeroom-approval-wrapper'
import { BackupManagement } from '@/components/admin/backup-management'

interface AdminDashboardClientProps {
  user: {
    name: string
    role: string
    email: string
  }
}

export function AdminDashboardClient({ user }: AdminDashboardClientProps) {
  const [pendingHomeroomCount, setPendingHomeroomCount] = useState(0)
  const [activeTab, setActiveTab] = useState('users')
  const [backupRefreshTrigger, setBackupRefreshTrigger] = useState(0)
  const [lastBackupInfo, setLastBackupInfo] = useState<{
    type: string
    timestamp: string
  } | null>(null)
  const [isLoadingBackupInfo, setIsLoadingBackupInfo] = useState(true)

  // 담임교사 승인 대기 건수 실시간 로드
  useEffect(() => {
    const loadPendingHomeroomCount = async () => {
      try {
        const response = await fetch('/api/admin/pending-homeroom', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          const count = data.pendingUsers?.length || 0
          setPendingHomeroomCount(count)
        }
      } catch (error) {
        console.error('Admin dashboard pending homeroom count error:', error)
      }
    }

    loadPendingHomeroomCount()

    // 5초마다 업데이트
    const interval = setInterval(loadPendingHomeroomCount, 5000)
    return () => clearInterval(interval)
  }, [])

  // 최근 백업 정보 로드
  useEffect(() => {
    const loadLastBackupInfo = async () => {
      try {
        console.log('🔄 대시보드 백업 정보 폴링 시작')
        setIsLoadingBackupInfo(true)
        const response = await fetch('/api/backup/history')
        if (response.ok) {
          const data = await response.json()
          const history = data.history || []
          console.log('📊 대시보드 백업 기록 폴링 결과:', history.length, '개 기록')
          if (history.length > 0) {
            const latest = history[0]
            console.log('📍 최신 백업 기록:', latest)
            const newBackupInfo = {
              type: latest.type === 'manual' ? '수동' : '자동',
              timestamp: latest.timestamp
            }
            console.log('🔄 대시보드 백업 정보 업데이트:', newBackupInfo)
            setLastBackupInfo(newBackupInfo)
          } else {
            console.log('⚠️ 백업 기록이 없음 - 상태 초기화')
            setLastBackupInfo(null)
          }
        }
      } catch (error) {
        console.error('Latest backup info load error:', error)
        setLastBackupInfo(null)
      } finally {
        setIsLoadingBackupInfo(false)
      }
    }

    loadLastBackupInfo()

    // 10초마다 업데이트
    const interval = setInterval(loadLastBackupInfo, 10000)
    return () => clearInterval(interval)
  }, [])

  // 백업 탭 활성화 시 새로고침 트리거
  useEffect(() => {
    if (activeTab === 'backup') {
      setBackupRefreshTrigger(prev => prev + 1)
    }
  }, [activeTab])

  // 실제 시스템 통계
  const totalDevices = 3 * 13 * 35 // 3학년 × 13반 × 35대 = 1,365대

  const systemStats = {
    totalDevices: totalDevices,
    dbSize: '0KB'
  }

  // 실제 감사 로그는 API에서 가져와야 함
  const auditLogs: any[] = []

  // 실제 백업 기록은 API에서 가져와야 함
  const backupHistory: any[] = []

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
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">시스템 관리</h1>
          <p className="text-muted-foreground">
            시스템 설정, 사용자 관리 및 감사 로그
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={async () => {
              console.log('🔄 서버 백업 실행 명령')
              try {
                const response = await fetch('/api/backup/trigger', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include'
                })

                console.log('📡 서버 백업 응답:', response.status, response.statusText)

                if (response.ok) {
                  const result = await response.json()
                  console.log('✅ 서버 백업 완료:', result)
                  alert('백업이 성공적으로 완료되었습니다.')

                  // 백업 완료 후 최근 백업 정보 새로고침
                  setTimeout(async () => {
                    try {
                      setIsLoadingBackupInfo(true)
                      const historyResponse = await fetch('/api/backup/history')
                      if (historyResponse.ok) {
                        const data = await historyResponse.json()
                        const history = data.history || []
                        if (history.length > 0) {
                          const latest = history[0]
                          setLastBackupInfo({
                            type: latest.type === 'manual' ? '수동' : '자동',
                            timestamp: latest.timestamp
                          })
                          console.log('🔄 백업 정보 새로고침 완료:', latest)
                        }
                      }

                      // 백업 관리 탭도 새로고침
                      setBackupRefreshTrigger(prev => prev + 1)
                    } catch (refreshError) {
                      console.error('백업 정보 새로고침 실패:', refreshError)
                    } finally {
                      setIsLoadingBackupInfo(false)
                    }
                  }, 1000) // 1초 후 새로고침
                } else {
                  const errorData = await response.json()
                  console.error('❌ 서버 백업 실패:', errorData)
                  alert(`백업 실패: ${errorData.error}`)
                }
              } catch (error) {
                console.error('❌ 서버 백업 오류:', error)
                alert('백업 중 오류가 발생했습니다.')
              }
            }}
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            수동 백업
          </Button>
          <Button
            onClick={() => {
              // 시스템 설정 탭으로 이동
              const settingsTab = document.querySelector('[value="settings"]') as HTMLElement
              if (settingsTab) {
                settingsTab.click()
              }
            }}
          >
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
            {isLoadingBackupInfo ? (
              <>
                <div className="text-2xl font-bold text-blue-600">
                  로딩 중
                </div>
                <p className="text-xs text-muted-foreground">
                  백업 정보를 가져오는 중...
                </p>
              </>
            ) : lastBackupInfo ? (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {lastBackupInfo.type}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(lastBackupInfo.timestamp).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">
                  백업 없음
                </div>
                <p className="text-xs text-muted-foreground">
                  백업 기록이 없습니다
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            사용자 관리
          </TabsTrigger>
          <TabsTrigger value="homeroom">
            담임교사 승인 ({pendingHomeroomCount})
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

        <TabsContent value="homeroom" className="space-y-4">
          <HomeRoomApprovalWrapper />
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
          <BackupManagement refreshTrigger={backupRefreshTrigger} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {/* 시스템 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>시스템 정보</CardTitle>
              <CardDescription>
                현재 시스템의 상태와 정보를 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">시스템 버전</span>
                    <span className="text-sm font-medium">v1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">데이터베이스</span>
                    <span className="text-sm font-medium">Supabase PostgreSQL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">환경</span>
                    <span className="text-sm font-medium">Production</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">마지막 업데이트</span>
                    <span className="text-sm font-medium">{new Date().toLocaleDateString('ko-KR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">총 사용자 수</span>
                    <span className="text-sm font-medium">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">활성 세션</span>
                    <span className="text-sm font-medium">-</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 일반 설정 */}
          <Card>
            <CardHeader>
              <CardTitle>일반 설정</CardTitle>
              <CardDescription>
                시스템의 기본 동작을 설정합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">자동 백업</div>
                  <div className="text-xs text-muted-foreground">매일 자정에 자동으로 데이터를 백업합니다</div>
                </div>
                <Badge className="bg-green-100 text-green-800">활성화</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">이메일 알림</div>
                  <div className="text-xs text-muted-foreground">중요한 시스템 이벤트 시 이메일로 알림을 받습니다</div>
                </div>
                <Badge variant="secondary">비활성화</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">로그 보관 기간</div>
                  <div className="text-xs text-muted-foreground">시스템 로그를 보관하는 기간을 설정합니다</div>
                </div>
                <span className="text-sm font-medium">30일</span>
              </div>
            </CardContent>
          </Card>

          {/* 보안 설정 */}
          <Card>
            <CardHeader>
              <CardTitle>보안 설정</CardTitle>
              <CardDescription>
                시스템 보안과 관련된 설정을 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">세션 타임아웃</div>
                  <div className="text-xs text-muted-foreground">사용자 세션이 자동으로 만료되는 시간</div>
                </div>
                <span className="text-sm font-medium">8시간</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">도메인 제한</div>
                  <div className="text-xs text-muted-foreground">허용된 이메일 도메인</div>
                </div>
                <span className="text-sm font-medium">ichungjungsan.kr</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">관리자 승인</div>
                  <div className="text-xs text-muted-foreground">담임교사 계정 생성 시 관리자 승인 필요</div>
                </div>
                <Badge className="bg-green-100 text-green-800">활성화</Badge>
              </div>
            </CardContent>
          </Card>

          {/* 시스템 작업 */}
          <Card>
            <CardHeader>
              <CardTitle>시스템 작업</CardTitle>
              <CardDescription>
                시스템 유지보수와 관련된 작업을 수행합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="text-sm font-medium">데이터베이스 최적화</div>
                  <div className="text-xs text-muted-foreground">데이터베이스 성능을 최적화합니다</div>
                </div>
                <Button variant="outline" size="sm">실행</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="text-sm font-medium">캐시 정리</div>
                  <div className="text-xs text-muted-foreground">시스템 캐시를 정리합니다</div>
                </div>
                <Button variant="outline" size="sm">실행</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="text-sm font-medium">로그 정리</div>
                  <div className="text-xs text-muted-foreground">오래된 로그 파일을 정리합니다</div>
                </div>
                <Button variant="outline" size="sm">실행</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}