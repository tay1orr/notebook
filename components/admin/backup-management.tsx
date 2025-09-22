'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DownloadIcon, DatabaseIcon, RefreshCwIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-react'
import { BackupSchedule } from './backup-schedule'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface BackupInfo {
  available_tables: string[]
  record_counts: Record<string, number>
  last_backup: string | null
}

export function BackupManagement() {
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null)
  const [selectedTable, setSelectedTable] = useState('all')
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBackupInfo()
  }, [])

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

      const response = await fetch(`/api/backup?table=${selectedTable}`, {
        method: 'POST'
      })

      if (response.ok) {
        const blob = await response.blob()
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

        setBackupStatus('success')
        setTimeout(() => setBackupStatus('idle'), 3000)
      } else {
        throw new Error('백업 생성 실패')
      }
    } catch (error) {
      console.error('백업 생성 실패:', error)
      setBackupStatus('error')
      setTimeout(() => setBackupStatus('idle'), 3000)
    } finally {
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
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">JSON</div>
              <div className="text-sm text-muted-foreground">백업 형식</div>
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
              <span className="text-sm">백업이 성공적으로 다운로드되었습니다.</span>
            </div>
          )}

          {backupStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircleIcon className="h-4 w-4" />
              <span className="text-sm">백업 생성 중 오류가 발생했습니다.</span>
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
  )
}