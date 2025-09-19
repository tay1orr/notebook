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

    console.log('🔍 CREATE TABLE - Admin user confirmed:', user.email)

    // 간단하게 테이블이 있는지 먼저 확인해보기
    const { data: existingData, error: checkError } = await adminSupabase
      .from('students')
      .select('id')
      .limit(1)

    if (!checkError) {
      console.log('🔍 CREATE TABLE - Students table already exists')
      return NextResponse.json({
        success: true,
        message: 'Students table already exists'
      })
    }

    console.log('🔍 CREATE TABLE - Table does not exist, need to create it manually in Supabase Dashboard')

    return NextResponse.json({
      success: false,
      message: 'Students table does not exist. Please create it manually in Supabase Dashboard with the following schema:',
      schema: {
        tableName: 'students',
        columns: [
          { name: 'id', type: 'bigserial', primaryKey: true },
          { name: 'user_id', type: 'uuid', references: 'auth.users(id)', unique: true },
          { name: 'name', type: 'text', nullable: false },
          { name: 'email', type: 'text', nullable: false },
          { name: 'grade', type: 'integer', nullable: false },
          { name: 'class', type: 'integer', nullable: false },
          { name: 'student_no', type: 'integer', nullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' }
        ]
      }
    })
  } catch (error) {
    console.error('🔍 CREATE TABLE - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}