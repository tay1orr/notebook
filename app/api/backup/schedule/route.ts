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

    // 다음 실행 시간 계산
    const next_run = calculateNextRun(schedule_type, time)

    // 백업 스케줄 설정을 데이터베이스에 저장/업데이트
    const { data: existingSchedule } = await supabase
      .from('backup_schedule')
      .select('id')
      .limit(1)
      .single()

    let result
    if (existingSchedule) {
      // 기존 스케줄 업데이트
      result = await supabase
        .from('backup_schedule')
        .update({
          enabled: enabled || false,
          schedule_type: schedule_type || 'daily',
          time: time || '02:00',
          next_run,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSchedule.id)
        .select()
        .single()
    } else {
      // 새 스케줄 생성
      result = await supabase
        .from('backup_schedule')
        .insert({
          enabled: enabled || false,
          schedule_type: schedule_type || 'daily',
          time: time || '02:00',
          next_run,
          created_by: user.email
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('백업 스케줄 저장 실패:', result.error)
      throw new Error(result.error.message)
    }

    console.log('✅ 백업 스케줄 저장 완료:', result.data)

    return NextResponse.json({
      success: true,
      message: '백업 스케줄이 설정되었습니다.',
      config: result.data
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

    const supabase = createAdminClient()

    // 현재 백업 스케줄 조회
    const { data: schedule, error } = await supabase
      .from('backup_schedule')
      .select('*')
      .limit(1)
      .single()

    // 테이블이 존재하지 않거나 데이터가 없는 경우 기본값 반환
    if (error && (error.code === 'PGRST116' || error.code === '42P01')) {
      console.log('백업 스케줄 테이블이 존재하지 않거나 데이터 없음, 기본값 반환')
      return NextResponse.json({
        enabled: true,
        schedule_type: 'daily',
        time: '02:00',
        last_run: null,
        next_run: calculateNextRun('daily', '02:00'),
        timezone: 'Asia/Seoul'
      })
    }

    if (error) {
      console.error('백업 스케줄 조회 실패:', error)
      throw new Error(error.message)
    }

    if (!schedule) {
      // 기본 스케줄 생성 시도
      try {
        const defaultSchedule = {
          enabled: true,
          schedule_type: 'daily',
          time: '02:00',
          next_run: calculateNextRun('daily', '02:00'),
          created_by: user.email
        }

        const { data: newSchedule, error: insertError } = await supabase
          .from('backup_schedule')
          .insert(defaultSchedule)
          .select()
          .single()

        if (insertError) {
          console.error('기본 스케줄 생성 실패:', insertError)
          // 생성 실패 시 기본값 반환
          return NextResponse.json({
            enabled: true,
            schedule_type: 'daily',
            time: '02:00',
            last_run: null,
            next_run: calculateNextRun('daily', '02:00'),
            timezone: 'Asia/Seoul'
          })
        }

        return NextResponse.json({
          ...newSchedule,
          timezone: 'Asia/Seoul'
        })
      } catch (createError) {
        console.error('스케줄 생성 중 오류:', createError)
        // 오류 발생 시 기본값 반환
        return NextResponse.json({
          enabled: true,
          schedule_type: 'daily',
          time: '02:00',
          last_run: null,
          next_run: calculateNextRun('daily', '02:00'),
          timezone: 'Asia/Seoul'
        })
      }
    }

    return NextResponse.json({
      ...schedule,
      timezone: 'Asia/Seoul'
    })

  } catch (error) {
    console.error('백업 스케줄 조회 실패:', error)
    return NextResponse.json(
      { error: '백업 스케줄 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

function calculateNextRun(scheduleType: string, time: string): string {
  // 현재 UTC 시간을 한국 시간으로 변환
  const now = new Date()

  // 한국 시간 객체 생성 (UTC + 9시간)
  const koreaOffset = 9 * 60 * 60 * 1000 // 9시간을 밀리초로
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
  const koreaTime = new Date(utcTime + koreaOffset)

  console.log('🔍 스케줄 계산 - 현재 UTC:', now.toISOString())
  console.log('🔍 스케줄 계산 - 현재 한국 시간:', koreaTime.toISOString())

  const [hours, minutes] = time.split(':').map(Number)

  // 오늘 해당 시간으로 설정 (한국 시간 기준)
  let nextRun = new Date(koreaTime)
  nextRun.setHours(hours, minutes, 0, 0)

  console.log('🔍 스케줄 계산 - 오늘 백업 시간 (한국):', nextRun.toISOString())
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

  // UTC로 변환해서 반환
  const finalUtc = new Date(nextRun.getTime() - koreaOffset)

  console.log('🔍 스케줄 계산 - 최종 다음 백업 시간 (한국):', nextRun.toISOString())
  console.log('🔍 스케줄 계산 - 최종 다음 백업 시간 (UTC):', finalUtc.toISOString())

  return finalUtc.toISOString()
}