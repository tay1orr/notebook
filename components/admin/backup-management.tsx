'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DownloadIcon, DatabaseIcon, RefreshCwIcon, CheckCircleIcon, AlertCircleIcon, InfoIcon } from 'lucide-react'
import { BackupSchedule } from './backup-schedule'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDateTime } from '@/lib/utils'

interface BackupInfo {
  available_tables: string[]
  record_counts: Record<string, number>
  last_backup: string | null
}

interface BackupHistory {
  id: string
  type: 'manual' | 'auto'
  status: 'success' | 'failed' | 'pending'
  timestamp: string
  triggeredBy?: string
  table: string
  size?: number
}

export function BackupManagement() {
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null)
  const [selectedTable, setSelectedTable] = useState('all')
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [loading, setLoading] = useState(true)
  const [showBackupDetails, setShowBackupDetails] = useState(false)
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([])

  useEffect(() => {
    loadBackupInfo()
    loadBackupHistory()
  }, [])

  const loadBackupHistory = async () => {
    try {
      console.log('🔍 백업 기록 로드 시작')
      const response = await fetch('/api/backup/history')
      console.log('🔍 백업 기록 응답:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('🔍 백업 기록 데이터:', data)
        setBackupHistory(data.history || [])
        console.log('🔍 백업 기록 상태 업데이트됨:', data.history?.length || 0, '개')
      } else {
        console.error('🔍 백업 기록 로드 실패:', response.status)
      }
    } catch (error) {
      console.error('백업 기록 로드 실패:', error)
    }
  }

  useEffect(() => {
    console.log('백업 상세 모달 상태 변경됨:', showBackupDetails)
  }, [showBackupDetails])

  const loadBackupInfo = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backup')
      if (response.ok) {
        const info = await response.json()
        setBackupInfo(info)
      }
    } catch (error) {
      console.error('백업 정보 로드 실패:', error)
      setBackupStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const createBackup = async () => {
    try {
      setIsBackingUp(true)
      setBackupStatus('idle')
      console.log('🔄 백업 시작 - 선택된 테이블:', selectedTable)
      console.log('🔄 백업 API URL:', `/api/backup?table=${selectedTable}`)

      const response = await fetch(`/api/backup?table=${selectedTable}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      console.log('📡 백업 응답 상태:', response.status, response.statusText)
      console.log('📡 백업 응답 헤더:', Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const blob = await response.blob()
        console.log('📦 백업 블롭 크기:', blob.size)

        if (blob.size === 0) {
          throw new Error('백업 파일이 비어있습니다.')
        }

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url

        const timestamp = new Date().toISOString().split('T')[0]
        const filename = `notebook-backup-${selectedTable}-${timestamp}.json`
        a.download = filename

        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        console.log('✅ 백업 완료:', filename)
        setBackupStatus('success')
        setLastBackupTime(new Date().toISOString())
        setStatusMessage(`백업이 완료되었습니다! (${getTableDisplayName(selectedTable)})`)

        // 백업 정보 및 기록 새로고침
        await loadBackupInfo()
        await loadBackupHistory()

        setTimeout(() => {
          setBackupStatus('idle')
          setStatusMessage('')
        }, 5000)
      } else {
        let errorMessage = '백업 생성 실패'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          const errorText = await response.text()
          errorMessage = errorText || errorMessage
        }

        console.error('❌ 백업 API 오류:', response.status, errorMessage)
        throw new Error(`${errorMessage} (${response.status})`)
      }
    } catch (error) {
      console.error('❌ 백업 생성 실패 - 상세 오류:', error)
      console.error('❌ 백업 생성 실패 - 오류 타입:', typeof error)
      console.error('❌ 백업 생성 실패 - 오류 메시지:', error instanceof Error ? error.message : String(error))

      setBackupStatus('error')
      setStatusMessage(error instanceof Error ? error.message : '백업 생성 중 오류가 발생했습니다.')
      setTimeout(() => {
        setBackupStatus('idle')
        setStatusMessage('')
      }, 5000)
    } finally {
      console.log('🔚 백업 프로세스 완료 - 상태 초기화')
      setIsBackingUp(false)
    }
  }

  const getTableDisplayName = (table: string) => {
    const names: Record<string, string> = {
      all: '전체 데이터',
      loan_applications: '대여 신청',
      user_roles: '사용자 역할',
      devices: '기기 정보'
    }
    return names[table] || table
  }

  const getTotalRecords = () => {
    if (!backupInfo) return 0
    return Object.values(backupInfo.record_counts).reduce((sum, count) => sum + count, 0)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCwIcon className="h-6 w-6 animate-spin mr-2" />
            <span>백업 정보를 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Tabs defaultValue="manual" className="space-y-6">
      <TabsList>
        <TabsTrigger value="manual">수동 백업</TabsTrigger>
        <TabsTrigger value="schedule">자동 백업 스케줄</TabsTrigger>
      </TabsList>

      <TabsContent value="manual" className="space-y-6">
      {/* 백업 상태 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DatabaseIcon className="h-5 w-5" />
            <span>데이터 백업 관리</span>
          </CardTitle>
          <CardDescription>
            시스템 데이터를 안전하게 백업하고 다운로드할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{getTotalRecords()}</div>
              <div className="text-sm text-muted-foreground">총 레코드 수</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {backupInfo?.available_tables.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">백업 가능 테이블</div>
            </div>
            <div
              className="text-center p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('백업 정보 카드 클릭됨 - 현재 상태:', showBackupDetails)
                setShowBackupDetails(true)
                console.log('백업 정보 카드 - 상태 업데이트 호출됨: true')
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setShowBackupDetails(true)
                }
              }}
            >
              <div className="text-2xl font-bold text-purple-600">
                {lastBackupTime ? '완료' : '대기'}
              </div>
              <div className="text-sm text-muted-foreground">
                {lastBackupTime ?
                  formatDateTime(lastBackupTime) :
                  '백업 대기중'
                }
              </div>
              <InfoIcon className="h-4 w-4 mx-auto mt-1 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 백업 생성 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>백업 생성</CardTitle>
          <CardDescription>
            특정 테이블 또는 전체 데이터를 백업할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 테이블 선택 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">백업할 데이터 선택</label>
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 데이터</SelectItem>
                {backupInfo?.available_tables.map((table) => (
                  <SelectItem key={table} value={table}>
                    {getTableDisplayName(table)} ({backupInfo.record_counts[table]}건)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 백업 정보 미리보기 */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">백업 내용 미리보기</h4>
            <div className="space-y-1 text-sm">
              {selectedTable === 'all' ? (
                backupInfo?.available_tables.map((table) => (
                  <div key={table} className="flex justify-between">
                    <span>{getTableDisplayName(table)}</span>
                    <Badge variant="secondary">
                      {backupInfo.record_counts[table]}건
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="flex justify-between">
                  <span>{getTableDisplayName(selectedTable)}</span>
                  <Badge variant="secondary">
                    {backupInfo?.record_counts[selectedTable] || 0}건
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* 백업 실행 버튼 */}
          <div className="flex items-center space-x-2">
            <Button
              onClick={createBackup}
              disabled={isBackingUp || !backupInfo}
              className="flex-1"
            >
              {isBackingUp ? (
                <RefreshCwIcon className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <DownloadIcon className="h-4 w-4 mr-2" />
              )}
              {isBackingUp ? '백업 생성 중...' : '백업 다운로드'}
            </Button>

            <Button
              variant="outline"
              onClick={loadBackupInfo}
              disabled={loading}
              size="icon"
            >
              <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

          </div>

          {/* 상태 메시지 */}
          {backupStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircleIcon className="h-4 w-4" />
              <div>
                <div className="text-sm font-medium">{statusMessage || '백업이 완료되었습니다!'}</div>
                <div className="text-xs text-green-700">
                  파일이 다운로드 폴더에 저장되었습니다. ({getTableDisplayName(selectedTable)} • {new Date().toLocaleString('ko-KR')})
                </div>
              </div>
            </div>
          )}

          {backupStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircleIcon className="h-4 w-4" />
              <div>
                <div className="text-sm font-medium">백업 생성 실패</div>
                <div className="text-xs text-red-700">
                  {statusMessage || '백업 생성 중 오류가 발생했습니다. 관리자에게 문의하세요.'}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 백업 안내 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">백업 안내사항</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <div>• 백업 파일은 JSON 형식으로 다운로드됩니다.</div>
          <div>• 정기적인 백업을 통해 데이터 손실을 방지하세요.</div>
          <div>• 백업 파일은 안전한 장소에 보관하시기 바랍니다.</div>
          <div>• 대용량 데이터의 경우 백업 시간이 다소 소요될 수 있습니다.</div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="schedule">
        <BackupSchedule />
      </TabsContent>
    </Tabs>

    {/* 백업 상세 정보 모달 */}
    <Dialog open={showBackupDetails || false} onOpenChange={setShowBackupDetails}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>백업 시스템 상세 정보</DialogTitle>
          <DialogDescription>
            현재 백업 시스템의 상태와 설정 정보입니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 백업 통계 */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">데이터 현황</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {backupInfo?.available_tables.map((table) => (
                    <div key={table} className="flex justify-between">
                      <span className="text-sm">{getTableDisplayName(table)}</span>
                      <Badge variant="outline">
                        {backupInfo.record_counts[table]}건
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">백업 설정</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>백업 형식</span>
                    <span className="font-medium">JSON</span>
                  </div>
                  <div className="flex justify-between">
                    <span>압축</span>
                    <span className="font-medium">미압축</span>
                  </div>
                  <div className="flex justify-between">
                    <span>인코딩</span>
                    <span className="font-medium">UTF-8</span>
                  </div>
                  <div className="flex justify-between">
                    <span>자동 백업</span>
                    <span className="font-medium text-green-600">활성화</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 백업 기록 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">최근 백업 기록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {backupHistory.length > 0 ? (
                  backupHistory.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="text-sm font-medium">
                          {record.type === 'manual' ? '수동 백업' : '자동 백업'}
                          {record.type === 'manual' ? ' (사용자 실행)' : ' (매일 오전 2시)'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(record.timestamp)} • {getTableDisplayName(record.table)}
                          {record.triggeredBy && record.type === 'manual' && ` • ${record.triggeredBy}`}
                        </div>
                      </div>
                      <Badge className={
                        record.status === 'success' ? 'bg-green-100 text-green-800' :
                        record.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {record.status === 'success' ? '성공' :
                         record.status === 'failed' ? '실패' : '예약됨'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    백업 기록이 없습니다.
                  </div>
                )}

                {/* 자동 백업 예약 정보 */}
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div>
                    <div className="text-sm font-medium">자동 백업 (매일 오전 2시)</div>
                    <div className="text-xs text-muted-foreground">
                      시스템 자동 실행 • 전체 데이터
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">예약됨</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 백업 위치 안내 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">백업 파일 위치</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>• <strong>수동 백업</strong>: 브라우저 다운로드 폴더</div>
                <div>• <strong>파일명 형식</strong>: notebook-backup-{'{테이블}'}-{'{날짜}'}.json</div>
                <div>• <strong>예시</strong>: notebook-backup-all-2025-09-22.json</div>
                <div>• <strong>권장 보관</strong>: 안전한 외부 저장소 또는 클라우드</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}