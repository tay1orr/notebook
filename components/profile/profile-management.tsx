'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface ProfileManagementProps {
  user: {
    name: string
    email: string
    role: string
    grade?: string
    class?: string
    studentNo?: string
    pendingApproval?: boolean
    pendingRole?: string
  }
}

export function ProfileManagement({ user }: ProfileManagementProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user.name,
    role: user.role,
    grade: user.grade || '',
    class: user.class || '',
    studentNo: user.studentNo || ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSave = async () => {
    if (formData.role === 'student' && (!formData.grade || !formData.class || !formData.studentNo)) {
      alert('모든 정보를 입력해주세요.')
      return
    }

    if (formData.role === 'homeroom' && (!formData.grade || !formData.class)) {
      alert('담당 학년과 반을 입력해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          pendingApproval: (formData.role === 'homeroom' && user.role !== 'homeroom') ||
                          (formData.role === 'helper' && user.role !== 'helper')
        }),
      })

      if (!response.ok) {
        throw new Error('프로필 업데이트 실패')
      }

      setIsEditing(false)

      // 승인이 필요한 역할 변경인지 확인
      const needsApprovalMessage = (formData.role === 'homeroom' && user.role !== 'homeroom') ||
                                  (formData.role === 'helper' && user.role !== 'helper')

      if (needsApprovalMessage) {
        const roleName = formData.role === 'homeroom' ? '담임교사' : '노트북 관리 도우미'
        alert(`${roleName} 권한 신청이 완료되었습니다.\n관리자 승인 후 권한이 활성화됩니다.\n승인 대기 중에는 학생 권한으로 시스템을 이용할 수 있습니다.`)
      } else {
        alert('프로필이 성공적으로 업데이트되었습니다.')
      }

      // 페이지 새로고침으로 업데이트된 정보 반영
      window.location.reload()
    } catch (error) {
      console.error('프로필 업데이트 실패:', error)
      alert('프로필 업데이트 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: user.name,
      role: user.role,
      grade: user.grade || '',
      class: user.class || '',
      studentNo: user.studentNo || ''
    })
    setIsEditing(false)
  }

  const handleCancelApplication = async () => {
    if (!confirm('정말로 신청을 취소하시겠습니까?')) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/profile/cancel-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('신청 취소 실패')
      }

      alert('신청이 취소되었습니다.')
      window.location.reload()
    } catch (error) {
      console.error('신청 취소 실패:', error)
      alert('신청 취소 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }


  const getRoleText = (role: string) => {
    const roleMap = {
      'admin': '관리자',
      'homeroom': '담임교사',
      'helper': '노트북 관리 도우미',
      'student': '학생'
    }
    return roleMap[role as keyof typeof roleMap] || role
  }

  const isAdmin = user.email === 'taylorr@gclass.ice.go.kr'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">프로필 관리</h1>
        <p className="text-muted-foreground">
          개인 정보를 확인하고 수정할 수 있습니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>
                계정 정보 및 역할 설정
              </CardDescription>
            </div>
            {!isAdmin && !isEditing && (
              <Button onClick={() => setIsEditing(true)}>
                정보 수정
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 기본 계정 정보 */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>이름</Label>
                {isEditing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="이름을 입력하세요"
                  />
                ) : (
                  <div className="text-lg font-medium">{user.name}</div>
                )}
              </div>
              <div>
                <Label>이메일</Label>
                <div className="text-lg">{user.email}</div>
              </div>
            </div>

            <Separator />

            {/* 역할 정보 */}
            <div className="space-y-4">
              <div>
                <Label>현재 역할</Label>
                <div className="flex items-center space-x-2">
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {getRoleText(user.role)}
                  </Badge>
                  {user.pendingApproval && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        {user.pendingRole === 'homeroom' ? '담임교사' : '노트북 관리 도우미'} 승인 대기 중
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelApplication()}
                        className="text-red-600 hover:text-red-700 border-red-300"
                      >
                        신청 취소
                      </Button>
                    </div>
                  )}
                  {isAdmin && (
                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                      시스템 관리자
                    </Badge>
                  )}
                </div>
              </div>

              {isEditing && !isAdmin && (
                <div>
                  <Label>역할 변경</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">학생</SelectItem>
                      <SelectItem value="helper">노트북 관리 도우미</SelectItem>
                      <SelectItem value="homeroom">담임교사</SelectItem>
                    </SelectContent>
                  </Select>
                  {((formData.role === 'homeroom' && user.role !== 'homeroom') ||
                    (formData.role === 'helper' && user.role !== 'helper')) && (
                    <div className="text-sm text-orange-600 mt-1">
                      {formData.role === 'homeroom' ? '담임교사' : '노트북 관리 도우미'}로 변경 시 관리자 승인이 필요합니다.
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* 학급 정보 */}
            {(user.role === 'student' || user.role === 'homeroom' || isEditing) && (
              <div className="space-y-4">
                <h4 className="font-medium">
                  {user.role === 'homeroom' || formData.role === 'homeroom' ? '담당 학급 정보' : '학급 정보'}
                </h4>

                {isEditing ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>학년</Label>
                      <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="학년" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1학년</SelectItem>
                          <SelectItem value="2">2학년</SelectItem>
                          <SelectItem value="3">3학년</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>반</Label>
                      <Select value={formData.class} onValueChange={(value) => setFormData({ ...formData, class: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="반" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 13 }, (_, i) => i + 1).map(num => (
                            <SelectItem key={num} value={num.toString()}>{num}반</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(user.role === 'student' || formData.role === 'student') && (
                      <div>
                        <Label>번호</Label>
                        <Input
                          type="number"
                          placeholder="번호"
                          value={formData.studentNo}
                          onChange={(e) => setFormData({ ...formData, studentNo: e.target.value })}
                          min="1"
                          max="40"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-lg">
                    {user.grade && user.class ? (
                      <>
                        {user.grade}학년 {user.class}반
                        {user.studentNo && ` ${user.studentNo}번`}
                      </>
                    ) : (
                      <span className="text-muted-foreground">설정되지 않음</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 수정 버튼들 */}
            {isEditing && (
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                  취소
                </Button>
                <Button onClick={handleSave} disabled={isSubmitting}>
                  {isSubmitting ? '저장 중...' : '저장'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 추가 안내 */}
      <Card>
        <CardHeader>
          <CardTitle>안내사항</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>• 학년이 올라가거나 반이 바뀌면 직접 정보를 수정해주세요.</div>
          <div>• 담임교사 및 노트북 관리 도우미 권한은 관리자 승인 후 활성화됩니다.</div>
          <div>• 승인 대기 중에는 학생 권한으로 시스템을 이용할 수 있습니다.</div>
          <div>• 이름이나 기본 정보가 잘못된 경우 직접 수정할 수 있습니다.</div>
          <div>• 문제가 있을 경우 관리자에게 문의해주세요.</div>
        </CardContent>
      </Card>

    </div>
  )
}