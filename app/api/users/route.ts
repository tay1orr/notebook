import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'

export async function GET() {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })

    // Get all users from auth.users table
    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('Failed to fetch users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Transform users to include role information from user_roles table
    const usersWithRoles = await Promise.all(
      data.users.map(async (user) => {
        // Get role from user_roles table
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single()

        return {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
          role: roleData?.role || 'student',
          createdAt: new Date(user.created_at).toLocaleDateString('ko-KR'),
          lastLogin: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('ko-KR') : null,
        }
      })
    )

    return NextResponse.json({ users: usersWithRoles })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })
    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Update or insert user role
    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role }, { onConflict: 'user_id' })

    if (error) {
      console.error('Failed to update user role:', error)
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}