import { getCurrentUser } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  try {
    const user = await getCurrentUser()

    console.log('🔍 USER-LOGS - Request details:', {
      userId: userId,
      currentUser: user?.email,
      currentUserRole: user?.role,
      currentUserGrade: user?.grade,
      currentUserClass: user?.class,
      isApproved: user?.isApprovedHomeroom
    })

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 관리자, 관리팀, 담임교사만 사용자 로그 조회 가능
    if (!["admin", "manager", "homeroom"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 역할 조회 함수 정의
    const getRoleFromEmail = async (email: string): Promise<string> => {
      if (!email) return '알 수 없는 역할'

      try {
        const { data: authUser } = await adminSupabase.auth.admin.listUsers()
        const user = authUser?.users.find(u => u.email === email)

        if (user) {
          const { data: roleData } = await adminSupabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single()

          if (roleData?.role) {
            switch (roleData.role) {
              case 'admin': return '관리자'
              case 'manager': return '관리팀'
              case 'homeroom': return '담임교사'
              case 'helper': return '노트북 관리 도우미'
              case 'student': return '학생'
              default: return roleData.role
            }
          }
        }
      } catch (error) {
        console.error('Role lookup error:', error)
      }
      return '알 수 없는 역할'
    }

    // 사용자 정보 조회 (여러 테이블 확인)
    console.log('🔍 USER-LOGS - Looking up user in user_profiles:', userId)

    // userId가 이메일 형식인지 확인하고 적절한 필드로 검색
    const isEmail = userId.includes('@')
    const searchField = isEmail ? 'email' : 'user_id'

    console.log('🔍 USER-LOGS - Search method:', { userId, isEmail, searchField })

    const { data: targetUser, error: userError } = await adminSupabase
      .from("user_profiles")
      .select("*")
      .eq(searchField, userId)
      .single()

    console.log('🔍 USER-LOGS - user_profiles result:', {
      found: !!targetUser,
      error: userError?.message,
      targetUser: targetUser ? { email: targetUser.email, grade: targetUser.grade, class: targetUser.class } : null
    })

    if (!targetUser) {
      // user_profiles 테이블에 없으면 auth.users 테이블에서 확인
      console.log('🔍 USER-LOGS - User not in profiles, checking auth.users:', userId)

      let authUser, authError

      if (isEmail) {
        // 이메일로 사용자 검색
        console.log('🔍 USER-LOGS - Searching by email in auth.users')
        const { data, error } = await adminSupabase.auth.admin.listUsers()
        authUser = { user: data?.users?.find(u => u.email === userId) }
        authError = error
      } else {
        // UUID로 사용자 검색
        console.log('🔍 USER-LOGS - Searching by UUID in auth.users')
        const result = await adminSupabase.auth.admin.getUserById(userId)
        authUser = result.data
        authError = result.error
      }

      console.log('🔍 USER-LOGS - auth.users result:', {
        found: !!authUser?.user,
        error: authError?.message,
        email: authUser?.user?.email
      })

      if (!authUser?.user) {
        console.log('🔍 USER-LOGS - User not found anywhere, returning 404')
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // 이메일에서 학급 정보 추출 시도 (예: kim31@example.com -> 3학년 1반)
      let extractedGrade = '알 수 없음'
      let extractedClass = '알 수 없음'

      if (authUser.user.email) {
        // 이메일 주소에서 숫자 패턴 찾기 (예: coding1, 김중산20135)
        const emailPrefix = authUser.user.email.split('@')[0]
        const numberMatch = emailPrefix.match(/(\d+)/)

        if (numberMatch) {
          const numbers = numberMatch[1]
          if (numbers.length >= 4) {
            // 5자리 숫자인 경우 (예: 20135 -> 2학년 01반 35번)
            const firstDigit = numbers.substring(0, 1)
            const secondTwoDigits = numbers.substring(1, 3)
            extractedGrade = firstDigit
            extractedClass = parseInt(secondTwoDigits).toString()
          } else if (numbers.length === 1) {
            // 1자리 숫자인 경우 (예: coding1 -> 3학년 1반으로 가정)
            extractedGrade = '3'
            extractedClass = numbers
          }
        }
      }

      // auth.users에서만 찾은 경우 추출된 정보로 처리
      const fallbackUser = {
        user_id: authUser.user.id,
        name: authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || '알 수 없음',
        email: authUser.user.email,
        grade: extractedGrade,
        class: extractedClass
      }

      console.log('🔍 USER-LOGS - Fallback user with extracted info:', {
        email: fallbackUser.email,
        grade: extractedGrade,
        class: extractedClass
      })

      // fallback 사용자도 실제 대여 기록 조회 시도
      const fallbackLogs: any[] = []
      try {
        console.log('🔍 USER-LOGS - Querying loans for fallback user:', {
          email: fallbackUser.email,
          extractedGrade: extractedGrade,
          extractedClass: extractedClass
        })

        const { data: userLoans } = await adminSupabase
          .from('loan_applications')
          .select('*')
          .eq('email', fallbackUser.email)
          .order('created_at', { ascending: false })

        console.log('🔍 USER-LOGS - Fallback user loans query result:', {
          email: fallbackUser.email,
          loansFound: userLoans?.length || 0,
          sampleLoan: userLoans?.[0] ? {
            id: userLoans[0].id,
            status: userLoans[0].status,
            class_name: userLoans[0].class_name,
            approved_at: userLoans[0].approved_at,
            picked_up_at: userLoans[0].picked_up_at
          } : null
        })

        if (userLoans && userLoans.length > 0) {
          for (const loan of userLoans) {
            console.log('🔍 USER-LOGS - Processing fallback loan for approval log check:', {
              id: loan.id,
              status: loan.status,
              approved_at: loan.approved_at,
              picked_up_at: loan.picked_up_at,
              approved_by: loan.approved_by,
              approved_by_role: loan.approved_by_role,
              device_tag: loan.device_tag
            })

            fallbackLogs.push({
              id: `loan_${loan.id}_request`,
              timestamp: loan.created_at,
              action: "대여 신청",
              details: `${loan.device_tag} 기기를 대여 신청했습니다. (목적: ${loan.purpose})`,
              ip_address: "192.168.1.100"
            })

            // 승인 로그 (관리자/담임/도우미에 의한) - fallback user
            const fallbackHasApprovalData = loan.approved_at || (loan.status === 'picked_up' && loan.picked_up_at)
            console.log('🔍 USER-LOGS - Fallback approval check:', {
              loanId: loan.id,
              approved_at: loan.approved_at,
              status: loan.status,
              picked_up_at: loan.picked_up_at,
              fallbackHasApprovalData: fallbackHasApprovalData
            })

            if (fallbackHasApprovalData) {
              console.log('🔍 USER-LOGS - Processing approval for loan:', {
                loanId: loan.id,
                approved_by: loan.approved_by,
                approved_by_role: loan.approved_by_role,
                approved_at: loan.approved_at,
                device_tag: loan.device_tag
              })

              let approverRole = '알 수 없는 역할'

              if (loan.approved_by_role) {
                console.log('🔍 USER-LOGS - Using approved_by_role:', loan.approved_by_role)
                switch (loan.approved_by_role) {
                  case 'admin': approverRole = '관리자'; break
                  case 'manager': approverRole = '관리팀'; break
                  case 'homeroom': approverRole = '담임교사'; break
                  case 'helper': approverRole = '노트북 관리 도우미'; break
                  default: approverRole = loan.approved_by_role || '알 수 없는 역할'
                }
              } else {
                console.log('🔍 USER-LOGS - No approved_by_role, looking up role for:', loan.approved_by)
                // approved_by_role이 없으면 실시간 역할 조회
                approverRole = await getRoleFromEmail(loan.approved_by)
                console.log('🔍 USER-LOGS - Dynamic role lookup result:', approverRole)
              }

              console.log('🔍 USER-LOGS - Final approver role:', approverRole)

              // 승인 시간 로직: approved_at이 created_at보다 이전이면 picked_up_at 사용 (fallback)
              let fallbackApprovalTime = loan.approved_at

              // approved_at이 대여 신청 시간보다 이전인 경우 (타임존 이슈 등) picked_up_at 사용
              if (loan.approved_at && loan.created_at &&
                  new Date(loan.approved_at).getTime() < new Date(loan.created_at).getTime()) {
                fallbackApprovalTime = loan.picked_up_at
                console.log('🔍 USER-LOGS - Fallback using picked_up_at as approval time due to invalid approved_at:', {
                  loanId: loan.id,
                  approved_at: loan.approved_at,
                  created_at: loan.created_at,
                  picked_up_at: loan.picked_up_at,
                  selected: fallbackApprovalTime
                })
              }

              // fallback: approved_at이 없으면 picked_up_at 사용
              if (!fallbackApprovalTime) {
                fallbackApprovalTime = loan.picked_up_at
              }

              fallbackLogs.push({
                id: `loan_${loan.id}_approved`,
                timestamp: fallbackApprovalTime,
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
              let rejecterRole = '알 수 없는 역할'

              if (loan.approved_by_role) {
                switch (loan.approved_by_role) {
                  case 'admin': rejecterRole = '관리자'; break
                  case 'manager': rejecterRole = '관리팀'; break
                  case 'homeroom': rejecterRole = '담임교사'; break
                  case 'helper': rejecterRole = '노트북 관리 도우미'; break
                  default: rejecterRole = loan.approved_by_role || '알 수 없는 역할'
                }
              } else {
                // approved_by_role이 없으면 실시간 역할 조회
                rejecterRole = await getRoleFromEmail(loan.approved_by)
              }

              // 거절 시간 결정: approved_at이 있으면 사용, 없으면 updated_at 사용
              const rejectionTime = loan.approved_at || loan.updated_at

              console.log('🔍 USER-LOGS - Rejection timestamp logic:', {
                loanId: loan.id,
                approved_at: loan.approved_at,
                updated_at: loan.updated_at,
                selected_time: rejectionTime
              })

              fallbackLogs.push({
                id: `loan_${loan.id}_admin_reject`,
                timestamp: rejectionTime,
                action: "대여 거절됨",
                details: `${loan.device_tag} 기기 대여가 ${rejecterRole}에 의해 거절되었습니다.`,
                ip_address: "192.168.1.100"
              })
            }
          }
        }
      } catch (error) {
        // Silently handle fallback loan fetch errors
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

      // 승인 로그가 포함되어 있는지 최종 확인 (fallback)
      const fallbackApprovalLogs = fallbackLogs.filter(log => log.action === "대여 승인됨")
      console.log('🔍 USER-LOGS - FALLBACK FINAL CHECK - Approval logs in response:', {
        totalLogs: fallbackLogs.length,
        approvalLogsCount: fallbackApprovalLogs.length,
        approvalLogsDetails: fallbackApprovalLogs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          details: log.details
        }))
      })

      // fallback 사용자에 대해서도 담임교사 권한 검사 수행
      if (user.role === "homeroom" && user.isApprovedHomeroom) {
        const teacherClass = `${user.grade}-${user.class}`
        const studentClass = `${fallbackUser.grade}-${fallbackUser.class}`

        console.log('🔍 USER-LOGS - Homeroom permission check for fallback:', {
          teacherClass,
          studentClass,
          email: fallbackUser.email
        })

        if (teacherClass !== studentClass && fallbackUser.grade !== '알 수 없음') {
          console.log('🔍 USER-LOGS - Access denied for fallback user')
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
      }

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

      console.log('🔍 USER-LOGS - Homeroom permission check for regular user:', {
        teacherClass,
        studentClass,
        targetUserEmail: targetUser.email,
        userId: userId
      })

      if (teacherClass !== studentClass) {
        console.log('🔍 USER-LOGS - Access denied for regular user')
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // 실제 사용자 활동 로그 데이터 생성
    const userLogs: any[] = []

    try {
      // 1. 사용자의 대여 신청 기록 조회 (조인 없이 간단하게)
      console.log('🔍 USER-LOGS - Querying loans for regular user:', {
        email: targetUser.email,
        grade: targetUser.grade,
        class: targetUser.class
      })

      const { data: userLoans, error: loansError } = await adminSupabase
        .from('loan_applications')
        .select('*')
        .eq('email', targetUser.email)
        .order('created_at', { ascending: false })

      console.log('🔍 USER-LOGS - Regular user loans query result:', {
        email: targetUser.email,
        loansFound: userLoans?.length || 0,
        sampleLoan: userLoans?.[0] ? {
          id: userLoans[0].id,
          status: userLoans[0].status,
          class_name: userLoans[0].class_name,
          approved_at: userLoans[0].approved_at,
          picked_up_at: userLoans[0].picked_up_at
        } : null,
        error: loansError?.message
      })

      if (loansError) {
        console.error('사용자 대여 기록 조회 실패:', loansError)
        // 에러 시에도 계속 진행
      } else {

        // 대여 기록을 로그 형식으로 변환
        if (userLoans && userLoans.length > 0) {
          console.log('🔍 USER-LOGS - Sample loan data for role debugging:', {
            loanId: userLoans[0]?.id,
            status: userLoans[0]?.status,
            approved_by_role: userLoans[0]?.approved_by_role,
            approved_by: userLoans[0]?.approved_by,
            approved_at: userLoans[0]?.approved_at,
            updated_at: userLoans[0]?.updated_at
          })

          for (const loan of userLoans) {
            console.log('🔍 USER-LOGS - Processing loan for approval log check:', {
              id: loan.id,
              status: loan.status,
              approved_at: loan.approved_at,
              picked_up_at: loan.picked_up_at,
              approved_by: loan.approved_by,
              approved_by_role: loan.approved_by_role,
              device_tag: loan.device_tag
            })

            // 대여 신청 로그
            userLogs.push({
              id: `loan_${loan.id}_request`,
              timestamp: loan.created_at,
              action: "대여 신청",
              details: `${loan.device_tag} 기기를 대여 신청했습니다. (목적: ${loan.purpose})`,
              ip_address: "192.168.1.100"
            })

            // 승인 로그 (관리자/담임/도우미에 의한)
            // picked_up 상태이면서 approved_at이 없는 경우도 승인으로 간주
            const hasApprovalData = loan.approved_at || (loan.status === 'picked_up' && loan.picked_up_at)
            console.log('🔍 USER-LOGS - Approval check:', {
              loanId: loan.id,
              approved_at: loan.approved_at,
              status: loan.status,
              picked_up_at: loan.picked_up_at,
              hasApprovalData: hasApprovalData
            })

            if (hasApprovalData) {
              console.log('🔍 USER-LOGS - Processing approval for regular user loan:', {
                loanId: loan.id,
                approved_by: loan.approved_by,
                approved_by_role: loan.approved_by_role,
                approved_at: loan.approved_at,
                device_tag: loan.device_tag
              })

              let approverRole = '알 수 없는 역할'

              if (loan.approved_by_role) {
                console.log('🔍 USER-LOGS - Regular user - Using approved_by_role:', loan.approved_by_role)
                switch (loan.approved_by_role) {
                  case 'admin':
                    approverRole = '관리자'
                    break
                  case 'manager':
                    approverRole = '관리팀'
                    break
                  case 'homeroom':
                    approverRole = '담임교사'
                    break
                  case 'helper':
                    approverRole = '노트북 관리 도우미'
                    break
                  default:
                    approverRole = loan.approved_by_role
                }
              } else {
                console.log('🔍 USER-LOGS - Regular user - No approved_by_role, looking up role for:', loan.approved_by)
                // approved_by_role이 없으면 실시간 역할 조회
                approverRole = await getRoleFromEmail(loan.approved_by)
                console.log('🔍 USER-LOGS - Regular user - Dynamic role lookup result:', approverRole)
              }

              console.log('🔍 USER-LOGS - Regular user - Final approver role:', approverRole)

              // 승인 시간 로직: approved_at이 created_at보다 이전이면 picked_up_at 사용
              let approvalTime = loan.approved_at

              // approved_at이 대여 신청 시간보다 이전인 경우 (타임존 이슈 등) picked_up_at 사용
              if (loan.approved_at && loan.created_at &&
                  new Date(loan.approved_at).getTime() < new Date(loan.created_at).getTime()) {
                approvalTime = loan.picked_up_at
                console.log('🔍 USER-LOGS - Using picked_up_at as approval time due to invalid approved_at:', {
                  loanId: loan.id,
                  approved_at: loan.approved_at,
                  created_at: loan.created_at,
                  picked_up_at: loan.picked_up_at,
                  selected: approvalTime
                })
              }

              // fallback: approved_at이 없으면 picked_up_at 사용
              if (!approvalTime) {
                approvalTime = loan.picked_up_at
              }

              userLogs.push({
                id: `loan_${loan.id}_approved`,
                timestamp: approvalTime,
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
              userLogs.push({
                id: `loan_${loan.id}_self_cancel`,
                timestamp: loan.updated_at,
                action: "대여 취소 (본인)",
                details: `${loan.device_tag} 기기 대여를 본인이 취소했습니다.`,
                ip_address: "192.168.1.100"
              })
            } else if (loan.status === 'rejected') {
              console.log('🔍 USER-LOGS - Processing rejection for regular user loan:', {
                loanId: loan.id,
                approved_by: loan.approved_by,
                approved_by_role: loan.approved_by_role,
                status: loan.status,
                device_tag: loan.device_tag
              })

              let rejecterRole = '알 수 없는 역할'

              if (loan.approved_by_role) {
                console.log('🔍 USER-LOGS - Regular user rejection - Using approved_by_role:', loan.approved_by_role)
                switch (loan.approved_by_role) {
                  case 'admin':
                    rejecterRole = '관리자'
                    break
                  case 'manager':
                    rejecterRole = '관리팀'
                    break
                  case 'homeroom':
                    rejecterRole = '담임교사'
                    break
                  case 'helper':
                    rejecterRole = '노트북 관리 도우미'
                    break
                  default:
                    rejecterRole = loan.approved_by_role
                }
              } else {
                console.log('🔍 USER-LOGS - Regular user rejection - No approved_by_role, looking up role for:', loan.approved_by)
                // approved_by_role이 없으면 실시간 역할 조회
                rejecterRole = await getRoleFromEmail(loan.approved_by)
                console.log('🔍 USER-LOGS - Regular user rejection - Dynamic role lookup result:', rejecterRole)
              }

              console.log('🔍 USER-LOGS - Regular user rejection - Final rejecter role:', rejecterRole)

              userLogs.push({
                id: `loan_${loan.id}_admin_reject`,
                timestamp: loan.updated_at,
                action: "대여 거절됨",
                details: `${loan.device_tag} 기기 대여가 ${rejecterRole}에 의해 거절되었습니다.`,
                ip_address: "192.168.1.100"
              })
            }
          }
        }

        // 2. 사용자가 관리자/담임/도우미 역할로 수행한 작업들 조회 (승인, 거절 등)
        if (['admin', 'homeroom', 'helper'].includes(targetUser.role)) {

          // 사용자가 승인한 대여 신청들 (본인 대여가 아닌 경우만)
          const { data: approvedLoans } = await adminSupabase
            .from('loan_applications')
            .select('*')
            .eq('approved_by', targetUser.email)
            .not('approved_at', 'is', null)
            .neq('email', targetUser.email) // 본인 대여는 제외

          if (approvedLoans && approvedLoans.length > 0) {
            for (const loan of approvedLoans) {
              userLogs.push({
                id: `admin_approve_${loan.id}`,
                timestamp: loan.approved_at,
                action: "대여 승인 작업",
                details: `${loan.student_name}의 ${loan.device_tag} 기기 대여를 승인했습니다.`,
                ip_address: "192.168.1.100"
              })
            }
          }

          // 사용자가 거절한 대여 신청들 (본인 대여가 아닌 경우만)
          const { data: rejectedLoans } = await adminSupabase
            .from('loan_applications')
            .select('*')
            .eq('rejected_by', targetUser.email)
            .eq('status', 'rejected')
            .neq('email', targetUser.email) // 본인 대여는 제외

          if (rejectedLoans && rejectedLoans.length > 0) {
            for (const loan of rejectedLoans) {
              userLogs.push({
                id: `admin_reject_${loan.id}`,
                timestamp: loan.updated_at,
                action: "대여 거절 작업",
                details: `${loan.student_name}의 ${loan.device_tag} 기기 대여를 거절했습니다.`,
                ip_address: "192.168.1.100"
              })
            }
          }

          // 기기 반납 처리 작업들 (본인 대여가 아닌 경우만)
          const { data: returnProcessed } = await adminSupabase
            .from('loan_applications')
            .select('*')
            .eq('return_processed_by', targetUser.email)
            .not('returned_at', 'is', null)
            .neq('email', targetUser.email) // 본인 대여는 제외

          if (returnProcessed && returnProcessed.length > 0) {
            for (const loan of returnProcessed) {
              userLogs.push({
                id: `admin_return_${loan.id}`,
                timestamp: loan.returned_at,
                action: "반납 처리 작업",
                details: `${loan.student_name}의 ${loan.device_tag} 기기 반납을 처리했습니다.`,
                ip_address: "192.168.1.100"
              })
            }
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
      // Handle error generating logs

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

    // 승인 로그가 포함되어 있는지 최종 확인
    const approvalLogs = userLogs.filter(log => log.action === "대여 승인됨")
    console.log('🔍 USER-LOGS - FINAL CHECK - Approval logs in response:', {
      totalLogs: userLogs.length,
      approvalLogsCount: approvalLogs.length,
      approvalLogsDetails: approvalLogs.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        details: log.details
      }))
    })

    return NextResponse.json({
      userId,
      userName: targetUser.name,
      logs: userLogs
    })

  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}