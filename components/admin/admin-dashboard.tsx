'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getRoleText, getStatusColor, getStatusText, formatDateTime, getPurposeText, isLoanOverdue, getLoanStatus } from '@/lib/utils'

interface AdminDashboardProps {
  user: {
    name: string
    role: string
  }
}

interface StatCardProps {
  label: string
  value: number | string
  unit?: string
  description: string
  accent: 'slate' | 'blue' | 'emerald' | 'amber' | 'rose'
  href?: string
}

const ACCENT_BORDER = {
  slate: 'border-slate-300',
  blue: 'border-blue-600',
  emerald: 'border-emerald-600',
  amber: 'border-amber-500',
  rose: 'border-rose-600',
} as const

const ACCENT_VALUE = {
  slate: 'text-slate-900',
  blue: 'text-slate-900',
  emerald: 'text-slate-900',
  amber: 'text-slate-900',
  rose: 'text-rose-700',
} as const

function StatCard({ label, value, unit, description, accent, href }: StatCardProps) {
  const inner = (
    <div className={`bg-white rounded-lg border-l-4 ${ACCENT_BORDER[accent]} border-y border-r border-slate-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}>
      <div className="text-sm font-medium text-slate-600 mb-2">{label}</div>
      <div className={`text-3xl font-bold ${ACCENT_VALUE[accent]}`}>
        {value}
        {unit && <span className={`text-base font-normal ml-1 ${accent === 'rose' ? 'text-rose-500' : 'text-slate-500'}`}>{unit}</span>}
      </div>
      <div className={`text-xs mt-1 ${accent === 'rose' ? 'text-rose-600' : 'text-slate-500'}`}>{description}</div>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [loans, setLoans] = useState<any[]>([])
  const [totalRegisteredUsers, setTotalRegisteredUsers] = useState<number>(0)

  useEffect(() => {
    const loadLoans = async () => {
      try {
        const response = await fetch('/api/loans')
        if (response.ok) {
          const { loans } = await response.json()
          setLoans(loans || [])
        }
      } catch (error) {
        console.error('Failed to load loans:', error)
      }
    }

    loadLoans()
    const interval = setInterval(loadLoans, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const loadUserCount = async () => {
      try {
        const response = await fetch('/api/users')
        if (response.ok) {
          const { users } = await response.json()
          setTotalRegisteredUsers(users.length)
        }
      } catch (error) {
        console.error('Failed to load user count:', error)
      }
    }

    loadUserCount()
    const interval = setInterval(loadUserCount, 60000)
    return () => clearInterval(interval)
  }, [])

  const pendingLoans = loans.filter(loan => loan.status === 'requested').length
  const activeLoans = loans.filter(loan => loan.status === 'picked_up' && !isLoanOverdue(loan.due_date || loan.dueDate)).length
  const overdueLoans = loans.filter(loan => loan.status === 'picked_up' && isLoanOverdue(loan.due_date || loan.dueDate)).length

  const recentLoans = [...loans]
    .sort((a, b) => new Date(b.created_at || b.requestedAt).getTime() - new Date(a.created_at || a.requestedAt).getTime())
    .slice(0, 5)

  const today = new Date()
  const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
          <p className="text-sm text-slate-600 mt-1">
            {formattedDate} · 안녕하세요, <span className="font-medium text-slate-900">{user.name}</span>님 ({getRoleText(user.role)})
          </p>
        </div>
        <Link
          href="/loans"
          className="hidden sm:inline-flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-medium transition-colors"
        >
          + 새 대여 신청
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="신청 대기"
          value={pendingLoans}
          unit="건"
          description="처리 대기 중인 신청"
          accent="amber"
          href="/loans"
        />
        <StatCard
          label="사용 중"
          value={activeLoans}
          unit="대"
          description="현재 대여 중"
          accent="blue"
          href="/loans?tab=active"
        />
        <StatCard
          label="연체"
          value={overdueLoans}
          unit="건"
          description={overdueLoans > 0 ? '즉시 조치 필요' : '연체 없음'}
          accent="rose"
          href="/loans?tab=overdue"
        />
        <StatCard
          label="총 사용자"
          value={totalRegisteredUsers}
          unit="명"
          description="등록된 총 사용자"
          accent="emerald"
          href="/students"
        />
      </div>

      {/* Two columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent loans */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="font-semibold text-slate-900">최근 대여 신청</h2>
              <p className="text-xs text-slate-500 mt-0.5">최근 5건의 신청 및 진행 상황</p>
            </div>
            <Link href="/loans" className="text-sm font-medium text-slate-700 hover:text-slate-900">
              전체 보기 →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentLoans.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500">
                최근 대여 기록이 없습니다.
              </div>
            ) : (
              recentLoans.map((loan) => {
                const status = getLoanStatus(loan)
                const studentName = loan.student_name || loan.studentName || ''
                const className = loan.class_name || loan.className || ''
                const studentNo = loan.student_no || loan.studentNo || ''
                const isCancelled = loan.status === 'rejected' && loan.notes === 'STUDENT_CANCELLED'
                const statusColorClass = isCancelled
                  ? 'bg-orange-100 text-orange-800'
                  : getStatusColor(status, loan.notes)

                return (
                  <Link
                    key={loan.id}
                    href={loan.status === 'picked_up' ? '/loans?tab=active' : '/loans'}
                    className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700 shrink-0">
                        {studentName.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{studentName}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {className} {studentNo && `· ${studentNo}번`} · {getPurposeText(loan.purpose)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="hidden sm:inline text-xs text-slate-500">
                        {formatDateTime(loan.created_at || loan.requestedAt)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold ${statusColorClass}`}>
                        {getStatusText(status, loan.notes)}
                      </span>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">빠른 작업</h2>
          <div className="space-y-2">
            <Link
              href="/loans"
              className="block w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-semibold text-left transition-colors"
            >
              + 새 대여 신청
            </Link>
            <Link
              href="/loans"
              className="block w-full px-4 py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-md text-sm font-medium text-left transition-colors"
            >
              대여 승인 처리
            </Link>
            <Link
              href="/devices"
              className="block w-full px-4 py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-md text-sm font-medium text-left transition-colors"
            >
              기기 관리
            </Link>
            <Link
              href="/students"
              className="block w-full px-4 py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-md text-sm font-medium text-left transition-colors"
            >
              사용자 관리
            </Link>
            {user.role === 'admin' && (
              <>
                <Link
                  href="/statistics"
                  className="block w-full px-4 py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-md text-sm font-medium text-left transition-colors"
                >
                  이용률 통계
                </Link>
                <Link
                  href="/admin"
                  className="block w-full px-4 py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-md text-sm font-medium text-left transition-colors"
                >
                  관리자 설정
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
