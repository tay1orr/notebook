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

        console.log('🔍 USERS API - Role lookup for user:', {
          email: authUser.email,
          userId: authUser.id,
          roleFound: !!roleData,
          role: roleData?.role,
          roleError: roleError?.message
        })

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
      // 담임교사의 학급 정보를 직접 조회 (메타데이터에서 가져올 수 없는 경우 대비)
      let teacherGrade = currentUser.grade
      let teacherClass = currentUser.class

      // 메타데이터에서 학급 정보를 가져올 수 없는 경우, 이메일에서 추출 시도
      if (!teacherGrade || !teacherClass) {
        console.log('🔍 USERS API - Teacher grade/class is null, trying to extract from email:', currentUser.email)

        // 이메일에서 학급 정보 추출 시도 (예: kko92-coding1@도메인 -> 3학년 1반으로 추정)
        const emailPrefix = currentUser.email.split('@')[0]
        console.log('🔍 USERS API - Email prefix:', emailPrefix)

        // 일단 임시로 담임교사 본인만 보이도록 설정 (나중에 실제 학급 정보로 수정 필요)
        teacherGrade = '3'  // 임시값
        teacherClass = '1'  // 임시값

        console.log('🔍 USERS API - Using temporary grade/class for homeroom teacher:', {
          email: currentUser.email,
          tempGrade: teacherGrade,
          tempClass: teacherClass
        })
      }

      console.log('🔍 USERS API - Filtering for homeroom teacher:', {
        teacherGrade,
        teacherClass,
        totalUsers: usersWithRoles.length,
        userSample: usersWithRoles.slice(0, 3).map(u => ({
          email: u.email,
          role: u.role,
          grade: u.grade,
          class: u.class
        }))
      })

      filteredUsers = usersWithRoles.filter(user => {
        // 본인은 항상 포함
        if (user.id === currentUser.id) {
          return true
        }

        // 자기 학급 학생들만 포함 (helper도 포함)
        const teacherGradeInt = parseInt(teacherGrade || '0')
        const teacherClassInt = parseInt(teacherClass || '0')
        const isSameClass = user.grade === teacherGradeInt && user.class === teacherClassInt
        const isStudentOrHelper = user.role === 'student' || user.role === '' || user.role === 'helper'

        const shouldInclude = isSameClass && isStudentOrHelper

        console.log('🔍 USERS API - User filter check:', {
          email: user.email,
          userGrade: user.grade,
          userClass: user.class,
          userRole: user.role,
          teacherGrade: teacherGradeInt,
          teacherClass: teacherClassInt,
          isSameClass,
          isStudentOrHelper,
          shouldInclude
        })

        return shouldInclude
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