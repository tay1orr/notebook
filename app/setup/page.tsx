'use client'

import { useEffect, useState } from 'react'
import { RoleSelection } from '@/components/auth/role-selection'

interface User {
  name: string
  email: string
  id: string
}

export default function SetupPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 클라이언트에서 사용자 정보 가져오기
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/user')
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)

          console.log('🔍 SETUP PAGE DEBUG - User data:', userData)

          // 관리자는 대시보드로 리다이렉트
          if (userData.email === 'taylorr@gclass.ice.go.kr') {
            window.location.href = '/dashboard'
            return
          }

          // localStorage에서 역할 확인
          const savedRole = localStorage.getItem('userRole')
          if (savedRole && savedRole !== '') {
            console.log('🔍 SETUP PAGE DEBUG - Found saved role:', savedRole)
            window.location.href = '/dashboard'
            return
          }
        }
      } catch (error) {
        console.error('Setup page error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>사용자 정보를 가져올 수 없습니다.</div>
      </div>
    )
  }

  return <RoleSelection user={user} />
}