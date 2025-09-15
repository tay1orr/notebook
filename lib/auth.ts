import { createServerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export type UserRole = 'admin' | 'homeroom' | 'helper' | 'teacher' | 'student'

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

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error || !userData) {
      return null
    }

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      class_id: userData.class_id
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

  return user
}

export async function requireRole(allowedRoles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth()

  if (!allowedRoles.includes(user.role)) {
    redirect('/unauthorized')
  }

  return user
}

export function isAllowedDomain(email: string): boolean {
  const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN
  if (!allowedDomain) return true

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
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      queryParams: {
        hd: process.env.NEXT_PUBLIC_ALLOWED_DOMAIN // Google Workspace domain restriction
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