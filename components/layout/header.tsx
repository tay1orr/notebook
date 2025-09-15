'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { AuthUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getRoleText } from '@/lib/utils'

interface HeaderProps {
  user: AuthUser
}

export function Header({ user }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const navigationItems = [
    { href: '/dashboard', label: '대시보드', roles: ['admin', 'homeroom', 'helper', 'teacher'] },
    { href: '/loans', label: '대여 관리', roles: ['admin', 'homeroom', 'helper'] },
    { href: '/devices', label: '기기 관리', roles: ['admin', 'homeroom'] },
    { href: '/students', label: '학생 관리', roles: ['admin', 'homeroom', 'helper'] },
    { href: '/admin', label: '관리자', roles: ['admin'] }
  ]

  const filteredNavigation = navigationItems.filter(item =>
    item.roles.includes(user.role)
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
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                {item.label}
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
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
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
              <div className="mt-3 px-2">
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