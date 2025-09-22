import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { UserRole } from '@/types/common'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  class_id: string | null
  grade?: string
  class?: string
  studentNo?: string
  pendingHomeroom?: boolean
  isApprovedHomeroom?: boolean
}

// API 라우트에서만 사용할 getCurrentUser (리다이렉트 없음)
export async function getCurrentUserForAPI(): Promise<AuthUser | null> {
  try {
    console.log('🔍 API AUTH - Getting user for API')

    const cookieStore = cookies()
    const supabase = createServerClient()
    const adminSupabase = createAdminClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    console.log('🔍 API AUTH - Supabase user check:', { hasUser: !!user, error })

    if (!user || error) {
      console.log('🔍 API AUTH - No user found or error:', error)
      return null
    }

    // Get user role from user_roles table using admin client
    let role: UserRole = ''
    let grade: string | undefined
    let className: string | undefined
    let studentNo: string | undefined

    console.log('🔍 API AUTH - Checking role for user:', user.email, 'ID:', user.id)

    try {
      const { data: roleData, error: roleSelectError } = await adminSupabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      console.log('🔍 API AUTH - Role query result:', roleData, 'Error:', roleSelectError)

      if (roleData?.role) {
        role = roleData.role
        console.log('🔍 API AUTH - Found role:', role)
      } else {
        // Check if admin email
        const adminEmail = process.env.ADMIN_EMAIL || 'taylorr@gclass.ice.go.kr'
        if (user.email === adminEmail) {
          role = 'admin'
          console.log('🔍 API AUTH - Setting admin role for:', user.email)
        }
      }

      // Get class info from metadata
      if (user.user_metadata?.class_info) {
        const classInfo = user.user_metadata.class_info
        if (classInfo.grade) grade = classInfo.grade.toString()
        if (classInfo.class) className = classInfo.class.toString()
        if (classInfo.student_no) studentNo = classInfo.student_no.toString()
      }
    } catch (roleError) {
      console.error('🔍 API AUTH - Role lookup error:', roleError)
      // Fallback to admin check
      const adminEmail = process.env.ADMIN_EMAIL || 'taylorr@gclass.ice.go.kr'
      if (user.email === adminEmail) {
        role = 'admin'
      }
    }

    console.log('🔍 API AUTH - Final user for API:', {
      email: user.email,
      role,
      hasClassInfo: !!(grade || className || studentNo)
    })

    return {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name || user.email!.split('@')[0],
      role,
      class_id: null,
      grade,
      class: className,
      studentNo,
      pendingHomeroom: user.user_metadata?.pending_homeroom?.status === 'pending',
      isApprovedHomeroom: user.user_metadata?.approved_homeroom === true
    }
  } catch (error) {
    console.error('🔍 API AUTH - Error getting user for API:', error)
    return null
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = createServerClient()
    const adminSupabase = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    // Get user role and class info from user_roles table using admin client
    let role: UserRole = ''
    let grade: string | undefined
    let className: string | undefined
    let studentNo: string | undefined
    console.log('🔍 AUTH DEBUG - Checking user:', user.email, 'ID:', user.id)

    try {
      // 먼저 기본 role만 조회
      const { data: roleData, error: roleSelectError } = await adminSupabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      console.log('🔍 AUTH DEBUG - Role data from DB:', roleData, 'Error:', roleSelectError)

      if (roleData?.role) {
        role = roleData.role
        console.log('🔍 AUTH DEBUG - Found existing role:', roleData.role, 'for user:', user.email)
      } else {
        console.log('🔍 AUTH DEBUG - No existing role found for:', user.email)
        // Default admin for specific email
        const adminEmail = process.env.ADMIN_EMAIL || 'taylorr@gclass.ice.go.kr'
        if (user.email === adminEmail) {
          role = 'admin'
          console.log('🔍 AUTH DEBUG - Setting admin role for:', user.email)
          // 관리자 역할 생성
          const { error: insertError } = await adminSupabase
            .from('user_roles')
            .insert({ user_id: user.id, role: 'admin' })
          console.log('🔍 AUTH DEBUG - Admin insert result:', insertError)
        }
      }

      // 학급 정보를 user 메타데이터에서 가져오기 (역할과 상관없이 항상 체크)
      console.log('🔍 AUTH DEBUG - Full user metadata:', JSON.stringify(user.user_metadata, null, 2))

      if (user.user_metadata?.class_info) {
        const classInfo = user.user_metadata.class_info
        console.log('🔍 AUTH DEBUG - Class info object:', JSON.stringify(classInfo, null, 2))

        if (classInfo.grade) grade = classInfo.grade.toString()
        if (classInfo.class) className = classInfo.class.toString()
        if (classInfo.student_no) studentNo = classInfo.student_no.toString()
        console.log('🔍 AUTH DEBUG - Found class info from metadata:', { grade, className, studentNo })
      } else {
        console.log('🔍 AUTH DEBUG - No class info found in user metadata')
        console.log('🔍 AUTH DEBUG - Available metadata keys:', Object.keys(user.user_metadata || {}))
      }
    } catch (roleError) {
      console.log('🔍 AUTH DEBUG - Role lookup failed:', roleError)
      // Fallback to admin check
      const adminEmail = process.env.ADMIN_EMAIL || 'taylorr@gclass.ice.go.kr'
      if (user.email === adminEmail) {
        role = 'admin'
      }
    }

    console.log('🔍 AUTH DEBUG - Final role for', user.email, ':', role, 'Class info:', {
      grade,
      class: className,
      studentNo
    })

    // 담임교사 승인 상태 확인
    const pendingHomeroom = user.user_metadata?.pending_homeroom?.status === 'pending'
    const approvedHomeroom = user.user_metadata?.approved_homeroom === true

    console.log('🔍 AUTH DEBUG - Homeroom status:', {
      pendingHomeroom,
      approvedHomeroom,
      metadata: user.user_metadata
    })

    return {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name || user.email!.split('@')[0],
      role,
      class_id: null,
      grade,
      class: className,
      studentNo,
      pendingHomeroom,
      isApprovedHomeroom: approvedHomeroom
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth')
  }

  // 역할이 없는 사용자는 역할 선택 페이지로 리다이렉트
  if (!user.role || user.role === '') {
    redirect('/setup')
  }

  return user
}

export async function requireRole(allowedRoles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth()

  if (!allowedRoles.includes(user.role)) {
    redirect('/unauthorized')
  }

  return user
}

export async function requireApprovedHomeroom(allowedRoles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth()

  // 담임교사인 경우 승인 여부 확인
  if (user.role === 'homeroom' && !user.isApprovedHomeroom) {
    redirect('/unauthorized')
  }

  if (!allowedRoles.includes(user.role)) {
    redirect('/unauthorized')
  }

  return user
}

export async function requireAuthWithoutRole(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth')
  }

  return user
}

export function isAllowedDomain(email: string): boolean {
  const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN || 'gclass.ice.go.kr'
  const domain = email.split('@')[1]
  return domain === allowedDomain
}

export function hasPermission(userRole: UserRole, action: string, resource?: string): boolean {
  const permissions: Record<UserRole, string[]> = {
    admin: ['*'],
    homeroom: [
      'loans:read',
      'loans:create',
      'loans:update',
      'students:read',
      'students:create',
      'students:update',
      'devices:read',
      'devices:update',
      'dashboard:read'
    ],
    helper: [
      'loans:read',
      'loans:create',
      'loans:update',
      'loans:approve',
      'students:read',
      'devices:read',
      'dashboard:read'
    ],
    teacher: [
      'loans:read',
      'students:read',
      'devices:read',
      'dashboard:read'
    ],
    student: [
      'loans:read_own',
      'dashboard:read_limited'
    ]
  }

  const userPermissions = permissions[userRole] || []

  if (userPermissions.includes('*')) {
    return true
  }

  return userPermissions.includes(action)
}

export async function signInWithGoogle() {
  const supabase = createServerClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://notebook-two-pink.vercel.app'}/auth/callback`,
      queryParams: {
        hd: process.env.NEXT_PUBLIC_ALLOWED_DOMAIN || 'gclass.ice.go.kr' // Google Workspace domain restriction
      }
    }
  })

  if (error) {
    throw error
  }

  return data
}

export async function signOut() {
  const supabase = createServerClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

// 사용자 역할 확인을 위한 헬퍼 함수들
export function isAdmin(user: AuthUser): boolean {
  return user.role === 'admin'
}

export function isHomeroom(user: AuthUser): boolean {
  return user.role === 'homeroom'
}

export function isHelper(user: AuthUser): boolean {
  return user.role === 'helper'
}

export function isTeacher(user: AuthUser): boolean {
  return user.role === 'teacher'
}

export function isStudent(user: AuthUser): boolean {
  return user.role === 'student'
}

export function isStaff(user: AuthUser): boolean {
  return ['admin', 'homeroom', 'helper', 'teacher'].includes(user.role)
}

export function canApproveLoans(user: AuthUser): boolean {
  return ['admin', 'helper'].includes(user.role)
}

export function canManageStudents(user: AuthUser): boolean {
  return ['admin', 'homeroom', 'helper'].includes(user.role)
}

export function canManageDevices(user: AuthUser): boolean {
  return ['admin', 'homeroom'].includes(user.role)
}