import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getCurrentUserForAPI } from '@/lib/auth'

// 백업 테이블 설정 API (한번만 실행)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()

    console.log('🔧 백업 테이블 확인 시작...')

    // 테이블 존재 여부 확인
    const { data: existingTables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'backup_history')

    if (checkError) {
      console.error('❌ 테이블 존재 확인 실패:', checkError)
    }

    if (existingTables && existingTables.length > 0) {
      console.log('✅ backup_history 테이블이 이미 존재합니다')
    } else {
      console.log('⚠️ backup_history 테이블이 존재하지 않습니다')
      console.log('🚨 수동으로 Supabase Dashboard에서 테이블을 생성해주세요')
    }

    // 테스트용 간단한 조회
    const { data: testData, error: testError } = await supabase
      .from('backup_history')
      .select('*')
      .limit(1)

    if (testError) {
      console.log('❌ 백업 테이블 접근 테스트 실패:', testError.message)
      return NextResponse.json({
        success: false,
        message: '백업 테이블이 존재하지 않습니다. Supabase Dashboard에서 수동으로 생성해주세요.',
        error: testError.message
      })
    } else {
      console.log('✅ 백업 테이블 접근 성공')
    }

    console.log('✅ 백업 시스템 설정 확인 완료')

    return NextResponse.json({
      success: true,
      message: '백업 테이블이 설정되었습니다.'
    })

  } catch (error) {
    console.error('❌ 백업 테이블 설정 실패:', error)
    return NextResponse.json(
      { error: '백업 테이블 설정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}