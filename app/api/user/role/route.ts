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

    // user_roles 테이블에 역할 저장/업데이트
    const { data: existingRole, error: selectError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    console.log('🔍 API - Existing role check:', { existingRole, selectError })

    if (existingRole) {
      // 기존 역할 업데이트
      console.log('🔍 API - Updating existing role for user:', user.id)
      const { error: updateError } = await supabase
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
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role })

      if (insertError) {
        console.error('🔍 API - Role insert error:', insertError)
        return NextResponse.json({ error: 'Failed to create role', details: insertError }, { status: 500 })
      }
    }

    // 학생 정보 저장 (학생 또는 담임교사인 경우)
    if ((role === 'student' || role === 'homeroom') && grade && className) {
      const studentData: any = {
        user_id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
        email: user.email,
        grade: parseInt(grade),
        class: parseInt(className),
        created_at: new Date().toISOString()
      }

      if (role === 'student' && studentNo) {
        studentData.student_no = parseInt(studentNo)
      }

      console.log('🔍 API - Saving student data:', studentData)

      const { error: studentError } = await supabase
        .from('students')
        .upsert(studentData, { onConflict: 'user_id' })

      if (studentError) {
        console.error('🔍 API - Failed to save student info:', studentError)
        // 역할은 성공했으므로 경고만 출력하고 계속 진행
        console.warn('🔍 API - Role saved but student info failed')
      } else {
        console.log('🔍 API - Student info saved successfully')
      }
    }

    console.log('🔍 API - Role update successful for:', user.email)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('🔍 API - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}