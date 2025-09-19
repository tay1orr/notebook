import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = createServerClient()
    const adminSupabase = createAdminClient()

    // 현재 사용자가 관리자인지 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.email !== 'taylorr@gclass.ice.go.kr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 ADD COLUMNS - Admin user confirmed:', user.email)

    // user_roles 테이블에 학급 정보 컬럼 추가
    try {
      // SQL을 직접 실행하여 컬럼 추가
      const { data, error } = await adminSupabase.rpc('exec_sql', {
        sql: `
        DO $$
        BEGIN
          -- grade 컬럼 추가
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_name='user_roles' AND column_name='grade') THEN
            ALTER TABLE user_roles ADD COLUMN grade INTEGER;
          END IF;

          -- class_name 컬럼 추가
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_name='user_roles' AND column_name='class_name') THEN
            ALTER TABLE user_roles ADD COLUMN class_name INTEGER;
          END IF;

          -- student_no 컬럼 추가
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_name='user_roles' AND column_name='student_no') THEN
            ALTER TABLE user_roles ADD COLUMN student_no INTEGER;
          END IF;
        END $$;
        `
      })

      if (error) {
        console.error('🔍 ADD COLUMNS - SQL execution failed:', error)
        return NextResponse.json({
          success: false,
          message: 'Failed to add columns via SQL. Please add manually in Supabase Dashboard.',
          error: error.message,
          manual_sql: `
            ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS grade INTEGER;
            ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS class_name INTEGER;
            ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS student_no INTEGER;
          `
        })
      }

      console.log('🔍 ADD COLUMNS - SQL execution result:', data)

      return NextResponse.json({
        success: true,
        message: 'Class information columns added successfully to user_roles table',
        result: data
      })

    } catch (sqlError) {
      console.error('🔍 ADD COLUMNS - SQL execution error:', sqlError)

      return NextResponse.json({
        success: false,
        message: 'Could not execute SQL. Please add columns manually in Supabase Dashboard.',
        manual_sql: `
          ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS grade INTEGER;
          ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS class_name INTEGER;
          ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS student_no INTEGER;
        `,
        error: sqlError
      })
    }

  } catch (error) {
    console.error('🔍 ADD COLUMNS - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}