import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/supabase'

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
      signature,
      notes
    } = body

    // 필수 필드 검증
    if (!student_name || !student_no || !class_name || !email || !purpose || !return_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
    const { id, status, device_tag, approved_by, approved_at, notes } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (device_tag) updateData.device_tag = device_tag
    if (approved_by) updateData.approved_by = approved_by
    if (approved_at) updateData.approved_at = approved_at
    if (notes) updateData.notes = notes

    const { data: loan, error } = await supabase
      .from('loan_applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update loan application' }, { status: 500 })
    }

    return NextResponse.json({ loan })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}