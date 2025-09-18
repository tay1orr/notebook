import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServerClient()

    // 현재 사용자가 관리자인지 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.email !== 'taylorr@gclass.ice.go.kr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 RESET ROLES - Admin user confirmed:', user.email)

    // 관리자가 아닌 모든 사용자의 역할을 삭제
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .neq('user_id', user.id) // 관리자가 아닌 모든 사용자

    if (deleteError) {
      console.error('🔍 RESET ROLES - Failed to delete roles:', deleteError)
      return NextResponse.json({ error: 'Failed to reset roles' }, { status: 500 })
    }

    // 관리자 역할 확인 및 생성
    const { data: adminRole, error: adminCheckError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (adminCheckError || !adminRole) {
      // 관리자 역할 생성
      const { error: adminInsertError } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'admin' })

      if (adminInsertError) {
        console.error('🔍 RESET ROLES - Failed to create admin role:', adminInsertError)
      } else {
        console.log('🔍 RESET ROLES - Admin role created')
      }
    }

    console.log('🔍 RESET ROLES - All non-admin roles reset successfully')

    return NextResponse.json({
      success: true,
      message: 'All non-admin user roles have been reset'
    })
  } catch (error) {
    console.error('🔍 RESET ROLES - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}