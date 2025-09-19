import { getCurrentUser } from '@/lib/auth'
import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // getCurrentUser 함수를 사용해서 제대로 처리된 사용자 정보 가져오기
    const authUser = await getCurrentUser()

    if (!authUser) {
      return NextResponse.json({
        error: 'Not authenticated'
      }, { status: 401 })
    }

    console.log('🔍 ROLE CHECK - Current user from auth:', authUser)

    return NextResponse.json({
      success: true,
      user: authUser,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('🔍 ROLE CHECK - Unexpected error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}