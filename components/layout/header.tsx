'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { AuthUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getRoleText } from '@/lib/utils'
import { ThemeToggleButton } from '@/components/ui/theme-toggle'

interface HeaderProps {
  user: AuthUser
}

export function Header({ user }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState({
    loans: 0,
    admin: 0
  })

  const router = useRouter()
  const supabase = createClient()

  // 알림 데이터 로드
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        // 대여 관리 알림 (승인 대기 + 연체)
        const loansResponse = await fetch('/api/loans', { cache: 'no-store' })
        if (loansResponse.ok) {
          const { loans } = await loansResponse.json()

          let pendingCount = 0

          if (Array.isArray(loans)) {
            if (user.role === 'homeroom' && user.isApprovedHomeroom && user.grade && user.class) {
              // 담임교사: 자신의 반 승인 대기 신청
              const teacherClass = `${user.grade}-${user.class}`
              pendingCount = loans.filter((loan: any) => {
                const loanStatus = loan.status?.toLowerCase()
                const loanClass = loan.class_name || loan.className || ''
                return loanStatus === 'requested' && loanClass === teacherClass
              }).length
            } else if (user.role === 'admin' || user.role === 'helper') {
              // 관리자/노트북 관리 도우미: 전체 승인 대기 신청
              pendingCount = loans.filter((loan: any) => {
                const loanStatus = loan.status?.toLowerCase()
                return loanStatus === 'requested'
              }).length
            }
          }

          console.log(`🔔 알림 배지 업데이트: ${user.role} 역할, ${pendingCount}건의 대여 신청`)
          setNotifications(prev => ({ ...prev, loans: pendingCount }))
        } else {
          console.error('대여 정보 로드 실패:', loansResponse.status, loansResponse.statusText)
        }

        // 사용자 관리 알림 (담임교사 승인 대기)
        if (user.role === 'admin' || user.role === 'homeroom') {
          try {
            const adminResponse = await fetch('/api/admin/pending-homeroom', { cache: 'no-store' })
            if (adminResponse.ok) {
              const data = await adminResponse.json()
              let pendingCount = data.pendingUsers?.length || 0

              // 담임교사인 경우 자신의 반 승인 요청만 카운트
              if (user.role === 'homeroom' && user.grade && user.class) {
                const teacherClass = `${user.grade}-${user.class}`
                pendingCount = data.pendingUsers?.filter((pendingUser: any) => {
                  const userClass = pendingUser.class_info?.grade && pendingUser.class_info?.class
                    ? `${pendingUser.class_info.grade}-${pendingUser.class_info.class}`
                    : ''
                  return userClass === teacherClass
                }).length || 0
              }

              setNotifications(prev => ({ ...prev, admin: pendingCount }))
            }
          } catch (adminError) {
            console.error('Header admin notifications error:', adminError)
          }
        }
      } catch (error) {
        console.error('Failed to load notifications:', error)
      }
    }

    loadNotifications()

    // 5초마다 업데이트 (더 빠른 실시간 반영)
    const interval = setInterval(loadNotifications, 5000)
    return () => clearInterval(interval)
  }, [user])

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }, [supabase.auth, router])

  const navigationItems = useMemo(() => [
    {
      href: '/dashboard',
      label: '대시보드',
      roles: ['admin', 'homeroom', 'helper', 'teacher', 'student'],
      badge: 0
    },
    {
      href: '/loans',
      label: '대여 관리',
      roles: ['admin', 'homeroom', 'helper'],
      badge: notifications.loans
    },
    {
      href: '/devices',
      label: '기기 관리',
      roles: ['admin', 'homeroom'],
      badge: 0
    },
    {
      href: '/students',
      label: '사용자 관리',
      roles: ['admin', 'homeroom', 'helper'],
      badge: notifications.admin
    },
    {
      href: '/statistics',
      label: '통계',
      roles: ['admin'],
      badge: 0
    },
    {
      href: '/admin',
      label: '관리자',
      roles: ['admin'],
      badge: 0
    }
  ], [notifications.loans, notifications.admin])

  // 알림 배지 컴포넌트
  const NotificationBadge = useCallback(({ count }: { count: number }) => {
    // 숫자가 아니거나 0이면 표시하지 않음
    if (!count || count === 0 || isNaN(count)) return null

    // 음수 처리
    const displayCount = Math.max(0, count)

    return (
      <span className="ml-1 inline-flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full min-w-[20px] h-[20px] leading-none">
        <span className="flex items-center justify-center w-full h-full">
          {displayCount > 99 ? '99+' : displayCount}
        </span>
      </span>
    )
  }, [])

  const filteredNavigation = useMemo(() =>
    navigationItems.filter(item => item.roles.includes(user.role)),
    [navigationItems, user.role]
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <div className="h-6 w-6 bg-blue-600 rounded flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="hidden font-bold sm:inline-block">
              노트북 관리
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {filteredNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center"
              >
                {item.label}
                <NotificationBadge count={item.badge} />
              </Link>
            ))}
          </nav>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {user.name}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {getRoleText(user.role)}
                </Badge>
              </div>
              <ThemeToggleButton />
              <Link href="/profile">
                <Button variant="ghost" size="sm">
                  프로필
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-2 pb-3 pt-2 shadow-lg">
            {filteredNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>{item.label}</span>
                <NotificationBadge count={item.badge} />
              </Link>
            ))}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center px-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user.name}</div>
                  <div className="text-sm text-gray-500">{getRoleText(user.role)}</div>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-2">
                <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                  >
                    프로필
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleSignOut}
                >
                  로그아웃
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}