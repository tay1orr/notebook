import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/supabase'
import { getCurrentKoreaTime, getCurrentKoreaDateTimeString } from '@/lib/utils'
import { handleSupabaseError, logError } from '@/lib/error-handler'
import { getCurrentUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limiter'
import { loanApplicationSchema, sanitizeInput } from '@/lib/validation'
import { monitoring } from '@/lib/monitoring'

// GET: 모든 대여 신청 조회
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    monitoring.recordMetric('api_request', 1, { endpoint: 'GET /api/loans' })

    const supabase = createServerComponentClient<Database>({ cookies })

    // URL 파라미터에서 limit과 offset 가져오기 (기본값: 최근 100개)
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500) // 최대 500개 제한
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: loans, error } = await supabase
      .from('loan_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      const appError = handleSupabaseError(error)
      monitoring.recordError(new Error(error.message), 'GET /api/loans')
      logError(error, 'GET /api/loans')
      return NextResponse.json({ error: appError.message }, { status: appError.status || 500 })
    }

    monitoring.recordMetric('api_request_duration', Date.now() - startTime, { endpoint: 'GET /api/loans' })
    monitoring.recordMetric('loans_fetched', loans.length)

    return NextResponse.json({ loans })
  } catch (error) {
    monitoring.recordError(error as Error, 'GET /api/loans')
    logError(error, 'GET /api/loans - Unexpected error')
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// POST: 새로운 대여 신청 생성
export async function POST(request: NextRequest) {
  try {
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = rateLimit(`loans_${clientIP}`, 10, 60000)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString()
          }
        }
      )
    }

    const supabase = createServerComponentClient<Database>({ cookies })
    const body = await request.json()

    // 입력 데이터 검증 및 정리
    const validationResult = loanApplicationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        error: '입력 데이터가 올바르지 않습니다.',
        details: validationResult.error.issues.map(issue => issue.message)
      }, { status: 400 })
    }

    const {
      student_name,
      student_no,
      class_name,
      email,
      student_contact,
      purpose,
      purpose_detail,
      return_date,
      return_time,
      due_date,
      device_tag,
      signature,
      notes
    } = validationResult.data

    // device_tag가 없으면 학생의 학급 정보로 기본 기기 할당
    let assignedDeviceTag = device_tag
    if (!assignedDeviceTag && class_name && student_no) {
      const classInfo = class_name.split('-') // "2-1" -> ["2", "1"]
      if (classInfo.length === 2) {
        const grade = classInfo[0]
        const classNumber = classInfo[1].padStart(2, '0')
        const deviceNumber = student_no.padStart(2, '0')
        assignedDeviceTag = `${grade}-${classNumber}-${deviceNumber}`
      }
    }

    const { data: loan, error } = await supabase
      .from('loan_applications')
      .insert([
        {
          student_name: sanitizeInput(student_name),
          student_no,
          class_name,
          email,
          student_contact: student_contact ? sanitizeInput(student_contact) : null,
          purpose,
          purpose_detail: purpose_detail ? sanitizeInput(purpose_detail) : null,
          return_date,
          return_time,
          due_date,
          device_tag: assignedDeviceTag,
          signature,
          notes: notes ? sanitizeInput(notes) : null,
          status: 'requested',
          created_at: getCurrentKoreaTime()
        }
      ])
      .select()
      .single()

    if (error) {
      monitoring.recordError(new Error(error.message), 'POST /api/loans')
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create loan application' }, { status: 500 })
    }

    monitoring.recordMetric('loan_created', 1, {
      purpose,
      class: class_name,
      device_assigned: assignedDeviceTag ? 'true' : 'false'
    })

    return NextResponse.json({ loan }, { status: 201 })
  } catch (error) {
    monitoring.recordError(error as Error, 'POST /api/loans')
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: 대여 신청 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })

    // 현재 사용자 정보 가져오기 (역할 추적을 위해)
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, device_tag, approved_by, approved_at, notes } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    interface LoanUpdateData {
      status: string
      updated_at: string
      device_tag?: string
      approved_by?: string
      approved_by_role?: string
      approved_at?: string
      notes?: string
      picked_up_at?: string
      returned_at?: string
    }

    const updateData: LoanUpdateData = {
      status,
      updated_at: getCurrentKoreaTime()
    }

    if (device_tag) updateData.device_tag = device_tag
    if (approved_by) updateData.approved_by = approved_by
    if (approved_at) updateData.approved_at = approved_at || getCurrentKoreaTime()
    if (notes) updateData.notes = notes

    // 상태별 시간 기록 및 역할 추적
    if (status === 'approved') {
      updateData.approved_at = getCurrentKoreaTime()
      // approved_by는 요청에서 온 값 사용하거나 현재 사용자 이메일
      updateData.approved_by = approved_by || currentUser.email
      // 현재 사용자의 역할도 저장
      updateData.approved_by_role = currentUser.role


    } else if (status === 'picked_up') {
      updateData.picked_up_at = getCurrentKoreaTime()
      // picked_up 상태일 때 승인 시간 설정 (승인과 수령이 동시에 일어남)
      updateData.approved_at = approved_at || getCurrentKoreaTime()
      updateData.approved_by = approved_by || currentUser.email
      updateData.approved_by_role = currentUser.role
    } else if (status === 'returned') {
      updateData.returned_at = getCurrentKoreaTime()
    } else if (status === 'rejected') {
      // 거절 시에도 승인자 정보 저장
      updateData.approved_by = approved_by || currentUser.email
      updateData.approved_by_role = currentUser.role
      // 거절 시간은 updated_at으로 추적

    }

    const { data: loan, error } = await supabase
      .from('loan_applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update loan application', details: error.message }, { status: 500 })
    }

    // 기기 상태 업데이트
    if (device_tag) {
      try {
        let deviceStatus = 'available'
        let deviceCurrentUser = null

        if (status === 'approved' || status === 'picked_up') {
          deviceStatus = 'loaned'
          deviceCurrentUser = loan.student_name
        } else if (status === 'returned') {
          deviceStatus = 'available'
          deviceCurrentUser = null
        }

        // 기기 상태 업데이트 API 호출
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const deviceResponse = await fetch(`${baseUrl}/api/devices`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceTag: device_tag,
            status: deviceStatus,
            currentUser: deviceCurrentUser,
            notes: notes || ''
          })
        })

        if (!deviceResponse.ok) {
          const errorText = await deviceResponse.text()
          console.error(`Device update failed: ${deviceResponse.status} - ${errorText}`)
        }
      } catch (deviceError) {
        console.error('Failed to update device status:', deviceError)
        // 기기 상태 업데이트 실패해도 대여 승인은 성공으로 처리
      }
    }

    return NextResponse.json({ loan })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/loans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}