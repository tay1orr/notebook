import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/admin-utils'

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
    const isAdmin = isAdminEmail(user.email)
    const isHomeroom = currentRole === 'homeroom'

    if (!isAdmin && !isHomeroom) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 PENDING HOMEROOM - Admin user confirmed:', user.email)

    // 모든 사용자를 가져와서 담임교사 승인 대기 상태인 사용자 필터링
    const { data: allUsers, error: usersError } = await adminSupabase.auth.admin.listUsers()

    if (usersError) {
      console.error('🔍 PENDING HOMEROOM - Failed to fetch users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // 담임교사 승인 대기 중인 사용자들 필터링
    const pendingUsers = allUsers.users.filter(user =>
      user.user_metadata?.pending_homeroom?.status === 'pending'
    ).map(user => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || '',
      class_info: user.user_metadata?.class_info || {},
      requested_at: user.user_metadata?.pending_homeroom?.requested_at,
      created_at: user.created_at
    }))

    console.log('🔍 PENDING HOMEROOM - Found pending users:', pendingUsers.length)

    return NextResponse.json({
      success: true,
      pendingUsers,
      count: pendingUsers.length
    })

  } catch (error) {
    console.error('🔍 PENDING HOMEROOM - Unexpected error:', error)
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
    const isAdmin = isAdminEmail(user.email)
    const isHomeroom = currentRole === 'homeroom'

    if (!isAdmin && !isHomeroom) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, action } = await request.json()

    if (!userId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    console.log('🔍 PENDING HOMEROOM - Processing action:', action, 'for user:', userId)

    // 해당 사용자 정보 가져오기
    const { data: targetUser, error: getUserError } = await adminSupabase.auth.admin.getUserById(userId)

    if (getUserError || !targetUser.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = targetUser.user

    if (action === 'approve') {
      // 승인: 역할을 homeroom으로 변경하고 승인 상태 업데이트

      // 1. user_roles 테이블에서 역할 업데이트
      const { error: roleUpdateError } = await adminSupabase
        .from('user_roles')
        .update({ role: 'homeroom' })
        .eq('user_id', userId)

      if (roleUpdateError) {
        console.error('🔍 PENDING HOMEROOM - Role update failed:', roleUpdateError)
        return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
      }

      // 2. 사용자 메타데이터 업데이트
      const updatedMetadata = {
        ...userData.user_metadata,
        approved_homeroom: true,
        pending_homeroom: {
          ...userData.user_metadata?.pending_homeroom,
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
        console.error('🔍 PENDING HOMEROOM - Metadata update failed:', metadataError)
        return NextResponse.json({ error: 'Failed to update user metadata' }, { status: 500 })
      }

      console.log('🔍 PENDING HOMEROOM - Approved homeroom role for:', userData.email)

    } else if (action === 'reject') {
      // 거절: 승인 대기 상태만 제거
      const updatedMetadata = {
        ...userData.user_metadata,
        pending_homeroom: {
          ...userData.user_metadata?.pending_homeroom,
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
        console.error('🔍 PENDING HOMEROOM - Rejection metadata update failed:', metadataError)
        return NextResponse.json({ error: 'Failed to update user metadata' }, { status: 500 })
      }

      console.log('🔍 PENDING HOMEROOM - Rejected homeroom role for:', userData.email)
    }

    return NextResponse.json({ success: true, action, userId })

  } catch (error) {
    console.error('🔍 PENDING HOMEROOM - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}