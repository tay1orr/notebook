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

    try {
      console.log('🔍 DEVICE HISTORY - Fetching real loan data from database')

      // device_tag 형식으로 변환 (ICH-30135 -> 3-01-35)
      const deviceMatch = deviceId.match(/ICH-(\d)(\d{2})(\d{2})/)
      let deviceTag = ''
      if (deviceMatch) {
        const grade = deviceMatch[1]
        const classNum = parseInt(deviceMatch[2]).toString()
        const deviceNum = parseInt(deviceMatch[3]).toString()
        deviceTag = `${grade}-${classNum}-${deviceNum}`
        console.log('🔍 DEVICE HISTORY - Device tag converted:', deviceId, '->', deviceTag)
      }

      if (deviceTag) {
        // 해당 기기에 대한 모든 대여 신청 기록 조회
        const { data: loans, error } = await adminSupabase
          .from('loan_applications')
          .select('*')
          .eq('device_tag', deviceTag)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('🔍 DEVICE HISTORY - Database error:', error)
        } else {
          console.log('🔍 DEVICE HISTORY - Found loan records:', loans?.length || 0)
          console.log('🔍 DEVICE HISTORY - Raw loan records:', JSON.stringify(loans, null, 2))

          // 대여 기록을 기기 이력 형식으로 변환
          if (loans && loans.length > 0) {
            loans.forEach(loan => {
              deviceHistory.push({
                student_name: loan.student_name,
                class_name: loan.class_name,
                created_at: loan.created_at,
                returned_at: loan.returned_at,
                status: loan.status,
                purpose: loan.purpose
              })
            })
          }
        }
      }

      console.log('🔍 DEVICE HISTORY - Total history entries:', deviceHistory.length)

    } catch (error) {
      console.error('🔍 DEVICE HISTORY - Error fetching device history:', error)
    }

    // 시간순으로 정렬 (최신순)
    deviceHistory.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    console.log('🔍 DEVICE HISTORY - Total history entries:', deviceHistory.length)

    return NextResponse.json({
      deviceId,
      history: deviceHistory,
      debug: {
        message: 'Using real loan data from loan_applications table',
        deviceId,
        historyFound: deviceHistory.length > 0,
        totalRecords: deviceHistory.length
      }
    })

  } catch (error) {
    console.error('Device history API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}