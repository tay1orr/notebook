import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = createServerClient()
    const adminSupabase = createAdminClient()

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 CANCEL APPLICATION - Processing for user:', user.email)

    // 현재 사용자 메타데이터 가져오기
    const { data: currentUserData, error: getUserError } = await adminSupabase.auth.admin.getUserById(user.id)

    if (getUserError || !currentUserData.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = currentUserData.user
    const currentMetadata = userData.user_metadata || {}

    // 승인 대기 중인 신청이 있는지 확인
    const homeroomPending = currentMetadata.pending_homeroom?.status === 'pending'
    const helperPending = currentMetadata.pending_helper?.status === 'pending'

    if (!homeroomPending && !helperPending) {
      return NextResponse.json({ error: 'No pending application found' }, { status: 400 })
    }

    // 메타데이터 업데이트 - 승인 대기 상태 제거
    const updatedMetadata = { ...currentMetadata }

    if (homeroomPending) {
      updatedMetadata.pending_homeroom = {
        ...currentMetadata.pending_homeroom,
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.email
      }
      console.log('🔍 CANCEL APPLICATION - Cancelling homeroom application for:', user.email)
    }

    if (helperPending) {
      updatedMetadata.pending_helper = {
        ...currentMetadata.pending_helper,
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.email
      }
      console.log('🔍 CANCEL APPLICATION - Cancelling helper application for:', user.email)
    }

    // 사용자 메타데이터 업데이트
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      { user_metadata: updatedMetadata }
    )

    if (updateError) {
      console.error('🔍 CANCEL APPLICATION - Failed to update metadata:', updateError)
      return NextResponse.json({ error: 'Failed to cancel application' }, { status: 500 })
    }

    console.log('🔍 CANCEL APPLICATION - Successfully cancelled application for:', user.email)

    return NextResponse.json({
      success: true,
      message: 'Application cancelled successfully',
      cancelled_type: homeroomPending ? 'homeroom' : 'helper'
    })

  } catch (error) {
    console.error('🔍 CANCEL APPLICATION - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}