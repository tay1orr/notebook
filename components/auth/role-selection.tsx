'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface RoleSelectionProps {
  user: {
    name: string
    email: string
  }
  onComplete?: (userData: {
    role: 'student' | 'homeroom'
    grade?: string
    class?: string
    studentNo?: string
    pendingApproval?: boolean
  }) => void
}

export function RoleSelection({ user, onComplete }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<'student' | 'homeroom' | null>(null)
  const [grade, setGrade] = useState('')
  const [classNo, setClassNo] = useState('')
  const [studentNo, setStudentNo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedRole) return

    if (selectedRole === 'student' && (!grade || !classNo || !studentNo)) {
      alert('모든 정보를 입력해주세요.')
      return
    }

    if (selectedRole === 'homeroom' && (!grade || !classNo)) {
      alert('담당 학년과 반을 입력해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      const userData = {
        role: selectedRole,
        grade,
        class: classNo,
        studentNo: selectedRole === 'student' ? studentNo : undefined,
        pendingApproval: selectedRole === 'homeroom'
      }

      if (onComplete) {
        await onComplete(userData)
      } else {
        // 기본 처리: localStorage에 저장하고 대시보드로 이동
        console.log('역할 설정 완료:', userData)

        if (typeof window !== 'undefined') {
          localStorage.setItem('userProfile', JSON.stringify({
            ...user,
            ...userData,
            setupComplete: true
          }))
          window.location.href = '/dashboard'
        }
      }
    } catch (error) {
      console.error('역할 설정 실패:', error)
      alert('역할 설정 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">역할 선택</CardTitle>
          <CardDescription>
            안녕하세요, {user.name}님!<br />
            처음 로그인하시는군요. 역할을 선택해주세요.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 역할 선택 */}
          <div className="space-y-3">
            <Label className="text-base font-medium">역할을 선택해주세요</Label>

            <div className="grid gap-3">
              <Card
                className={`cursor-pointer transition-colors ${
                  selectedRole === 'student'
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedRole('student')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedRole === 'student'
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300'
                    }`} />
                    <div>
                      <div className="font-medium">학생</div>
                      <div className="text-sm text-gray-600">노트북 대여를 신청하는 학생</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-colors ${
                  selectedRole === 'homeroom'
                    ? 'border-green-500 bg-green-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedRole('homeroom')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedRole === 'homeroom'
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300'
                    }`} />
                    <div>
                      <div className="font-medium">담임교사</div>
                      <div className="text-sm text-gray-600">
                        담당반 학생들의 대여를 관리하는 교사
                        <Badge variant="outline" className="ml-2 text-xs">승인 필요</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 학생 정보 입력 */}
          {selectedRole === 'student' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900">학생 정보 입력</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="grade">학년</Label>
                  <Select value={grade} onValueChange={setGrade}>
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
                  <Label htmlFor="class">반</Label>
                  <Select value={classNo} onValueChange={setClassNo}>
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
                <div>
                  <Label htmlFor="studentNo">번호</Label>
                  <Input
                    id="studentNo"
                    type="number"
                    placeholder="번호"
                    value={studentNo}
                    onChange={(e) => setStudentNo(e.target.value)}
                    min="1"
                    max="40"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 담임교사 정보 입력 */}
          {selectedRole === 'homeroom' && (
            <div className="space-y-4 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900">담임 정보 입력</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="teacher-grade">담당 학년</Label>
                  <Select value={grade} onValueChange={setGrade}>
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
                  <Label htmlFor="teacher-class">담당 반</Label>
                  <Select value={classNo} onValueChange={setClassNo}>
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
              </div>
              <div className="text-sm text-green-700 bg-green-100 p-3 rounded">
                ⚠️ 담임교사 권한은 관리자 승인 후 활성화됩니다.<br />
                승인 전까지는 임시로 학생 권한으로 시스템을 이용할 수 있습니다.
              </div>
            </div>
          )}

          {/* 제출 버튼 */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!selectedRole || isSubmitting}
          >
            {isSubmitting ? '설정 중...' : '역할 설정 완료'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}