'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { AuthUser } from '@/lib/auth'
import { getRoleText } from '@/lib/utils'
import { ThemeToggleButton } from '@/components/ui/theme-toggle'

interface HeaderProps {
  user: AuthUser
}

export function Header({ user }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState({ loans: 0, admin: 0 })

  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const loansResponse = await fetch('/api/loans', { cache: 'no-store' })
        if (loansResponse.ok) {
          const { loans } = await loansResponse.json()
          let pendingCount = 0
          if (Array.isArray(loans)) {
            if (user.role === 'homeroom' && user.isApprovedHomeroom && user.grade && user.class) {
              const teacherClass = `${user.grade}-${user.class}`
              pendingCount = loans.filter((loan: any) => {
                const loanStatus = loan.status?.toLowerCase()
                const loanClass = loan.class_name || loan.className || ''
                return loanStatus === 'requested' && loanClass === teacherClass
              }).length
            } else if (user.role === 'helper' && user.grade && user.class) {
              const helperClass = `${user.grade}-${user.class}`
              pendingCount = loans.filter((loan: any) => {
                const loanStatus = loan.status?.toLowerCase()
                const loanClass = loan.class_name || loan.className || ''
                return loanStatus === 'requested' && loanClass === helperClass
              }).length
            } else if (user.role === 'admin') {
              pendingCount = loans.filter((loan: any) => loan.status?.toLowerCase() === 'requested').length
            }
          }
          setNotifications(prev => ({ ...prev, loans: pendingCount }))
        }

        if (user.role === 'admin' || user.role === 'homeroom') {
          const adminResponse = await fetch('/api/admin/pending-approvals', { cache: 'no-store' })
          if (adminResponse.ok) {
            const data = await adminResponse.json()
            let pendingCount = data.pendingUsers?.length || 0
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
        }
      } catch (error) {
        console.error('Failed to load notifications:', error)
      }
    }

    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [user])

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }, [supabase.auth, router])

  const navigationItems = useMemo(() => [
    { href: '/dashboard', label: '대시보드', roles: ['admin', 'homeroom', 'helper', 'student'], badge: 0 },
    { href: '/loans', label: '대여 관리', roles: ['admin', 'homeroom', 'helper'], badge: notifications.loans },
    { href: '/devices', label: '기기 관리', roles: ['admin', 'homeroom', 'helper'], badge: 0 },
    { href: '/students', label: '사용자 관리', roles: ['admin', 'homeroom'], badge: notifications.admin },
    { href: '/statistics', label: '통계', roles: ['admin'], badge: 0 },
    { href: '/admin', label: '관리자', roles: ['admin'], badge: 0 },
  ], [notifications.loans, notifications.admin])

  const filteredNavigation = useMemo(() =>
    navigationItems.filter(item => user.role && item.roles.includes(user.role as any)),
    [navigationItems, user.role]
  )

  const NotificationBadge = ({ count }: { count: number }) => {
    if (!count || count === 0 || isNaN(count)) return null
    return (
      <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full leading-none">
        {count > 99 ? '99+' : count}
      </span>
    )
  }

  const roleBadgeColor = user.role === 'admin'
    ? 'bg-amber-400 text-slate-900'
    : user.role === 'homeroom' || user.role === 'helper'
    ? 'bg-blue-100 text-blue-800'
    : 'bg-slate-200 text-slate-700'

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-50">
      {/* Top row: logo + user */}
      <div className="container flex h-14 items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
            <span className="text-slate-900 font-bold text-sm">중산</span>
          </div>
          <div className="hidden sm:block">
            <div className="font-semibold leading-tight text-sm">노트북 관리 시스템</div>
            <div className="text-[11px] text-slate-400 leading-tight">인천중산고등학교</div>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className={`hidden sm:inline-block px-2.5 py-1 text-xs font-semibold rounded ${roleBadgeColor}`}>
            {getRoleText(user.role)}
          </span>
          <span className="hidden md:inline text-sm text-slate-200">{user.name}</span>
          <ThemeToggleButton />
          <Link
            href="/profile"
            className="hidden sm:inline-flex px-3 py-1.5 text-sm rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            프로필
          </Link>
          <button
            onClick={handleSignOut}
            className="hidden sm:inline-flex px-3 py-1.5 text-sm rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
          >
            로그아웃
          </button>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="sm:hidden p-2 rounded-md hover:bg-slate-800"
            aria-label="메뉴"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom row: navigation */}
      <nav className="border-t border-slate-800 hidden sm:block">
        <div className="container flex gap-0">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-3 text-sm border-b-2 transition-colors flex items-center ${
                  isActive
                    ? 'border-amber-400 text-white font-medium'
                    : 'border-transparent text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
                <NotificationBadge count={item.badge} />
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden border-t border-slate-800 bg-slate-900">
          <div className="container py-2 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm ${
                    isActive ? 'bg-slate-800 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{item.label}</span>
                  <NotificationBadge count={item.badge} />
                </Link>
              )
            })}
            <div className="border-t border-slate-800 mt-2 pt-3 pb-2 px-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-200">{user.name}</div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded ${roleBadgeColor}`}>
                  {getRoleText(user.role)}
                </span>
              </div>
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 text-sm text-slate-300 rounded-md hover:bg-slate-800"
              >
                프로필
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2 text-sm rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
