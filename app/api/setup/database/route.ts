import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = createServerClient()

    // 현재 사용자가 관리자인지 확인 (임시로 이메일로 확인)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.email !== 'taylorr@gclass.ice.go.kr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 DATABASE SETUP - Creating user_roles table')

    // user_roles 테이블 생성
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.user_roles (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('admin', 'homeroom', 'helper', 'teacher', 'student')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id)
        );

        -- Enable Row Level Security
        ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

        -- Grant permissions
        GRANT ALL ON public.user_roles TO authenticated;
        GRANT USAGE, SELECT ON SEQUENCE user_roles_id_seq TO authenticated;
      `
    })

    if (createError) {
      console.error('🔍 DATABASE SETUP - Error creating table:', createError)
      return NextResponse.json({ error: 'Failed to create table', details: createError }, { status: 500 })
    }

    console.log('🔍 DATABASE SETUP - Table created successfully')

    // 관리자 역할 추가
    const { error: insertError } = await supabase
      .from('user_roles')
      .upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id' })

    if (insertError) {
      console.error('🔍 DATABASE SETUP - Error inserting admin role:', insertError)
    } else {
      console.log('🔍 DATABASE SETUP - Admin role created')
    }

    return NextResponse.json({ success: true, message: 'Database setup completed' })
  } catch (error) {
    console.error('🔍 DATABASE SETUP - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}