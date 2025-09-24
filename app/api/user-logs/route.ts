import { getCurrentUser } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  console.log('🔍 USER LOGS API - Alternative endpoint accessed')

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  console.log('🔍 USER LOGS API - Request for userId:', userId)

  try {
    const user = await getCurrentUser()
    console.log('🔍 USER LOGS API - Current user:', user?.email, user?.role)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 관리자, 담임교사만 사용자 로그 조회 가능
    if (!["admin", "homeroom"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 사용자 정보 조회 (여러 테이블 확인)
    console.log('🔍 USER LOGS API - Looking up user in user_profiles table')
    const { data: targetUser, error: userError } = await adminSupabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single()

    console.log('🔍 USER LOGS API - User lookup result:', { targetUser, error: userError })

    if (!targetUser) {
      // user_profiles 테이블에 없으면 auth.users 테이블에서 확인
      console.log('🔍 USER LOGS API - User not found in user_profiles, checking auth.users')

      const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(userId)
      console.log('🔍 USER LOGS API - Auth user lookup result:', { authUser, error: authError })

      if (!authUser?.user) {
        console.log('🔍 USER LOGS API - User not found in auth.users either')
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // auth.users에서만 찾은 경우 기본 정보로 처리
      const fallbackUser = {
        user_id: authUser.user.id,
        name: authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || '알 수 없음',
        email: authUser.user.email,
        grade: '알 수 없음',
        class: '알 수 없음'
      }

      console.log('🔍 USER LOGS API - Using fallback user data:', fallbackUser)

      const userLogs = [
        {
          id: "1",
          timestamp: "2024-01-15T09:00:00Z",
          action: "계정 생성",
          details: "사용자 계정이 생성되었습니다.",
          ip_address: "192.168.1.100"
        }
      ]

      return NextResponse.json({
        userId,
        userName: fallbackUser.name,
        logs: userLogs
      })
    }

    // 담임교사인 경우 자신의 반 학생만 조회 가능
    if (user.role === "homeroom" && user.isApprovedHomeroom) {
      const teacherClass = `${user.grade}-${user.class}`
      const studentClass = `${targetUser.grade}-${targetUser.class}`

      if (teacherClass !== studentClass) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // 모의 로그 데이터 생성
    const userLogs = [
      {
        id: "1",
        timestamp: "2024-01-15T09:00:00Z",
        action: "계정 생성",
        details: "사용자 계정이 생성되었습니다.",
        ip_address: "192.168.1.100"
      },
      {
        id: "2",
        timestamp: "2024-01-15T09:30:00Z",
        action: "로그인",
        details: "사용자가 로그인했습니다.",
        ip_address: "192.168.1.100"
      },
      {
        id: "3",
        timestamp: "2024-01-15T10:00:00Z",
        action: "대여 신청",
        details: "ICH-30135 기기를 대여 신청했습니다.",
        ip_address: "192.168.1.100"
      },
      {
        id: "4",
        timestamp: "2024-01-15T11:00:00Z",
        action: "기기 수령",
        details: "ICH-30135 기기를 수령했습니다.",
        ip_address: "192.168.1.100"
      }
    ]

    console.log('🔍 USER LOGS API - Returning logs for user:', targetUser.name)

    return NextResponse.json({
      userId,
      userName: targetUser.name,
      logs: userLogs
    })

  } catch (error) {
    console.error("User logs API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}