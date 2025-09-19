'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, XCircle, Clock, User, GraduationCap } from 'lucide-react'

interface PendingUser {
  id: string
  email: string
  name: string
  class_info: {
    grade?: number
    class?: number
  }
  requested_at: string
  created_at: string
}

export function HomeRoomApprovalWrapper() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchPendingUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/pending-homeroom')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pending users')
      }

      setPendingUsers(data.pendingUsers || [])
    } catch (err) {
      console.error('Failed to fetch pending homeroom users:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingUsers()
  }, [])

  const handleAction = async (userId: string, action: 'approve' | 'reject') => {
    try {
      setProcessing(userId)
      setError(null)

      const response = await fetch('/api/admin/pending-homeroom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, action })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} user`)
      }

      // 성공 시 목록에서 해당 사용자 제거
      setPendingUsers(prev => prev.filter(user => user.id !== userId))

      // 성공 메시지
      alert(`담임교사 권한이 ${action === 'approve' ? '승인' : '거절'}되었습니다.`)

    } catch (err) {
      console.error(`Failed to ${action} homeroom user:`, err)
      setError(err instanceof Error ? err.message : `Failed to ${action}`)
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">담임교사 승인 대기 목록을 불러오는 중...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-red-600 mb-4">{error}</div>
          <Button onClick={fetchPendingUsers} className="w-full">
            다시 시도
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              담임교사 권한 승인
            </CardTitle>
            <CardDescription>
              담임교사 권한을 신청한 사용자들을 승인하거나 거절할 수 있습니다.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={fetchPendingUsers} disabled={loading}>
            새로고침
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {pendingUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <div className="text-lg font-medium mb-2">승인 대기 중인 담임교사가 없습니다</div>
            <div className="text-sm">새로운 담임교사 신청이 있으면 여기에 표시됩니다.</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                {pendingUsers.length}
              </Badge>
              명의 담임교사 승인 대기
            </div>

            <Separator />

            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div key={user.id} className="p-4 border rounded-lg bg-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* 사용자 기본 정보 */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-full">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium text-lg">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          승인 대기
                        </Badge>
                      </div>

                      {/* 담당 학급 정보 */}
                      {user.class_info?.grade && user.class_info?.class && (
                        <div className="pl-13">
                          <div className="text-sm text-muted-foreground mb-1">담당 학급</div>
                          <div className="font-medium">
                            {user.class_info.grade}학년 {user.class_info.class}반
                          </div>
                        </div>
                      )}

                      {/* 신청 일시 */}
                      <div className="pl-13">
                        <div className="text-sm text-muted-foreground mb-1">신청 일시</div>
                        <div className="text-sm">
                          {new Date(user.requested_at).toLocaleString('ko-KR')}
                        </div>
                      </div>
                    </div>

                    {/* 승인/거절 버튼 */}
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => handleAction(user.id, 'approve')}
                        disabled={processing === user.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {processing === user.id ? '처리 중...' : '승인'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(user.id, 'reject')}
                        disabled={processing === user.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        거절
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}