import { createAdminClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { deviceId: string } }
) {
  try {
    const adminSupabase = createAdminClient()

    // getCurrentUser 함수를 사용해서 제대로 처리된 사용자 정보 가져오기
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 관리자, 담임교사, 노트북 관리 도우미만 접근 가능
    if (!['admin', 'homeroom', 'helper'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deviceId } = params
    const deviceHistory: any[] = []

    console.log('🔍 DEVICE HISTORY - Fetching history for device:', deviceId)
    console.log('🔍 DEVICE HISTORY - Current user:', user.email, 'Role:', user.role)

    // 기기 번호에서 학년과 반 추출 (예: ICH-20111 -> 2학년 1반)
    let deviceGrade: number | null = null
    let deviceClass: number | null = null
    const deviceMatch = deviceId.match(/ICH-(\d)(\d{2})(\d{2})/)
    if (deviceMatch) {
      deviceGrade = parseInt(deviceMatch[1])
      deviceClass = parseInt(deviceMatch[2])
      console.log('🔍 DEVICE HISTORY - Device parsed:', { deviceGrade, deviceClass, match: deviceMatch })
    }

    // 담임교사나 도우미인 경우 자신의 반 기기만 접근 가능 (관리자는 제외)
    if (user.role !== 'admin' && (user.role === 'homeroom' || user.role === 'helper')) {
      console.log('🔍 DEVICE HISTORY - User info:', { grade: user.grade, class: user.class, isApprovedHomeroom: user.isApprovedHomeroom })

      if (user.grade && user.class) {
        const userGrade = parseInt(user.grade)
        const userClass = parseInt(user.class)

        console.log('🔍 DEVICE HISTORY - User class info:', { userGrade, userClass })
        console.log('🔍 DEVICE HISTORY - Comparing:', { deviceGrade, deviceClass, userGrade, userClass })

        // 담임교사는 승인된 경우만 접근 가능
        if (user.role === 'homeroom' && !user.isApprovedHomeroom) {
          console.log('🔍 DEVICE HISTORY - Homeroom not approved')
          return NextResponse.json({ error: 'Unauthorized - Homeroom approval required' }, { status: 401 })
        }

        // 해당 기기가 자신의 반 기기인지 확인
        if (deviceGrade !== userGrade || deviceClass !== userClass) {
          console.log('🔍 DEVICE HISTORY - Class mismatch:', { deviceGrade, deviceClass, userGrade, userClass })
          return NextResponse.json({ error: 'Unauthorized - Class mismatch' }, { status: 401 })
        }
      } else {
        console.log('🔍 DEVICE HISTORY - No class information:', { grade: user.grade, class: user.class })
        return NextResponse.json({ error: 'Unauthorized - No class information' }, { status: 401 })
      }
    }

    // 변수들을 먼저 선언
    let allLoans: any[] = []
    let sampleTags: any[] = []
    let deviceNumber = ''
    let shortTag = ''

    try {
      // 먼저 전체 대여 기록에서 device_tag 패턴 확인
      const { data: loansData } = await adminSupabase
        .from('loans')
        .select('device_tag, student_name, created_at')
        .not('device_tag', 'is', null)
        .limit(50)

      allLoans = loansData || []

      // 응답에 샘플 데이터 포함
      sampleTags = allLoans.map(l => ({
        device_tag: l.device_tag,
        student: l.student_name,
        date: l.created_at?.substring(0, 10)
      })).slice(0, 15)

      // ICH-30135에서 다양한 패턴으로 매칭 시도
      deviceNumber = deviceId.replace('ICH-', '') // 30135
      const grade = deviceNumber.charAt(0) // 3
      const classNum = deviceNumber.substring(1, 3) // 01
      const deviceNum = deviceNumber.substring(3) // 35
      shortTag = `${grade}-${parseInt(classNum)}-${parseInt(deviceNum)}` // 3-1-35

      console.log('🔍 DEVICE HISTORY - Device parsing:', {
        deviceId,
        deviceNumber,
        grade,
        classNum: parseInt(classNum),
        deviceNum: parseInt(deviceNum),
        shortTag
      })

      // 다양한 패턴으로 조회
      const { data: loans, error: loansError } = await adminSupabase
        .from('loans')
        .select('*')
        .or(`device_tag.eq.${deviceId},device_tag.eq.${shortTag},device_tag.like.%${shortTag}%,device_tag.like.%${deviceNumber}%`)
        .order('created_at', { ascending: false })

      console.log('🔍 DEVICE HISTORY - Loans query result:', {
        deviceId,
        shortTag,
        count: loans?.length || 0,
        error: loansError,
        foundTags: loans?.map(l => l.device_tag).slice(0, 5)
      })

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
      history: deviceHistory,
      debug: {
        sampleTags,
        queriedPatterns: {
          deviceId,
          shortTag,
          deviceNumber
        },
        totalLoansInDB: allLoans.length
      }
    })

  } catch (error) {
    console.error('Device history API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}