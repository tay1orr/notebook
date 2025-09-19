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

    console.log('🔍 SETUP TABLE - Admin user confirmed:', user.email)

    // 테스트용으로 더미 학생 데이터를 삽입해서 테이블이 자동 생성되도록 시도
    // 하지만 이는 테이블이 이미 존재해야 하므로 실패할 것입니다

    // 대신 간단한 해결책으로 학급 정보를 user_roles 테이블에 저장하는 방법을 사용
    // user_roles 테이블에 grade, class, student_no 컬럼을 추가하는 대신
    // role_data JSONB 컬럼을 추가해서 추가 정보를 저장

    console.log('🔍 SETUP TABLE - Alternative: Adding role_data column to user_roles table')

    // user_roles 테이블에 role_data 컬럼이 있는지 확인
    const { data: sampleData, error: checkError } = await adminSupabase
      .from('user_roles')
      .select('*')
      .limit(1)

    console.log('🔍 SETUP TABLE - Current user_roles structure:', sampleData)

    return NextResponse.json({
      success: true,
      message: 'Since students table does not exist, we will store student info in user_roles table with role_data JSONB column',
      currentUserRoles: sampleData,
      recommendation: 'Create students table manually in Supabase dashboard or modify user_roles to include student data'
    })
  } catch (error) {
    console.error('🔍 SETUP TABLE - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}