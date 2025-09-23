import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServerClient()
    const adminSupabase = createAdminClient()

    // 현재 사용자가 관리자 또는 담임교사인지 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 역할 확인
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const currentRole = userRole?.role || 'student'
    const isAdmin = user.email === 'taylorr@gclass.ice.go.kr'
    const isHomeroom = currentRole === 'homeroom'

    if (!isAdmin && !isHomeroom) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 PENDING APPROVALS - User confirmed:', user.email, 'Role:', currentRole)

    // 모든 사용자를 가져와서 승인 대기 상태인 사용자 필터링
    const { data: allUsers, error: usersError } = await adminSupabase.auth.admin.listUsers()

    if (usersError) {
      console.error('🔍 PENDING APPROVALS - Failed to fetch users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // 승인 대기 중인 사용자들 필터링 (담임교사 + 노트북 관리 도우미)
    const pendingUsers = allUsers.users.filter(user => {
      const homeroomPending = user.user_metadata?.pending_homeroom?.status === 'pending'
      const helperPending = user.user_metadata?.pending_helper?.status === 'pending'
      return homeroomPending || helperPending
    }).map(user => {
      const homeroomPending = user.user_metadata?.pending_homeroom?.status === 'pending'
      const helperPending = user.user_metadata?.pending_helper?.status === 'pending'

      let requestedRole = 'student'
      let classInfo = {}
      let requestedAt = null

      if (homeroomPending) {
        requestedRole = 'homeroom'
        classInfo = user.user_metadata?.class_info || {}
        requestedAt = user.user_metadata?.pending_homeroom?.requested_at
      } else if (helperPending) {
        requestedRole = 'helper'
        classInfo = user.user_metadata?.class_info || {}
        requestedAt = user.user_metadata?.pending_helper?.requested_at
      }

      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || '',
        class_info: classInfo,
        requested_role: requestedRole,
        requested_at: requestedAt,
        created_at: user.created_at
      }
    })

    // 담임교사인 경우 자신의 반 승인 요청만 필터링
    let filteredUsers = pendingUsers
    if (isHomeroom && !isAdmin) {
      // 담임교사 본인의 학급 정보 가져오기 - user 메타데이터에서 class_info 확인
      const teacherClassInfo = user.user_metadata?.class_info

      if (teacherClassInfo?.grade && teacherClassInfo?.class) {
        const teacherClass = `${teacherClassInfo.grade}-${teacherClassInfo.class}`
        filteredUsers = pendingUsers.filter(pendingUser => {
          const userClassInfo = pendingUser.class_info as any
          const userClass = userClassInfo?.grade && userClassInfo?.class
            ? `${userClassInfo.grade}-${userClassInfo.class}`
            : ''
          return userClass === teacherClass
        })
      }
    }

    console.log('🔍 PENDING APPROVALS - Found pending users:', filteredUsers.length)

    return NextResponse.json({
      success: true,
      pendingUsers: filteredUsers,
      count: filteredUsers.length
    })

  } catch (error) {
    console.error('🔍 PENDING APPROVALS - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const adminSupabase = createAdminClient()

    // 현재 사용자가 관리자 또는 담임교사인지 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 역할 확인
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const currentRole = userRole?.role || 'student'
    const isAdmin = user.email === 'taylorr@gclass.ice.go.kr'
    const isHomeroom = currentRole === 'homeroom'

    if (!isAdmin && !isHomeroom) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, action } = await request.json()

    if (!userId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    console.log('🔍 PENDING APPROVALS - Processing action:', action, 'for user:', userId)

    // 해당 사용자 정보 가져오기
    const { data: targetUser, error: getUserError } = await adminSupabase.auth.admin.getUserById(userId)

    if (getUserError || !targetUser.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = targetUser.user
    const homeroomPending = userData.user_metadata?.pending_homeroom?.status === 'pending'
    const helperPending = userData.user_metadata?.pending_helper?.status === 'pending'

    let targetRole = 'student'
    let metadataKey = ''

    if (homeroomPending) {
      targetRole = 'homeroom'
      metadataKey = 'pending_homeroom'
    } else if (helperPending) {
      targetRole = 'helper'
      metadataKey = 'pending_helper'
    } else {
      return NextResponse.json({ error: 'No pending approval found' }, { status: 400 })
    }

    if (action === 'approve') {
      // 승인: 역할을 변경하고 승인 상태 업데이트

      // 1. user_roles 테이블에서 역할 업데이트
      const { error: roleUpdateError } = await adminSupabase
        .from('user_roles')
        .update({ role: targetRole })
        .eq('user_id', userId)

      if (roleUpdateError) {
        console.error('🔍 PENDING APPROVALS - Role update failed:', roleUpdateError)
        return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
      }

      // 2. 사용자 메타데이터 업데이트
      const updatedMetadata = {
        ...userData.user_metadata,
        [`approved_${targetRole}`]: true,
        [metadataKey]: {
          ...userData.user_metadata?.[metadataKey],
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.email
        }
      }

      const { error: metadataError } = await adminSupabase.auth.admin.updateUserById(
        userId,
        { user_metadata: updatedMetadata }
      )

      if (metadataError) {
        console.error('🔍 PENDING APPROVALS - Metadata update failed:', metadataError)
        return NextResponse.json({ error: 'Failed to update user metadata' }, { status: 500 })
      }

      console.log(`🔍 PENDING APPROVALS - Approved ${targetRole} role for:`, userData.email)

    } else if (action === 'reject') {
      // 거절: 승인 대기 상태만 제거
      const updatedMetadata = {
        ...userData.user_metadata,
        [metadataKey]: {
          ...userData.user_metadata?.[metadataKey],
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: user.email
        }
      }

      const { error: metadataError } = await adminSupabase.auth.admin.updateUserById(
        userId,
        { user_metadata: updatedMetadata }
      )

      if (metadataError) {
        console.error('🔍 PENDING APPROVALS - Rejection metadata update failed:', metadataError)
        return NextResponse.json({ error: 'Failed to update user metadata' }, { status: 500 })
      }

      console.log(`🔍 PENDING APPROVALS - Rejected ${targetRole} role for:`, userData.email)
    }

    return NextResponse.json({ success: true, action, userId, targetRole })

  } catch (error) {
    console.error('🔍 PENDING APPROVALS - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}