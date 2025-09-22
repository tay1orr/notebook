import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth'
import { getBackupHistory, addBackupRecord } from '../trigger/backup-history-utils'

// 백업 기록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    const history = getBackupHistory()
    console.log('📊 백업 기록 조회:', history.length, '개 기록')

    return NextResponse.json({
      history: history
    })

  } catch (error) {
    console.error('백업 기록 조회 실패:', error)
    return NextResponse.json(
      { error: '백업 기록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 백업 기록 추가
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { type, status, table, size } = body

    const newRecord = addBackupRecord({
      type,
      status,
      table,
      size,
      triggeredBy: type === 'manual' ? user.email : 'system'
    })

    return NextResponse.json({
      success: true,
      record: newRecord
    })

  } catch (error) {
    console.error('백업 기록 추가 실패:', error)
    return NextResponse.json(
      { error: '백업 기록 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}