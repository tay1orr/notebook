import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/supabase'
import { getCurrentKoreaTime, getCurrentKoreaDateTimeString } from '@/lib/utils'
import { handleSupabaseError, logError } from '@/lib/error-handler'
import { getCurrentUser } from '@/lib/auth'

// GET: 모든 대여 신청 조회
export async function GET() {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })

    const { data: loans, error } = await supabase
      .from('loan_applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      const appError = handleSupabaseError(error)
      logError(error, 'GET /api/loans')
      return NextResponse.json({ error: appError.message }, { status: appError.status || 500 })
    }

    return NextResponse.json({ loans })
  } catch (error) {
    logError(error, 'GET /api/loans - Unexpected error')
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// POST: 새로운 대여 신청 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })

    const body = await request.json()
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
    } = body

    // 필수 필드 검증
    if (!student_name || !student_no || !class_name || !email || !purpose || !return_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

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
          device_tag: assignedDeviceTag,
          signature,
          notes,
          status: 'requested',
          created_at: getCurrentKoreaTime()
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create loan application' }, { status: 500 })
    }

    return NextResponse.json({ loan }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: 대여 신청 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    console.log('🔍 LOANS API PATCH - Starting request')
    const supabase = createServerComponentClient<Database>({ cookies })

    // 현재 사용자 정보 가져오기 (역할 추적을 위해)
    const currentUser = await getCurrentUser()
    console.log('🔍 LOANS API PATCH - Current user:', {
      email: currentUser?.email,
      role: currentUser?.role
    })

    if (!currentUser) {
      console.log('🔍 LOANS API PATCH - No current user, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('🔍 LOANS API PATCH - Request body:', body)
    const { id, status, device_tag, approved_by, approved_at, notes } = body

    if (!id || !status) {
      console.log('🔍 LOANS API PATCH - Missing required fields:', { id, status })
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
      updateData.approved_by_role = currentUser.role
      // approved_by는 요청에서 온 값 사용하거나 현재 사용자 이메일
      updateData.approved_by = approved_by || currentUser.email

      console.log('🔍 LOANS API - Setting approval data:', {
        loanId: id,
        approved_by_role: currentUser?.role,
        approved_by: updateData.approved_by,
        currentUserEmail: currentUser?.email
      })
    } else if (status === 'picked_up') {
      updateData.picked_up_at = getCurrentKoreaTime()
      // picked_up 상태일 때 승인 시간이 없으면 지금 시간으로 설정
      if (!updateData.approved_at) {
        updateData.approved_at = getCurrentKoreaTime()
        updateData.approved_by_role = currentUser.role
        updateData.approved_by = approved_by || currentUser.email
      }
    } else if (status === 'returned') {
      updateData.returned_at = getCurrentKoreaTime()
    } else if (status === 'rejected') {
      // 거절 시에도 역할 정보 저장 (approved_by_role 필드 사용)
      updateData.approved_by_role = currentUser.role
      updateData.approved_by = approved_by || currentUser.email
      // 거절 시간은 updated_at으로 추적

      console.log('🔍 LOANS API - Setting rejection data:', {
        loanId: id,
        approved_by_role: currentUser?.role,
        approved_by: updateData.approved_by,
        currentUserEmail: currentUser?.email
      })
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
        let currentUser = null

        if (status === 'approved' || status === 'picked_up') {
          deviceStatus = 'loaned'
          currentUser = loan.student_name
        } else if (status === 'returned') {
          deviceStatus = 'available'
          currentUser = null
        }

        // 기기 상태 업데이트 API 호출
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const deviceResponse = await fetch(`${baseUrl}/api/devices`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceTag: device_tag,
            status: deviceStatus,
            currentUser: currentUser,
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
    console.error('🚨 LOANS API PATCH - Unexpected error:', error)
    console.error('🚨 LOANS API PATCH - Error type:', typeof error)
    console.error('🚨 LOANS API PATCH - Error stack:', error instanceof Error ? error.stack : 'No stack trace')

    let errorMessage = 'Internal server error'
    if (error instanceof Error) {
      errorMessage = error.message
      console.error('🚨 LOANS API PATCH - Error message:', error.message)
    }

    return NextResponse.json({
      error: 'Internal server error',
      details: errorMessage,
      type: typeof error,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}