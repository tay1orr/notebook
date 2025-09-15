import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { isAllowedDomain } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${requestUrl.origin}/auth?error=auth_failed`)
      }

      if (data.user?.email && !isAllowedDomain(data.user.email)) {
        // 허용되지 않은 도메인이면 로그아웃하고 에러 페이지로
        await supabase.auth.signOut()
        return NextResponse.redirect(`${requestUrl.origin}/auth?error=domain_not_allowed`)
      }

      // 사용자 정보를 users 테이블에 업서트
      if (data.user) {
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.name || data.user.email!.split('@')[0],
            role: 'student', // 기본값, 관리자가 수동으로 변경
          }, {
            onConflict: 'id'
          })

        if (upsertError) {
          console.error('User upsert error:', upsertError)
        }
      }

      // 로그인 성공, 대시보드로 리다이렉트
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`)

    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=unexpected_error`)
    }
  }

  // 코드가 없으면 로그인 페이지로
  return NextResponse.redirect(`${requestUrl.origin}/auth`)
}