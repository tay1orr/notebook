import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  try {
    const supabase = createServerClient()
    const { role, grade, class: studentClass, studentNo } = await request.json()

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 PROFILE API - Updating profile for:', user.email, {
      role, grade, class: studentClass, studentNo
    })

    // 사용자 역할 업데이트
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role: role
      }, { onConflict: 'user_id' })

    if (roleError) {
      console.error('🔍 PROFILE API - Failed to update role:', roleError)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    // 학생 정보 업데이트 (학생 또는 담임교사인 경우)
    if ((role === 'student' || role === 'homeroom') && grade && studentClass) {
      // students 테이블에 정보 저장/업데이트
      const studentData: any = {
        user_id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
        email: user.email,
        grade: parseInt(grade),
        class: parseInt(studentClass),
        created_at: new Date().toISOString()
      }

      if (role === 'student' && studentNo) {
        studentData.student_no = parseInt(studentNo)
      }

      const { error: studentError } = await supabase
        .from('students')
        .upsert(studentData, { onConflict: 'user_id' })

      if (studentError) {
        console.error('🔍 PROFILE API - Failed to update student info:', studentError)
        // 역할은 성공했으므로 경고만 출력하고 계속 진행
        console.warn('🔍 PROFILE API - Role updated but student info failed')
      }
    }

    console.log('🔍 PROFILE API - Profile updated successfully')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('🔍 PROFILE API - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}