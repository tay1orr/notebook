import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth'
import { getBackupHistory, addBackupRecord, clearBackupHistory, getBackupHistoryStatus } from '../trigger/backup-history-utils'

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

    const { searchParams } = new URL(request.url)
    const debug = searchParams.get('debug') === 'true'

    const history = await getBackupHistory()
    console.log('📊 백업 기록 API 조회:', history.length, '개 기록')
    console.log('📋 백업 기록 상세:', history.map(h => ({
      type: h.type,
      timestamp: h.timestamp,
      triggeredBy: h.triggeredBy
    })))

    const response: any = {
      history: history
    }

    // 디버그 모드일 때 상태 정보도 포함
    if (debug) {
      response.status = await getBackupHistoryStatus()
    }

    return NextResponse.json(response)

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

    const newRecord = await addBackupRecord({
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

// 백업 기록 초기화 (디버깅용)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    await clearBackupHistory()
    console.log('🗑️ 관리자가 백업 기록을 초기화했습니다:', user.email)

    return NextResponse.json({
      success: true,
      message: '백업 기록이 초기화되었습니다.'
    })

  } catch (error) {
    console.error('백업 기록 초기화 실패:', error)
    return NextResponse.json(
      { error: '백업 기록 초기화 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}