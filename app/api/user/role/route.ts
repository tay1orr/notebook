import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const adminSupabase = createAdminClient()

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
    const { data: existingRole, error: selectError } = await adminSupabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    console.log('🔍 API - Existing role check:', { existingRole, selectError })

    // 담임교사는 승인 대기 상태로, 학생은 바로 활성화
    const finalRole = role === 'homeroom' ? 'student' : role // 담임교사는 일단 학생으로 설정
    const isPending = role === 'homeroom' // 담임교사 신청인지 확인

    console.log('🔍 API - Saving role:', finalRole, isPending ? '(homeroom pending)' : '')

    if (existingRole) {
      // 기존 역할 업데이트
      console.log('🔍 API - Updating existing role for user:', user.id)
      const { error: updateError } = await adminSupabase
        .from('user_roles')
        .update({ role: finalRole })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('🔍 API - Role update error:', updateError)
        return NextResponse.json({ error: 'Failed to update role', details: updateError }, { status: 500 })
      }
    } else {
      // 새 역할 생성
      console.log('🔍 API - Creating new role for user:', user.id, 'role:', finalRole)
      const { error: insertError } = await adminSupabase
        .from('user_roles')
        .insert({ user_id: user.id, role: finalRole })

      if (insertError) {
        console.error('🔍 API - Role insert error:', insertError)
        return NextResponse.json({ error: 'Failed to create role', details: insertError }, { status: 500 })
      }
    }

    // 학급 정보를 user 메타데이터에 저장
    if ((role === 'student' || role === 'homeroom') && grade && className) {
      console.log('🔍 API - Saving class info to user metadata:', { grade, className, studentNo })

      try {
        const classInfo: any = {
          grade: parseInt(grade),
          class: parseInt(className)
        }

        if (role === 'student' && studentNo) {
          classInfo.student_no = parseInt(studentNo)
        }

        // Supabase auth user 메타데이터에 학급 정보와 승인 상태 저장
        const metadata: any = {
          ...user.user_metadata,
          class_info: classInfo
        }

        // 담임교사 신청인 경우 승인 대기 상태 추가
        if (isPending) {
          metadata.pending_homeroom = {
            requested_at: new Date().toISOString(),
            status: 'pending'
          }
        }

        const { error: metadataError } = await adminSupabase.auth.admin.updateUserById(
          user.id,
          { user_metadata: metadata }
        )

        if (metadataError) {
          console.log('🔍 API - Metadata save failed (ignoring):', metadataError.message)
        } else {
          console.log('🔍 API - Class info saved to user metadata successfully')
        }
      } catch (classError) {
        console.log('🔍 API - Class info save attempt failed (ignoring):', classError)
      }
    }

    console.log('🔍 API - Role update successful for:', user.email)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('🔍 API - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}