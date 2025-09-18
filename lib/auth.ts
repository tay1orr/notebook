import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export type UserRole = 'admin' | 'homeroom' | 'helper' | 'teacher' | 'student' | ''

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  class_id: string | null
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createServerClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    // Get user role from user_roles table
    let role: UserRole = ''
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (roleData?.role) {
        // 관리자가 아닌 모든 사용자의 역할을 강제 초기화
        if (user.email === 'taylorr@gclass.ice.go.kr') {
          role = 'admin'
          // 관리자 역할이 없으면 생성
          if (roleData.role !== 'admin') {
            await supabase
              .from('user_roles')
              .update({ role: 'admin' })
              .eq('user_id', user.id)
          }
        } else {
          // 비관리자 사용자 역할을 데이터베이스에서 삭제
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', user.id)
          role = '' // 모든 비관리자 사용자 역할 초기화
        }
      } else {
        // Default admin for specific email
        if (user.email === 'taylorr@gclass.ice.go.kr') {
          role = 'admin'
          // 관리자 역할 생성
          await supabase
            .from('user_roles')
            .insert({ user_id: user.id, role: 'admin' })
        }
      }
    } catch (roleError) {
      console.log('Role lookup failed, using default:', roleError)
      // Fallback to admin check
      if (user.email === 'taylorr@gclass.ice.go.kr') {
        role = 'admin'
      }
    }

    return {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name || user.email!.split('@')[0],
      role,
      class_id: null
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

export async function requireAuthWithoutRole(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth')
  }

  return user
}

export function isAllowedDomain(email: string): boolean {
  const allowedDomain = 'gclass.ice.go.kr' // 하드코딩으로 확실하게
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
      redirectTo: `https://notebook-two-pink.vercel.app/auth/callback`,
      queryParams: {
        hd: process.env.NEXT_PUBLIC_ALLOWED_DOMAIN || 'ichungjungsan.kr' // Google Workspace domain restriction
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