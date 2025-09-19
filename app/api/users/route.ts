import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServerClient()

    // 현재 사용자가 관리자인지 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 USERS API - Request from:', user.email)

    // Get all users from auth.users table
    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('🔍 USERS API - Failed to fetch users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    console.log('🔍 USERS API - Auth users count:', data.users.length)

    // Transform users to include role information from user_roles table
    const usersWithRoles = await Promise.all(
      data.users.map(async (authUser) => {
        // Get role from user_roles table
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', authUser.id)
          .single()

        if (roleError) {
          console.log('🔍 USERS API - No role found for user:', authUser.email, roleError.message)
        }

        const role = roleData?.role || ''
        console.log('🔍 USERS API - User role:', authUser.email, '->', role)

        return {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unknown',
          role: role,
          createdAt: new Date(authUser.created_at).toLocaleDateString('ko-KR'),
          lastLogin: authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleDateString('ko-KR') : null,
        }
      })
    )

    console.log('🔍 USERS API - Final users with roles:', usersWithRoles.map(u => ({ email: u.email, role: u.role })))

    return NextResponse.json({ users: usersWithRoles })
  } catch (error) {
    console.error('🔍 USERS API - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createServerClient()
    const { userId, role } = await request.json()

    // 현재 사용자가 관리자인지 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.email !== 'taylorr@gclass.ice.go.kr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('🔍 USERS API - PATCH - Updating role:', userId, '->', role)

    // Update or insert user role
    const { error } = await supabase
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