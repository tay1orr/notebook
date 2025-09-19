import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = createServerClient()
    const adminSupabase = createAdminClient()

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 RESET PROFILE - Reset role for user:', user.email)

    // 사용자의 역할 삭제
    const { error: deleteRoleError } = await adminSupabase
      .from('user_roles')
      .delete()
      .eq('user_id', user.id)

    if (deleteRoleError) {
      console.error('🔍 RESET PROFILE - Failed to delete role:', deleteRoleError)
      return NextResponse.json({ error: 'Failed to reset role' }, { status: 500 })
    }

    // 사용자의 학생 정보도 삭제 (있다면)
    const { error: deleteStudentError } = await adminSupabase
      .from('students')
      .delete()
      .eq('user_id', user.id)

    if (deleteStudentError) {
      console.log('🔍 RESET PROFILE - No student info to delete or error:', deleteStudentError.message)
    } else {
      console.log('🔍 RESET PROFILE - Student info deleted')
    }

    console.log('🔍 RESET PROFILE - Role reset successfully for:', user.email)

    return NextResponse.json({
      success: true,
      message: 'Role reset successfully. Please refresh the page to set up your role again.'
    })
  } catch (error) {
    console.error('🔍 RESET PROFILE - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}