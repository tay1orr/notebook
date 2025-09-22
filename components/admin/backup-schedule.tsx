'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { CalendarIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon, SettingsIcon } from 'lucide-react'

interface BackupSchedule {
  enabled: boolean
  schedule_type: 'daily' | 'weekly' | 'monthly'
  time: string
  last_run: string | null
  next_run: string
  timezone: string
}

export function BackupSchedule() {
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    loadSchedule()
  }, [])

  const loadSchedule = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backup/schedule')
      if (response.ok) {
        const data = await response.json()
        setSchedule(data)
      }
    } catch (error) {
      console.error('백업 스케줄 로드 실패:', error)
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const saveSchedule = async () => {
    if (!schedule) return

    try {
      setSaving(true)
      setStatus('idle')

      const response = await fetch('/api/backup/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      })

      if (response.ok) {
        setStatus('success')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        throw new Error('저장 실패')
      }
    } catch (error) {
      console.error('백업 스케줄 저장 실패:', error)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    } finally {
      setSaving(false)
    }
  }

  const updateSchedule = (updates: Partial<BackupSchedule>) => {
    if (!schedule) return
    setSchedule({ ...schedule, ...updates })
  }

  const getScheduleText = (type: string) => {
    const texts = {
      daily: '매일',
      weekly: '매주',
      monthly: '매월'
    }
    return texts[type as keyof typeof texts] || type
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)

    // 한국 시간으로 표시
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Seoul'
    }).format(date)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full border-2 border-primary border-t-transparent h-6 w-6 mr-2" />
            <span>스케줄 정보를 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!schedule) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            백업 스케줄 정보를 불러올 수 없습니다.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 현재 스케줄 상태 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span>자동 백업 스케줄</span>
          </CardTitle>
          <CardDescription>
            시스템 데이터의 자동 백업 일정을 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Badge
                  variant={schedule.enabled ? "default" : "secondary"}
                  className={schedule.enabled ? "bg-green-100 text-green-800" : ""}
                >
                  {schedule.enabled ? '활성화' : '비활성화'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">백업 상태</div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-lg font-semibold">
                {getScheduleText(schedule.schedule_type)} {schedule.time}
              </div>
              <div className="text-sm text-muted-foreground">백업 주기</div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-lg font-semibold">
                {schedule.next_run ? (() => {
                  // 한국 시간으로 계산
                  const now = new Date()
                  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
                  const koreaTime = new Date(utcTime + (9 * 60 * 60 * 1000))

                  const nextDate = new Date(schedule.next_run)
                  const tomorrow = new Date(koreaTime)
                  tomorrow.setDate(tomorrow.getDate() + 1)

                  const isToday = nextDate.toDateString() === koreaTime.toDateString()
                  const isTomorrow = nextDate.toDateString() === tomorrow.toDateString()

                  if (isToday) {
                    return `오늘 ${schedule.time}`
                  } else if (isTomorrow) {
                    return `내일 ${schedule.time}`
                  } else {
                    return nextDate.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      timeZone: 'Asia/Seoul'
                    }) + ` ${schedule.time}`
                  }
                })() : '-'}
              </div>
              <div className="text-sm text-muted-foreground">다음 백업 (매일 오전 2시)</div>
            </div>
          </div>

          {schedule.last_run && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  마지막 백업: {formatDateTime(schedule.last_run)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 스케줄 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5" />
            <span>스케줄 설정</span>
          </CardTitle>
          <CardDescription>
            자동 백업의 주기와 시간을 설정할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 활성화/비활성화 */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">자동 백업 활성화</Label>
              <p className="text-sm text-muted-foreground">
                설정된 일정에 따라 자동으로 백업을 실행합니다.
              </p>
            </div>
            <Switch
              checked={schedule.enabled}
              onCheckedChange={(enabled) => updateSchedule({ enabled })}
            />
          </div>

          {schedule.enabled && (
            <>
              {/* 백업 주기 */}
              <div className="space-y-2">
                <Label>백업 주기</Label>
                <Select
                  value={schedule.schedule_type}
                  onValueChange={(schedule_type: any) => updateSchedule({ schedule_type })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">매일</SelectItem>
                    <SelectItem value="weekly">매주</SelectItem>
                    <SelectItem value="monthly">매월</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 백업 시간 */}
              <div className="space-y-2">
                <Label>백업 시간</Label>
                <Input
                  type="time"
                  value={schedule.time}
                  onChange={(e) => updateSchedule({ time: e.target.value })}
                  className="w-40"
                />
                <p className="text-xs text-muted-foreground">
                  시간대: {schedule.timezone}
                </p>
              </div>
            </>
          )}

          {/* 저장 버튼 */}
          <div className="flex items-center space-x-2 pt-4">
            <Button onClick={saveSchedule} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full border-2 border-white border-t-transparent h-4 w-4 mr-2" />
                  저장 중...
                </>
              ) : (
                '설정 저장'
              )}
            </Button>

            <Button variant="outline" onClick={loadSchedule} disabled={loading}>
              새로고침
            </Button>
          </div>

          {/* 상태 메시지 */}
          {status === 'success' && (
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircleIcon className="h-4 w-4" />
              <span className="text-sm">백업 스케줄이 성공적으로 저장되었습니다.</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircleIcon className="h-4 w-4" />
              <span className="text-sm">백업 스케줄 저장 중 오류가 발생했습니다.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 안내사항 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">자동 백업 안내</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <div>• <strong>권장 시간</strong>: 새벽 2시 (시스템 사용량이 적은 시간)</div>
          <div>• <strong>매일 백업</strong>: 일일 데이터 손실 방지</div>
          <div>• <strong>매주 백업</strong>: 주간 데이터 아카이브</div>
          <div>• <strong>매월 백업</strong>: 장기 보관용 백업</div>
          <div>• 백업 파일은 자동으로 다운로드되거나 지정된 저장소에 보관됩니다.</div>
        </CardContent>
      </Card>
    </div>
  )
}