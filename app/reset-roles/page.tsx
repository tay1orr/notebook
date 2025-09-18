'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ResetRolesPage() {
  const router = useRouter()

  const handleForceReset = () => {
    // 모든 캐시된 데이터 클리어
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()

      // 페이지 완전 새로고침으로 모든 캐시 제거
      window.location.href = '/setup'
    }
  }

  const handleDatabaseReset = async () => {
    try {
      const response = await fetch('/api/reset-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        alert('데이터베이스에서 모든 사용자 역할이 초기화되었습니다.')
        // 캐시도 클리어하고 setup 페이지로 이동
        localStorage.clear()
        sessionStorage.clear()
        window.location.href = '/setup'
      } else {
        alert('역할 초기화에 실패했습니다.')
      }
    } catch (error) {
      console.error('Reset error:', error)
      alert('오류가 발생했습니다.')
    }
  }

  const handleLogoutAndLogin = () => {
    // 로그아웃 후 재로그인
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/auth'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">사용자 역할 초기화</CardTitle>
          <CardDescription>
            모든 사용자의 역할을 초기화하고 새로 설정합니다.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 space-y-2">
            <p>• 관리자를 제외한 모든 사용자의 역할이 초기화되었습니다.</p>
            <p>• 새로운 역할을 선택해야 시스템을 이용할 수 있습니다.</p>
            <p>• 캐시 문제가 있다면 아래 버튼을 사용해주세요.</p>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={handleDatabaseReset}
            >
              데이터베이스에서 역할 초기화
            </Button>

            <Button
              className="w-full"
              onClick={handleForceReset}
            >
              역할 선택 페이지로 이동
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleLogoutAndLogin}
            >
              로그아웃 후 다시 로그인
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}