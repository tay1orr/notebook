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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 DEBUG - Current user:', user.email, user.id)

    // user_roles 테이블에서 역할과 학급 정보 확인
    const { data: roleData, error: roleError } = await adminSupabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)

    console.log('🔍 DEBUG - Role data:', roleData, 'Error:', roleError)

    // students 테이블에서 학생 정보 확인
    const { data: studentData, error: studentError } = await adminSupabase
      .from('students')
      .select('*')
      .eq('user_id', user.id)

    console.log('🔍 DEBUG - Student data:', studentData, 'Error:', studentError)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0]
      },
      roleData,
      studentData,
      roleError: roleError?.message,
      studentError: studentError?.message
    })
  } catch (error) {
    console.error('🔍 DEBUG - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}