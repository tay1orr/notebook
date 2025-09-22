import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth'

// 메모리에 백업 기록 저장 (실제로는 데이터베이스 사용)
let backupHistory: Array<{
  id: string
  type: 'manual' | 'auto'
  status: 'success' | 'failed' | 'pending'
  timestamp: string
  triggeredBy?: string
  table: string
  size?: number
}> = []

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

    return NextResponse.json({
      history: backupHistory.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
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

    const newRecord = {
      id: Date.now().toString(),
      type,
      status,
      timestamp: new Date().toISOString(),
      triggeredBy: type === 'manual' ? user.email : 'system',
      table,
      size
    }

    backupHistory.push(newRecord)

    console.log('백업 기록 추가됨:', newRecord)

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