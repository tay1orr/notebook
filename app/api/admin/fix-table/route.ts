import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const adminSupabase = createAdminClient()

    console.log('🔍 FIX TABLE - Starting table structure fix')

    // SQL을 직접 실행해서 컬럼 추가
    const sqlCommands = [
      `ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS grade INTEGER;`,
      `ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS class_name INTEGER;`,
      `ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS student_no INTEGER;`
    ]

    const results = []

    for (const sql of sqlCommands) {
      try {
        console.log('🔍 FIX TABLE - Executing:', sql)
        const { data, error } = await adminSupabase.rpc('exec_sql', { sql })

        if (error) {
          console.error('🔍 FIX TABLE - SQL Error:', error)
          results.push({ sql, success: false, error: error.message })
        } else {
          console.log('🔍 FIX TABLE - SQL Success:', data)
          results.push({ sql, success: true, result: data })
        }
      } catch (sqlError) {
        console.error('🔍 FIX TABLE - SQL Exception:', sqlError)
        results.push({ sql, success: false, error: sqlError instanceof Error ? sqlError.message : 'Unknown error' })
      }
    }

    // 현재 테이블 구조 확인
    try {
      const { data: tableInfo, error: infoError } = await adminSupabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'user_roles')

      console.log('🔍 FIX TABLE - Current table structure:', tableInfo)
    } catch (infoError) {
      console.log('🔍 FIX TABLE - Could not get table info')
    }

    return NextResponse.json({
      success: true,
      message: 'Attempted to add columns to user_roles table',
      results,
      note: 'Check logs for details. If SQL execution is not supported, add columns manually in Supabase Dashboard.'
    })

  } catch (error) {
    console.error('🔍 FIX TABLE - Unexpected error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Could not fix table structure. Please add columns manually in Supabase Dashboard.',
      sqlToRun: [
        'ALTER TABLE user_roles ADD COLUMN grade INTEGER;',
        'ALTER TABLE user_roles ADD COLUMN class_name INTEGER;',
        'ALTER TABLE user_roles ADD COLUMN student_no INTEGER;'
      ]
    }, { status: 500 })
  }
}