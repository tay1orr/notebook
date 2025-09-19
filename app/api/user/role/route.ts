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

    // user_roles 테이블에 역할 저장/업데이트 (role_data 없이 기본 방식)
    const { data: existingRole, error: selectError } = await adminSupabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    console.log('🔍 API - Existing role check:', { existingRole, selectError })

    if (existingRole) {
      // 기존 역할 업데이트
      console.log('🔍 API - Updating existing role for user:', user.id)
      const { error: updateError } = await adminSupabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('🔍 API - Role update error:', updateError)
        return NextResponse.json({ error: 'Failed to update role', details: updateError }, { status: 500 })
      }
    } else {
      // 새 역할 생성
      console.log('🔍 API - Creating new role for user:', user.id, 'role:', role)
      const { error: insertError } = await adminSupabase
        .from('user_roles')
        .insert({ user_id: user.id, role })

      if (insertError) {
        console.error('🔍 API - Role insert error:', insertError)
        return NextResponse.json({ error: 'Failed to create role', details: insertError }, { status: 500 })
      }
    }

    // 학급 정보를 간단한 방법으로 저장 - 별도 테이블 없이 user 메타데이터에 저장
    if ((role === 'student' || role === 'homeroom') && grade && className) {
      const classInfo = {
        grade: parseInt(grade),
        class: parseInt(className)
      }
      if (role === 'student' && studentNo) {
        classInfo.student_no = parseInt(studentNo)
      }

      console.log('🔍 API - Saving class info:', classInfo)

      // 우선 역할만 저장하고 학급 정보는 프로필에서 별도 처리
      console.log('🔍 API - Class info will be handled separately')
    }

    console.log('🔍 API - Role update successful for:', user.email)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('🔍 API - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}