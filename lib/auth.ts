import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { UserRole } from '@/types/common'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole | ''
  class_id: string | null
  grade?: string
  class?: string
  studentNo?: string
  pendingHomeroom?: boolean
  pendingApproval?: boolean
  pendingRole?: string
  isApprovedHomeroom?: boolean
}

// API 라우트에서만 사용할 getCurrentUser (리다이렉트 없음)
export async function getCurrentUserForAPI(): Promise<AuthUser | null> {
  try {
    const supabase = createServerClient()
    const adminSupabase = createAdminClient()

    const { data: { user }, error } = await supabase.auth.getUser()

    if (!user || error) {
      return null
    }

    let role: UserRole | '' = ''
    let grade: string | undefined
    let className: string | undefined
    let studentNo: string | undefined

    try {
      const { data: roleData } = await adminSupabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (roleData?.role) {
        role = roleData.role
      } else {
        const adminEmail = process.env.ADMIN_EMAIL || 'taylorr@gclass.ice.go.kr'
        if (user.email === adminEmail) {
          role = 'admin'
        }
      }

      if (user.user_metadata?.class_info) {
        const classInfo = user.user_metadata.class_info
        if (classInfo.grade) grade = classInfo.grade.toString()
        if (classInfo.class) className = classInfo.class.toString()
        if (classInfo.student_no) studentNo = classInfo.student_no.toString()
      }
    } catch (roleError) {
      const adminEmail = process.env.ADMIN_EMAIL || 'taylorr@gclass.ice.go.kr'
      if (user.email === adminEmail) {
        role = 'admin'
      }
    }

    const pendingHomeroom = user.user_metadata?.pending_homeroom?.status === 'pending'
    const pendingHelper = user.user_metadata?.pending_helper?.status === 'pending'
    const approvedHomeroom = user.user_metadata?.approved_homeroom === true

    let pendingApproval = false
    let pendingRole = undefined

    if (pendingHomeroom) {
      pendingApproval = true
      pendingRole = 'homeroom'
    } else if (pendingHelper) {
      pendingApproval = true
      pendingRole = 'helper'
    }

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
      pendingApproval,
      pendingRole,
      isApprovedHomeroom: approvedHomeroom
    }
  } catch (error) {
    console.error('Error getting user for API:', error)
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

    let role: UserRole | '' = ''
    let grade: string | undefined
    let className: string | undefined
    let studentNo: string | undefined

    try {
      const { data: roleData } = await adminSupabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (roleData?.role) {
        role = roleData.role
      } else {
        const adminEmail = process.env.ADMIN_EMAIL || 'taylorr@gclass.ice.go.kr'
        if (user.email === adminEmail) {
          role = 'admin'
          await adminSupabase
            .from('user_roles')
            .insert({ user_id: user.id, role: 'admin' })
        }
      }

      if (user.user_metadata?.class_info) {
        const classInfo = user.user_metadata.class_info
        if (classInfo.grade) grade = classInfo.grade.toString()
        if (classInfo.class) className = classInfo.class.toString()
        if (classInfo.student_no) studentNo = classInfo.student_no.toString()
      }
    } catch (roleError) {
      const adminEmail = process.env.ADMIN_EMAIL || 'taylorr@gclass.ice.go.kr'
      if (user.email === adminEmail) {
        role = 'admin'
      }
    }

    const pendingHomeroom = user.user_metadata?.pending_homeroom?.status === 'pending'
    const pendingHelper = user.user_metadata?.pending_helper?.status === 'pending'
    const approvedHomeroom = user.user_metadata?.approved_homeroom === true

    let pendingApproval = false
    let pendingRole = undefined

    if (pendingHomeroom) {
      pendingApproval = true
      pendingRole = 'homeroom'
    } else if (pendingHelper) {
      pendingApproval = true
      pendingRole = 'helper'
    }

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
      pendingApproval,
      pendingRole,
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

  if (!user.role || !allowedRoles.includes(user.role as UserRole)) {
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

  if (!user.role || !allowedRoles.includes(user.role as UserRole)) {
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

export function hasPermission(userRole: UserRole | '', action: string, resource?: string): boolean {
  const permissions: Record<UserRole | '', string[]> = {
    '': [],
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
    manager: [
      'users:write',
      'loans:write',
      'devices:write',
      'students:write',
      'approvals:write',
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

  const userPermissions = permissions[userRole as UserRole | ''] || []

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

export function isManager(user: AuthUser): boolean {
  return user.role === 'manager'
}

export function isStudent(user: AuthUser): boolean {
  return user.role === 'student'
}

export function isStaff(user: AuthUser): boolean {
  return ['admin', 'manager', 'homeroom', 'helper'].includes(user.role)
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