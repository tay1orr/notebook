import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role, grade, class: className, studentNo } = await request.json()

    console.log('🔍 API - Role update request:', {
      user: user.email,
      role,
      grade,
      className,
      studentNo
    })

    // 학급 정보를 role_data에 포함시키기
    const roleData = {}
    if ((role === 'student' || role === 'homeroom') && grade && className) {
      roleData.grade = parseInt(grade)
      roleData.class = parseInt(className)
      if (role === 'student' && studentNo) {
        roleData.student_no = parseInt(studentNo)
      }
      roleData.name = user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown'
      roleData.email = user.email
    }

    // user_roles 테이블에 역할 및 추가 데이터 저장/업데이트
    const { data: existingRole, error: selectError } = await adminSupabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    console.log('🔍 API - Existing role check:', { existingRole, selectError })

    const updateData = { role }
    if (Object.keys(roleData).length > 0) {
      updateData.role_data = roleData
    }

    if (existingRole) {
      // 기존 역할 업데이트
      console.log('🔍 API - Updating existing role for user:', user.id, 'with data:', updateData)
      const { error: updateError } = await adminSupabase
        .from('user_roles')
        .update(updateData)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('🔍 API - Role update error:', updateError)
        return NextResponse.json({ error: 'Failed to update role', details: updateError }, { status: 500 })
      }
    } else {
      // 새 역할 생성
      console.log('🔍 API - Creating new role for user:', user.id, 'with data:', updateData)
      const { error: insertError } = await adminSupabase
        .from('user_roles')
        .insert({ user_id: user.id, ...updateData })

      if (insertError) {
        console.error('🔍 API - Role insert error:', insertError)
        return NextResponse.json({ error: 'Failed to create role', details: insertError }, { status: 500 })
      }
    }

    // 학급 정보는 위에서 role_data에 이미 저장했으므로 별도 처리 불필요
    console.log('🔍 API - Student info stored in role_data')

    console.log('🔍 API - Role update successful for:', user.email)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('🔍 API - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}