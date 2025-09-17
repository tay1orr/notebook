import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/supabase'
import { getCurrentKoreaTime, getCurrentKoreaDateTimeString } from '@/lib/utils'

// GET: 모든 대여 신청 조회
export async function GET() {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })

    const { data: loans, error } = await supabase
      .from('loan_applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })
    }

    return NextResponse.json({ loans })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
          status: 'requested'
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
    const supabase = createServerComponentClient<Database>({ cookies })

    const body = await request.json()
    console.log('PATCH request body:', body)

    const { id, status, device_tag, approved_by, approved_at, notes } = body

    if (!id || !status) {
      console.error('Missing required fields:', { id, status })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('Updating loan with:', { id, status, device_tag, approved_by, approved_at, notes })

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (device_tag) updateData.device_tag = device_tag
    if (approved_by) updateData.approved_by = approved_by
    if (approved_at) updateData.approved_at = approved_at || new Date().toISOString()
    if (notes) updateData.notes = notes

    // 상태별 시간 기록
    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString()
    } else if (status === 'picked_up') {
      updateData.picked_up_at = new Date().toISOString()
    } else if (status === 'returned') {
      updateData.returned_at = new Date().toISOString()
    } else if (status === 'rejected') {
      // 거절(취소 포함) 시에는 별도 시간 기록 없음 (updated_at으로 충분)
    }

    console.log('About to update database with:', updateData)

    const { data: loan, error } = await supabase
      .from('loan_applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      console.error('Update data that failed:', updateData)
      console.error('Loan ID that failed:', id)
      return NextResponse.json({ error: 'Failed to update loan application', details: error.message }, { status: 500 })
    }

    console.log('Successfully updated loan:', loan)

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
        console.log(`Updating device status: ${device_tag} -> ${deviceStatus}`)
        const deviceResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/devices`, {
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
        } else {
          const deviceResult = await deviceResponse.json()
          console.log(`Device update successful:`, deviceResult)
        }
      } catch (deviceError) {
        console.error('Failed to update device status:', deviceError)
        // 기기 상태 업데이트 실패해도 대여 승인은 성공으로 처리
      }
    }

    return NextResponse.json({ loan })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/loans:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}