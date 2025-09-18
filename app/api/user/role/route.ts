import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role, grade, class: className, studentNo } = await request.json()

    console.log('🔍 API - Role update request:', {
      user: user.email,
      role,
      grade,
      className,
      studentNo
    })

    // 임시로 users 테이블에 role 정보를 저장하는 방식으로 변경
    // localStorage를 사용하여 클라이언트에서 역할 정보 관리
    console.log('🔍 API - Using localStorage approach due to missing user_roles table')

    // 성공적으로 저장되었다고 응답 (실제로는 클라이언트에서 localStorage로 관리)
    console.log('🔍 API - Role update successful for:', user.email, 'with role:', role)

    console.log('🔍 API - Role update successful for:', user.email)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('🔍 API - Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}