'use client'

import { useState, useEffect } from 'react'
import { IntegratedUserManagement } from './integrated-user-management'

interface UserInfo {
  id: string
  email: string
  name: string
  role: string
  grade?: string
  class?: string
  isApprovedHomeroom?: boolean
}

export function IntegratedUserManagementWrapper() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/debug/role-check', { cache: 'no-store' })

        if (response.ok) {
          const userData = await response.json()
          const currentUser = userData.user
          setUser({
            id: currentUser.id,
            email: currentUser.email,
            name: currentUser.name,
            role: currentUser.role || 'student',
            grade: currentUser.grade,
            class: currentUser.class,
            isApprovedHomeroom: currentUser.isApprovedHomeroom
          })
          setError(null)
        } else {
          setError('사용자 정보를 불러올 수 없습니다.')
        }
      } catch (error) {
        console.error('Failed to load current user:', error)
        setError(`사용자 정보 로드 실패: ${error}`)
      } finally {
        setLoading(false)
      }
    }

    loadCurrentUser()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">사용자 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center text-red-600">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="font-medium mb-2">오류 발생</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            새로고침
          </button>
        </div>
      </div>
    )
  }

  return <IntegratedUserManagement currentUser={user} />
}