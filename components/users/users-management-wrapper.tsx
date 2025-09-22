'use client'

import { useState, useEffect } from 'react'
import { UsersManagement } from './users-management'

export function UsersManagementWrapper() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true)
        console.log('UsersManagementWrapper - Loading users from API...')

        const response = await fetch('/api/users', { cache: 'no-store' })

        if (response.ok) {
          const { users } = await response.json()
          console.log('UsersManagementWrapper - Loaded users from API:', users)

          // 대여 기록도 함께 로드
          const loansResponse = await fetch('/api/loans', { cache: 'no-store' })
          let allLoans: any[] = []
          if (loansResponse.ok) {
            const { loans } = await loansResponse.json()
            allLoans = loans || []
          }

          // API에서 받은 사용자 데이터를 컴포넌트 형식으로 변환
          const formattedUsers = users.map((user: any) => {
            // 해당 사용자의 대여 기록 필터링 (자신이 신청한 것)
            const userLoans = allLoans.filter((loan: any) => loan.email === user.email)

            // 해당 사용자가 처리한 대여 기록 필터링 (관리자/도우미/담임교사가 승인/반납 처리한 것)
            const processedLoans = allLoans.filter((loan: any) =>
              loan.approved_by === user.email ||
              loan.approved_by === user.name ||
              (loan.notes && loan.notes.includes(user.name)) ||
              (loan.notes && loan.notes.includes(user.email))
            )

            // 두 종류의 활동을 합쳐서 시간순으로 정렬
            const allActivities = [
              ...userLoans.map((loan: any) => ({ ...loan, activityType: 'own_loan' })),
              ...processedLoans.map((loan: any) => ({ ...loan, activityType: 'processed' }))
            ].sort((a: any, b: any) =>
              new Date(b.created_at || b.requestedAt).getTime() - new Date(a.created_at || a.requestedAt).getTime()
            )

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role || '',
              lastLogin: user.lastLogin,
              status: 'active' as const,
              createdAt: user.createdAt,
              allLoans: allActivities // 자신의 대여 기록 + 처리한 기록 포함
            }
          })

          console.log('UsersManagementWrapper - Formatted users with loans:', formattedUsers)
          setUsers(formattedUsers)
          setError(null)
        } else {
          const errorText = await response.text()
          console.error('UsersManagementWrapper - API error:', errorText)
          setError(`API 오류: ${errorText}`)
        }
      } catch (error) {
        console.error('UsersManagementWrapper - Failed to load users:', error)
        setError(`사용자 목록을 불러올 수 없습니다: ${error}`)
      } finally {
        setLoading(false)
      }
    }

    loadUsers()

    // 30초마다 사용자 목록 새로고침
    const interval = setInterval(loadUsers, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">사용자 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
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

  return <UsersManagement users={users} />
}