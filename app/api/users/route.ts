import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const adminSupabase = createAdminClient()

    // 현재 사용자 정보 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 USERS API - Request from:', currentUser.email, 'Role:', currentUser.role)

    // 권한 확인: 관리자, 관리팀, 담임교사만 사용자 목록 조회 가능
    if (!['admin', 'manager', 'homeroom'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get all users from auth.users table using admin client
    const { data, error } = await adminSupabase.auth.admin.listUsers()

    if (error) {
      console.error('🔍 USERS API - Failed to fetch users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    console.log('🔍 USERS API - Auth users count:', data.users.length)

    // Transform users to include role and profile information
    const usersWithRoles = await Promise.all(
      data.users.map(async (authUser) => {
        // Get role from user_roles table
        const { data: roleData, error: roleError } = await adminSupabase
          .from('user_roles')
          .select('role')
          .eq('user_id', authUser.id)
          .single()

        // Get profile information (grade, class)
        const { data: profileData } = await adminSupabase
          .from('user_profiles')
          .select('grade, class')
          .eq('user_id', authUser.id)
          .single()

        const role = roleData?.role || ''
        const grade = profileData?.grade || null
        const classNum = profileData?.class || null

        return {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unknown',
          role: role,
          grade: grade,
          class: classNum,
          createdAt: new Date(authUser.created_at).toLocaleDateString('ko-KR'),
          lastLogin: authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleDateString('ko-KR') : null,
        }
      })
    )

    // 담임교사인 경우 본인과 자기 학급 학생들만 필터링
    let filteredUsers = usersWithRoles
    if (currentUser.role === 'homeroom' && currentUser.isApprovedHomeroom) {
      console.log('🔍 USERS API - Filtering for homeroom teacher:', currentUser.grade, currentUser.class)

      filteredUsers = usersWithRoles.filter(user => {
        // 본인은 항상 포함
        if (user.id === currentUser.id) {
          return true
        }

        // 자기 학급 학생들만 포함
        const isSameClass = user.grade === parseInt(currentUser.grade) && user.class === parseInt(currentUser.class)
        const isStudent = user.role === 'student' || user.role === ''

        console.log('🔍 USERS API - User filter check:', {
          email: user.email,
          userGrade: user.grade,
          userClass: user.class,
          teacherGrade: parseInt(currentUser.grade),
          teacherClass: parseInt(currentUser.class),
          isSameClass,
          isStudent,
          included: isSameClass && isStudent
        })

        return isSameClass && isStudent
      })

      console.log('🔍 USERS API - Filtered users for homeroom:', filteredUsers.length)
    }

    console.log('🔍 USERS API - Final users:', filteredUsers.map(u => ({ email: u.email, role: u.role, grade: u.grade, class: u.class })))

    return NextResponse.json({ users: filteredUsers })
  } catch (error) {
    console.error('🔍 USERS API - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const adminSupabase = createAdminClient()
    const { userId, role } = await request.json()

    // 현재 사용자 정보 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 관리자와 관리팀만 역할 수정 가능
    if (!['admin', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('🔍 USERS API - PATCH - Updating role:', userId, '->', role)

    // Update or insert user role using admin client
    const { error } = await adminSupabase
      .from('user_roles')
      .upsert({ user_id: userId, role }, { onConflict: 'user_id' })

    if (error) {
      console.error('🔍 USERS API - PATCH - Failed to update user role:', error)
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 })
    }

    console.log('🔍 USERS API - PATCH - Role updated successfully')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('🔍 USERS API - PATCH - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}