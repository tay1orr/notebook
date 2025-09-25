import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// 백업 실행 후 last_run 업데이트를 위한 내부 API
export async function POST(request: NextRequest) {
  try {
    // 내부 호출인지 확인
    const internalCall = request.headers.get('X-Internal-Call')
    if (internalCall !== 'cron') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { last_run, executed_at } = body

    const supabase = createAdminClient()

    // 다음 실행 시간 계산을 위해 현재 스케줄 정보 조회
    const { data: currentSchedule, error: fetchError } = await supabase
      .from('backup_schedule')
      .select('*')
      .limit(1)
      .single()

    if (fetchError) {
      console.error('백업 스케줄 조회 실패:', fetchError)
      return NextResponse.json(
        { error: '백업 스케줄 조회 실패' },
        { status: 500 }
      )
    }

    // 다음 실행 시간 계산
    const next_run = calculateNextRun(currentSchedule.schedule_type, currentSchedule.time)

    // last_run과 next_run 업데이트
    const { data, error } = await supabase
      .from('backup_schedule')
      .update({
        last_run,
        next_run,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentSchedule.id)
      .select()
      .single()

    if (error) {
      console.error('백업 스케줄 업데이트 실패:', error)
      return NextResponse.json(
        { error: '백업 스케줄 업데이트 실패' },
        { status: 500 }
      )
    }

    console.log('✅ 백업 스케줄 last_run 업데이트:', {
      last_run,
      next_run,
      executed_at
    })

    return NextResponse.json({
      success: true,
      updated: data
    })

  } catch (error) {
    console.error('백업 스케줄 업데이트 중 오류:', error)
    return NextResponse.json(
      { error: '백업 스케줄 업데이트 중 오류 발생' },
      { status: 500 }
    )
  }
}

// 다음 실행 시간 계산 함수 (schedule/route.ts와 동일한 로직)
function calculateNextRun(scheduleType: string, time: string): string {
  const now = new Date()
  const koreaOffset = 9 * 60 * 60 * 1000
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
  const koreaTime = new Date(utcTime + koreaOffset)

  const [hours, minutes] = time.split(':').map(Number)
  let nextRun = new Date(koreaTime)
  nextRun.setHours(hours, minutes, 0, 0)

  // 이미 지난 시간이면 다음 주기로
  if (nextRun <= koreaTime) {
    switch (scheduleType) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1)
        break
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7)
        break
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1)
        break
    }
  }

  // UTC로 변환해서 반환
  const finalUtc = new Date(nextRun.getTime() - koreaOffset)
  return finalUtc.toISOString()
}