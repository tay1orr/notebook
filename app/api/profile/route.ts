import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
  try {
    const supabase = createServerClient()
    const adminSupabase = createAdminClient()
    const { name, role, grade, class: studentClass, studentNo, pendingApproval } = await request.json()

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 PROFILE API - Updating profile for:', user.email, {
      name, role, grade, class: studentClass, studentNo, pendingApproval
    })

    // 이름 업데이트 (user metadata)
    if (name && name !== user.user_metadata?.name) {
      const { error: nameError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          name: name
        }
      })

      if (nameError) {
        console.error('🔍 PROFILE API - Failed to update name:', nameError)
        return NextResponse.json({ error: 'Failed to update name' }, { status: 500 })
      }
    }

    // 승인이 필요한 역할인지 확인
    const needsApproval = pendingApproval && (role === 'homeroom' || role === 'helper')

    if (needsApproval) {
      // 승인이 필요한 경우: 실제 역할은 student로 유지하고 승인 대기 정보만 저장
      console.log('🔍 PROFILE API - Role change requires approval, keeping student role')

      // 1. 역할은 student로 유지
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
          role: 'student'
        }, { onConflict: 'user_id' })

      if (roleError) {
        console.error('🔍 PROFILE API - Failed to update role:', roleError)
        return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
      }

      // 2. 승인 대기 정보를 user metadata에 저장
      const pendingInfo = {
        pending_homeroom: role === 'homeroom' ? {
          status: 'pending',
          requested_role: role,
          requested_at: new Date().toISOString(),
          class_info: grade && studentClass ? { grade: parseInt(grade), class: parseInt(studentClass) } : {}
        } : undefined,
        pending_helper: role === 'helper' ? {
          status: 'pending',
          requested_role: role,
          requested_at: new Date().toISOString()
        } : undefined
      }

      const updatedMetadata = {
        ...user.user_metadata,
        name: name || user.user_metadata?.name,
        ...pendingInfo
      }

      const { error: metadataError } = await adminSupabase.auth.admin.updateUserById(
        user.id,
        { user_metadata: updatedMetadata }
      )

      if (metadataError) {
        console.error('🔍 PROFILE API - Failed to update metadata:', metadataError)
        return NextResponse.json({ error: 'Failed to save approval request' }, { status: 500 })
      }

    } else {
      // 승인이 필요 없는 경우: 바로 역할 업데이트
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
    }

    // 학생 정보 업데이트 (학생 또는 담임교사인 경우)
    if ((role === 'student' || role === 'homeroom') && grade && studentClass) {
      // students 테이블에 정보 저장/업데이트
      const studentData: any = {
        user_id: user.id,
        name: name || user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
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