import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServerClient()
    const adminSupabase = createAdminClient()

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        error: 'Not authenticated',
        authError: authError?.message
      }, { status: 401 })
    }

    console.log('🔍 ROLE CHECK - Current user:', user.email, user.id)

    // user_roles 테이블에서 직접 확인
    const { data: roleData, error: roleError } = await adminSupabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)

    console.log('🔍 ROLE CHECK - Direct DB query result:', { roleData, roleError })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0]
      },
      roleData: roleData || [],
      roleError: roleError?.message,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('🔍 ROLE CHECK - Unexpected error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}