import { NextRequest, NextResponse } from 'next/server'

// Vercel Cron Jobs을 위한 자동 백업 실행 API
export async function GET(request: NextRequest) {
  try {
    // Vercel에서 오는 요청인지 확인
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn('⚠️ 크론 작업 인증 실패:', authHeader)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🤖 자동 백업 크론 작업 시작:', new Date().toISOString())

    // 현재 시간을 한국 시간으로 변환
    const now = new Date()
    const koreaTime = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now)

    console.log('🕐 백업 실행 시간 (한국):', koreaTime)

    // 백업 트리거 API 호출
    const backupResponse = await fetch(`${process.env.NEXTAUTH_URL || request.nextUrl.origin}/api/backup/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 시스템 크론으로 실행됨을 표시
        'X-Backup-Source': 'cron'
      },
      body: JSON.stringify({
        type: 'scheduled'
      })
    })

    if (!backupResponse.ok) {
      const error = await backupResponse.text()
      console.error('❌ 자동 백업 실행 실패:', error)
      return NextResponse.json(
        { error: '자동 백업 실행 중 오류 발생', details: error },
        { status: 500 }
      )
    }

    const result = await backupResponse.json()
    console.log('✅ 자동 백업 완료:', result)

    // 백업 완료 후 스케줄의 last_run 업데이트
    try {
      const scheduleResponse = await fetch(`${process.env.NEXTAUTH_URL || request.nextUrl.origin}/api/backup/schedule/update-run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Call': 'cron'
        },
        body: JSON.stringify({
          last_run: now.toISOString(),
          executed_at: koreaTime
        })
      })

      if (scheduleResponse.ok) {
        console.log('📝 백업 스케줄 last_run 업데이트 완료')
      } else {
        console.warn('⚠️ 백업 스케줄 업데이트 실패:', await scheduleResponse.text())
      }
    } catch (updateError) {
      console.error('⚠️ 백업 스케줄 업데이트 오류:', updateError)
    }

    return NextResponse.json({
      success: true,
      message: '자동 백업이 성공적으로 완료되었습니다.',
      executedAt: koreaTime,
      result
    })

  } catch (error) {
    console.error('💥 자동 백업 크론 작업 실패:', error)
    return NextResponse.json(
      { error: '자동 백업 크론 작업 중 오류 발생' },
      { status: 500 }
    )
  }
}

// POST 메소드도 지원 (Vercel Cron에서 필요할 수 있음)
export async function POST(request: NextRequest) {
  return GET(request)
}