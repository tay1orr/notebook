import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = createServerClient()

    // 현재 사용자가 관리자인지 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.email !== 'taylorr@gclass.ice.go.kr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔧 DATABASE SETUP - Creating user_roles table for admin:', user.email)

    // SQL 실행을 위한 함수 호출
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- user_roles 테이블 생성
        CREATE TABLE IF NOT EXISTS public.user_roles (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK (role IN ('admin', 'homeroom', 'helper', 'teacher', 'student')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id)
        );

        -- Row Level Security 활성화
        ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

        -- 정책 생성
        DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;
        CREATE POLICY "Users can read their own role" ON public.user_roles
            FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;
        CREATE POLICY "Users can update their own role" ON public.user_roles
            FOR UPDATE USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
        CREATE POLICY "Users can insert their own role" ON public.user_roles
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        -- 권한 부여
        GRANT ALL ON public.user_roles TO authenticated;
        GRANT USAGE, SELECT ON SEQUENCE user_roles_id_seq TO authenticated;
      `
    })

    if (error) {
      console.error('🔧 DATABASE SETUP - RPC failed, trying direct creation:', error)

      // RPC가 실패하면 직접 테이블 생성 시도
      const { error: directError } = await supabase
        .from('user_roles')
        .select('id')
        .limit(1)

      if (directError && directError.code === 'PGRST106') {
        return NextResponse.json({
          error: 'Cannot create table automatically. Please run SQL manually in Supabase dashboard.',
          sql: `
CREATE TABLE IF NOT EXISTS public.user_roles (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'homeroom', 'helper', 'teacher', 'student')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own role" ON public.user_roles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role" ON public.user_roles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.user_roles TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE user_roles_id_seq TO authenticated;
`
        }, { status: 500 })
      }
    }

    // 관리자 역할 추가
    const { error: insertError } = await supabase
      .from('user_roles')
      .upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id' })

    if (insertError) {
      console.error('🔧 DATABASE SETUP - Error inserting admin role:', insertError)
    } else {
      console.log('🔧 DATABASE SETUP - Admin role created successfully')
    }

    return NextResponse.json({
      success: true,
      message: 'Database setup completed successfully'
    })
  } catch (error) {
    console.error('🔧 DATABASE SETUP - Unexpected error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error
    }, { status: 500 })
  }
}