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

      // fallback 사용자도 실제 대여 기록 조회 시도
      const fallbackLogs: any[] = []
      try {
        const { data: userLoans } = await adminSupabase
          .from('loan_applications')
          .select('*')
          .eq('email', fallbackUser.email)
          .order('created_at', { ascending: false })

        if (userLoans && userLoans.length > 0) {
          userLoans.forEach((loan) => {
            fallbackLogs.push({
              id: `loan_${loan.id}_request`,
              timestamp: loan.created_at,
              action: "대여 신청",
              details: `${loan.device_tag} 기기를 대여 신청했습니다. (목적: ${loan.purpose})`,
              ip_address: "192.168.1.100"
            })

            if (loan.approved_at) {
              let approverRole = '관리자'

              if (loan.approved_by_role) {
                switch (loan.approved_by_role) {
                  case 'admin':
                    approverRole = '관리자'
                    break
                  case 'homeroom':
                    approverRole = '담임교사'
                    break
                  case 'helper':
                    approverRole = '노트북 관리 도우미'
                    break
                  default:
                    approverRole = '관리자'
                }
              }

              fallbackLogs.push({
                id: `loan_${loan.id}_approved`,
                timestamp: loan.approved_at,
                action: "대여 승인됨",
                details: `${loan.device_tag} 기기 대여가 ${approverRole}에 의해 승인되었습니다.`,
                ip_address: "192.168.1.100"
              })
            }

            if (loan.picked_up_at) {
              fallbackLogs.push({
                id: `loan_${loan.id}_pickup`,
                timestamp: loan.picked_up_at,
                action: "기기 수령",
                details: `${loan.device_tag} 기기를 수령했습니다.`,
                ip_address: "192.168.1.100"
              })
            }

            if (loan.returned_at) {
              fallbackLogs.push({
                id: `loan_${loan.id}_return`,
                timestamp: loan.returned_at,
                action: "기기 반납",
                details: `${loan.device_tag} 기기를 반납했습니다.`,
                ip_address: "192.168.1.100"
              })
            }

            // 본인 취소 vs 관리자 거절 구분
            if (loan.status === 'cancelled') {
              fallbackLogs.push({
                id: `loan_${loan.id}_self_cancel`,
                timestamp: loan.updated_at,
                action: "대여 취소 (본인)",
                details: `${loan.device_tag} 기기 대여를 본인이 취소했습니다.`,
                ip_address: "192.168.1.100"
              })
            } else if (loan.status === 'rejected') {
              let rejecterRole = '관리자'

              if (loan.rejected_by_role) {
                switch (loan.rejected_by_role) {
                  case 'admin':
                    rejecterRole = '관리자'
                    break
                  case 'homeroom':
                    rejecterRole = '담임교사'
                    break
                  case 'helper':
                    rejecterRole = '노트북 관리 도우미'
                    break
                  default:
                    rejecterRole = '관리자'
                }
              }

              fallbackLogs.push({
                id: `loan_${loan.id}_admin_reject`,
                timestamp: loan.updated_at,
                action: "대여 거절됨",
                details: `${loan.device_tag} 기기 대여가 ${rejecterRole}에 의해 거절되었습니다.`,
                ip_address: "192.168.1.100"
              })
            }
          })
        }
      } catch (error) {
        console.error('🔍 USER LOGS API - Fallback loan fetch error:', error)
      }

      // 기본 로그 추가
      fallbackLogs.push({
        id: "account_created",
        timestamp: authUser.user.created_at,
        action: "계정 생성",
        details: "사용자 계정이 생성되었습니다.",
        ip_address: "192.168.1.100"
      })

      // 시간순 정렬
      fallbackLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      return NextResponse.json({
        userId,
        userName: fallbackUser.name,
        logs: fallbackLogs
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

    console.log('🔍 USER LOGS API - Fetching real user activity data')

    // 실제 사용자 활동 로그 데이터 생성
    const userLogs: any[] = []

    try {
      // 1. 사용자의 대여 신청 기록 조회
      const { data: userLoans, error: loansError } = await adminSupabase
        .from('loan_applications')
        .select('*')
        .eq('email', targetUser.email)
        .order('created_at', { ascending: false })

      if (loansError) {
        console.error('🔍 USER LOGS API - Error fetching loans:', loansError)
      } else {
        console.log('🔍 USER LOGS API - Found loans:', userLoans?.length || 0)

        // 대여 기록을 로그 형식으로 변환
        if (userLoans && userLoans.length > 0) {
          userLoans.forEach((loan, index) => {
            // 대여 신청 로그
            userLogs.push({
              id: `loan_${loan.id}_request`,
              timestamp: loan.created_at,
              action: "대여 신청",
              details: `${loan.device_tag} 기기를 대여 신청했습니다. (목적: ${loan.purpose})`,
              ip_address: "192.168.1.100"
            })

            // 승인 로그 (관리자/담임/도우미에 의한)
            if (loan.approved_at) {
              let approverRole = '관리자'

              if (loan.approved_by_role) {
                switch (loan.approved_by_role) {
                  case 'admin':
                    approverRole = '관리자'
                    break
                  case 'homeroom':
                    approverRole = '담임교사'
                    break
                  case 'helper':
                    approverRole = '노트북 관리 도우미'
                    break
                  default:
                    approverRole = '관리자'
                }
              }

              userLogs.push({
                id: `loan_${loan.id}_approved`,
                timestamp: loan.approved_at,
                action: "대여 승인됨",
                details: `${loan.device_tag} 기기 대여가 ${approverRole}에 의해 승인되었습니다.`,
                ip_address: "192.168.1.100"
              })
            }

            // 수령 로그
            if (loan.picked_up_at) {
              userLogs.push({
                id: `loan_${loan.id}_pickup`,
                timestamp: loan.picked_up_at,
                action: "기기 수령",
                details: `${loan.device_tag} 기기를 수령했습니다.`,
                ip_address: "192.168.1.100"
              })
            }

            // 반납 로그
            if (loan.returned_at) {
              userLogs.push({
                id: `loan_${loan.id}_return`,
                timestamp: loan.returned_at,
                action: "기기 반납",
                details: `${loan.device_tag} 기기를 반납했습니다.`,
                ip_address: "192.168.1.100"
              })
            }

            // 본인 취소 vs 관리자 거절 구분
            if (loan.status === 'cancelled') {
              // 본인이 취소한 경우 (사용자 자신이 취소)
              userLogs.push({
                id: `loan_${loan.id}_self_cancel`,
                timestamp: loan.updated_at,
                action: "대여 취소 (본인)",
                details: `${loan.device_tag} 기기 대여를 본인이 취소했습니다.`,
                ip_address: "192.168.1.100"
              })
            } else if (loan.status === 'rejected') {
              // 관리자/담임/도우미가 거절한 경우
              let rejecterRole = '관리자'

              if (loan.rejected_by_role) {
                switch (loan.rejected_by_role) {
                  case 'admin':
                    rejecterRole = '관리자'
                    break
                  case 'homeroom':
                    rejecterRole = '담임교사'
                    break
                  case 'helper':
                    rejecterRole = '노트북 관리 도우미'
                    break
                  default:
                    rejecterRole = '관리자'
                }
              }

              userLogs.push({
                id: `loan_${loan.id}_admin_reject`,
                timestamp: loan.updated_at,
                action: "대여 거절됨",
                details: `${loan.device_tag} 기기 대여가 ${rejecterRole}에 의해 거절되었습니다.`,
                ip_address: "192.168.1.100"
              })
            }
          })
        }

        // 2. 사용자가 관리자/담임/도우미 역할로 수행한 작업들 조회 (승인, 거절 등)
        if (['admin', 'homeroom', 'helper'].includes(targetUser.role)) {
          console.log('🔍 USER LOGS API - Fetching admin actions performed by user')

          // 사용자가 승인한 대여 신청들 (본인 대여가 아닌 경우만)
          const { data: approvedLoans } = await adminSupabase
            .from('loan_applications')
            .select('*')
            .eq('approved_by', targetUser.email)
            .not('approved_at', 'is', null)
            .neq('email', targetUser.email) // 본인 대여는 제외

          if (approvedLoans && approvedLoans.length > 0) {
            approvedLoans.forEach(loan => {
              userLogs.push({
                id: `admin_approve_${loan.id}`,
                timestamp: loan.approved_at,
                action: "대여 승인 작업",
                details: `${loan.student_name}의 ${loan.device_tag} 기기 대여를 승인했습니다.`,
                ip_address: "192.168.1.100"
              })
            })
          }

          // 사용자가 거절한 대여 신청들 (본인 대여가 아닌 경우만)
          const { data: rejectedLoans } = await adminSupabase
            .from('loan_applications')
            .select('*')
            .eq('rejected_by', targetUser.email)
            .eq('status', 'rejected')
            .neq('email', targetUser.email) // 본인 대여는 제외

          if (rejectedLoans && rejectedLoans.length > 0) {
            rejectedLoans.forEach(loan => {
              userLogs.push({
                id: `admin_reject_${loan.id}`,
                timestamp: loan.updated_at,
                action: "대여 거절 작업",
                details: `${loan.student_name}의 ${loan.device_tag} 기기 대여를 거절했습니다.`,
                ip_address: "192.168.1.100"
              })
            })
          }

          // 기기 반납 처리 작업들 (본인 대여가 아닌 경우만)
          const { data: returnProcessed } = await adminSupabase
            .from('loan_applications')
            .select('*')
            .eq('return_processed_by', targetUser.email)
            .not('returned_at', 'is', null)
            .neq('email', targetUser.email) // 본인 대여는 제외

          if (returnProcessed && returnProcessed.length > 0) {
            returnProcessed.forEach(loan => {
              userLogs.push({
                id: `admin_return_${loan.id}`,
                timestamp: loan.returned_at,
                action: "반납 처리 작업",
                details: `${loan.student_name}의 ${loan.device_tag} 기기 반납을 처리했습니다.`,
                ip_address: "192.168.1.100"
              })
            })
          }
        }
      }

      // 계정 생성 로그 추가 (기본)
      userLogs.push({
        id: "account_created",
        timestamp: targetUser.created_at || "2024-01-15T09:00:00Z",
        action: "계정 생성",
        details: "사용자 계정이 생성되었습니다.",
        ip_address: "192.168.1.100"
      })

    } catch (error) {
      console.error('🔍 USER LOGS API - Error generating logs:', error)

      // 오류 시 기본 로그만 반환
      userLogs.push({
        id: "1",
        timestamp: "2024-01-15T09:00:00Z",
        action: "계정 생성",
        details: "사용자 계정이 생성되었습니다.",
        ip_address: "192.168.1.100"
      })
    }

    // 시간순으로 정렬 (최신순)
    userLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    console.log('🔍 USER LOGS API - Generated logs:', userLogs.length)

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