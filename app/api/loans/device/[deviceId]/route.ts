import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { deviceId: string } }
) {
  try {
    const supabase = createServerClient()
    const adminSupabase = createAdminClient()

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 역할 확인
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const currentRole = userRole?.role || 'student'
    const isAdmin = user.email === 'taylorr@gclass.ice.go.kr'

    // 관리자, 담임교사, 노트북 관리 도우미만 접근 가능
    if (!isAdmin && !['admin', 'homeroom', 'helper'].includes(currentRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deviceId } = params
    const deviceHistory: any[] = []

    console.log('🔍 DEVICE HISTORY - Fetching history for device:', deviceId)

    // 기기 번호에서 학년과 반 추출 (예: ICH-20111 -> 2학년 1반)
    let deviceGrade: number | null = null
    let deviceClass: number | null = null
    const deviceMatch = deviceId.match(/ICH-(\d)(\d{2})(\d{2})/)
    if (deviceMatch) {
      deviceGrade = parseInt(deviceMatch[1])
      deviceClass = parseInt(deviceMatch[2])
    }

    // 담임교사나 도우미인 경우 자신의 반 기기만 접근 가능
    if ((currentRole === 'homeroom' || currentRole === 'helper') && userRole) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('grade, class')
        .eq('user_id', user.id)
        .single()

      if (userProfile?.grade && userProfile?.class) {
        const userGrade = parseInt(userProfile.grade)
        const userClass = parseInt(userProfile.class)

        // 담임교사는 승인된 경우만 접근 가능
        if (currentRole === 'homeroom') {
          const { data: homeroomApproval } = await supabase
            .from('user_profiles')
            .select('approved_homeroom')
            .eq('user_id', user.id)
            .single()

          if (!homeroomApproval?.approved_homeroom) {
            return NextResponse.json({ error: 'Unauthorized - Homeroom approval required' }, { status: 401 })
          }
        }

        // 해당 기기가 자신의 반 기기인지 확인
        if (deviceGrade !== userGrade || deviceClass !== userClass) {
          return NextResponse.json({ error: 'Unauthorized - Class mismatch' }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: 'Unauthorized - No class information' }, { status: 401 })
      }
    }

    try {
      // device_tag로 관련된 모든 대여 기록 조회
      const { data: loans, error: loansError } = await adminSupabase
        .from('loans')
        .select('*')
        .or(`device_tag.eq.${deviceId},device_tag.like.%${deviceId.split('-').slice(-2).join('-')}%`)
        .order('created_at', { ascending: false })

      console.log('🔍 DEVICE HISTORY - Loans query result:', { count: loans?.length || 0, error: loansError })

      if (loans) {
        loans.forEach(loan => {
          // 대여 신청
          deviceHistory.push({
            timestamp: loan.created_at,
            action: '대여 신청',
            details: `${loan.student_name || '알 수 없음'}이 기기를 신청했습니다.`,
            metadata: {
              student_name: loan.student_name,
              class_name: loan.class_name,
              purpose: loan.purpose,
              status: loan.status
            }
          })

          // 승인
          if (loan.approved_at) {
            deviceHistory.push({
              timestamp: loan.approved_at,
              action: '대여 승인',
              details: `대여 신청이 승인되었습니다. (승인자: ${loan.approved_by || '알 수 없음'})`,
              metadata: {
                approved_by: loan.approved_by,
                student_name: loan.student_name
              }
            })
          }

          // 수령
          if (loan.picked_up_at) {
            deviceHistory.push({
              timestamp: loan.picked_up_at,
              action: '기기 수령',
              details: `${loan.student_name || '알 수 없음'}이 기기를 수령했습니다.`,
              metadata: {
                student_name: loan.student_name,
                class_name: loan.class_name
              }
            })
          }

          // 반납
          if (loan.returned_at) {
            deviceHistory.push({
              timestamp: loan.returned_at,
              action: '기기 반납',
              details: `${loan.student_name || '알 수 없음'}이 기기를 반납했습니다.`,
              metadata: {
                student_name: loan.student_name,
                return_condition: loan.return_condition,
                receiver_name: loan.receiver_name
              }
            })
          }

          // 거절
          if (loan.status === 'rejected') {
            deviceHistory.push({
              timestamp: loan.updated_at || loan.created_at,
              action: '대여 거절',
              details: `대여 신청이 거절되었습니다.`,
              metadata: {
                student_name: loan.student_name,
                notes: loan.notes
              }
            })
          }
        })
      }

    } catch (error) {
      console.error('Error fetching device history:', error)
    }

    // 시간순으로 정렬 (최신순)
    deviceHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    console.log('🔍 DEVICE HISTORY - Total history entries:', deviceHistory.length)

    return NextResponse.json({
      deviceId,
      history: deviceHistory
    })

  } catch (error) {
    console.error('Device history API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}