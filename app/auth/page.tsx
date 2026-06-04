'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'

export default function AuthPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN || 'gclass.ice.go.kr'

  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            hd: allowedDomain,
            prompt: 'select_account',
          },
        },
      })

      if (error) {
        setError(error.message.includes('domain')
          ? `학교 계정(@${allowedDomain})으로만 로그인할 수 있습니다.`
          : error.message)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* School identity */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 mb-4 shadow-lg">
            <span className="text-white font-bold text-lg">중산</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">인천중산고등학교</h1>
          <p className="text-sm text-slate-500 mt-1">노트북 관리 시스템</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">로그인</h2>
            <p className="text-sm text-slate-500">학교 Google 계정으로 로그인하세요</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-md">
              <p className="text-rose-700 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 border border-slate-300 rounded-md bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin mr-3" />
            ) : (
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {loading ? '로그인 중...' : 'Google 계정으로 로그인'}
          </button>

          <div className="mt-6 pt-6 border-t border-slate-100 space-y-2 text-xs text-slate-500">
            <p>
              <span className="font-medium text-slate-700">@{allowedDomain}</span> 도메인 계정만 이용 가능
            </p>
            <p>학생은 가입 후 즉시 이용 가능하며, 담임교사는 관리자 승인 후 활성화됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
