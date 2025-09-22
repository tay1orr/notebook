import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getCurrentUserForAPI } from '@/lib/auth'

// 자동 백업 스케줄 설정 API
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }
    console.log('🔐 BACKUP SCHEDULE - Admin user:', user.email)

    const body = await request.json()
    const { enabled, schedule_type, time } = body

    const supabase = createAdminClient()

    // 백업 스케줄 설정을 데이터베이스에 저장 (간단한 설정 테이블 필요)
    // 현재는 로컬 설정으로 처리

    const scheduleConfig = {
      enabled: enabled || false,
      schedule_type: schedule_type || 'daily', // daily, weekly, monthly
      time: time || '02:00', // HH:MM 형식
      last_run: null,
      next_run: calculateNextRun(schedule_type, time),
      created_by: user.email,
      updated_at: new Date().toISOString()
    }

    // TODO: 실제 cron job 설정 (Vercel Cron Jobs 또는 서버 cron)
    console.log('📅 백업 스케줄 설정:', scheduleConfig)

    return NextResponse.json({
      success: true,
      message: '백업 스케줄이 설정되었습니다.',
      config: scheduleConfig
    })

  } catch (error) {
    console.error('백업 스케줄 설정 실패:', error)
    return NextResponse.json(
      { error: '백업 스케줄 설정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    // 현재 백업 스케줄 조회
    const currentSchedule = {
      enabled: true,
      schedule_type: 'daily' as const,
      time: '02:00',
      last_run: null,
      next_run: calculateNextRun('daily', '02:00'),
      timezone: 'Asia/Seoul'
    }

    return NextResponse.json(currentSchedule)

  } catch (error) {
    console.error('백업 스케줄 조회 실패:', error)
    return NextResponse.json(
      { error: '백업 스케줄 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

function calculateNextRun(scheduleType: string, time: string): string {
  // 현재 한국 시간 계산
  const now = new Date()
  const koreaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}))

  console.log('🔍 스케줄 계산 - 현재 한국 시간:', koreaTime.toISOString())

  const [hours, minutes] = time.split(':').map(Number)

  // 오늘 해당 시간으로 설정
  let nextRun = new Date(koreaTime)
  nextRun.setHours(hours, minutes, 0, 0)

  console.log('🔍 스케줄 계산 - 오늘 백업 시간:', nextRun.toISOString())
  console.log('🔍 스케줄 계산 - 현재 vs 백업시간:', koreaTime.getTime(), 'vs', nextRun.getTime())

  // 이미 지난 시간이면 다음 주기로
  if (nextRun <= koreaTime) {
    console.log('🔍 스케줄 계산 - 이미 지난 시간, 다음 주기로 이동')
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

  console.log('🔍 스케줄 계산 - 최종 다음 백업 시간:', nextRun.toISOString())
  return nextRun.toISOString()
}