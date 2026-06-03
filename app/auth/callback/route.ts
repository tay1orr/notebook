import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { isAllowedDomain } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin-utils'
import { createAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/auth`)
  }

  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback - exchangeCodeForSession error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=auth_failed`)
    }

    if (data.user?.email && !isAllowedDomain(data.user.email)) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=domain_not_allowed`)
    }

    // RLS를 우회하기 위해 admin client 사용
    if (data.user) {
      const adminSupabase = createAdminClient()
      const isAdmin = isAdminEmail(data.user.email)

      // public.users에 행 보장 (RLS 우회)
      const { error: usersUpsertError } = await adminSupabase
        .from('users')
        .upsert({
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name || data.user.email!.split('@')[0],
          role: isAdmin ? 'admin' : 'student',
        }, { onConflict: 'id' })

      if (usersUpsertError) {
        console.error('Auth callback - users upsert error:', usersUpsertError)
      }

      // 관리자라면 user_roles에도 admin 보장
      if (isAdmin) {
        const { error: roleUpsertError } = await adminSupabase
          .from('user_roles')
          .upsert({ user_id: data.user.id, role: 'admin' }, { onConflict: 'user_id' })

        if (roleUpsertError) {
          console.error('Auth callback - user_roles upsert error:', roleUpsertError)
        }
      }
    }

    return NextResponse.redirect(`${requestUrl.origin}/dashboard`)

  } catch (error) {
    console.error('Auth callback - unexpected error:', error)
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=unexpected_error`)
  }
}