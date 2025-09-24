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
        console.log('🔍 DEVICE HISTORY - Device ID:', deviceId)
        console.log('🔍 DEVICE HISTORY - Match result:', deviceMatch)
        console.log('🔍 DEVICE HISTORY - Parsed values:', { grade, classNum, deviceNum })
        console.log('🔍 DEVICE HISTORY - Final device tag:', deviceTag)
      } else {
        console.log('🔍 DEVICE HISTORY - Device ID did not match pattern:', deviceId)
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

          // 각 대여 기록의 상태와 날짜 상세 확인
          if (loans && loans.length > 0) {
            loans.forEach((loan, index) => {
              console.log(`🔍 DEVICE HISTORY - Loan ${index + 1}:`, {
                id: loan.id,
                student_name: loan.student_name,
                status: loan.status,
                created_at: loan.created_at,
                approved_at: loan.approved_at,
                picked_up_at: loan.picked_up_at,
                returned_at: loan.returned_at,
                updated_at: loan.updated_at,
                device_tag: loan.device_tag
              })
            })
          }

          // 대여 기록을 기기 이력 형식으로 변환 (모든 기록 포함)
          if (loans && loans.length > 0) {
            loans.forEach((loan, index) => {
              console.log(`🔍 DEVICE HISTORY - Processing loan ${index + 1}:`, loan)

              // 🔥 새로운 접근: 상태를 간단하게 결정하기
              let koreanStatus = '알 수 없음'

              // 1. 먼저 returned_at 필드 체크 (가장 우선)
              if (loan.returned_at &&
                  loan.returned_at !== null &&
                  loan.returned_at.toString().trim() !== '' &&
                  loan.returned_at !== 'null') {
                koreanStatus = '반납완료'
                console.log(`🔥 LOAN ${index + 1}: returned_at 발견 -> 반납완료`)
              }
              // 2. status 필드가 'returned'인 경우
              else if (loan.status === 'returned') {
                koreanStatus = '반납완료'
                console.log(`🔥 LOAN ${index + 1}: status=returned -> 반납완료`)
              }
              // 3. 기타 상태들
              else {
                switch (loan.status) {
                  case 'requested':
                    koreanStatus = '대여신청중'
                    break
                  case 'approved':
                  case 'picked_up':
                    koreanStatus = '대여중'
                    break
                  case 'rejected':
                  case 'cancelled':
                    koreanStatus = '취소됨'
                    break
                  case 'maintenance':
                    koreanStatus = '점검중'
                    break
                  default:
                    koreanStatus = `원본상태: ${loan.status}`
                }
                console.log(`🔥 LOAN ${index + 1}: status=${loan.status} -> ${koreanStatus}`)
              }

              console.log(`🔥 LOAN ${index + 1} 최종 결정:`, {
                원본_status: loan.status,
                원본_returned_at: loan.returned_at,
                최종_한국어상태: koreanStatus
              })

              deviceHistory.push({
                student_name: loan.student_name,
                class_name: loan.class_name,
                created_at: loan.created_at,
                returned_at: loan.returned_at,
                status: koreanStatus,
                purpose: loan.purpose,
                original_status: loan.status // 디버깅용
              })
            })

            console.log('🔍 DEVICE HISTORY - Total loan records found:', loans.length)
            console.log('🔍 DEVICE HISTORY - All records included in history')
          }
        }
      }

    } catch (error) {
      console.error('🔍 DEVICE HISTORY - Error fetching device history:', error)
    }

    // 현재 기기 상태도 확인하여 이력에 추가 (점검중 등의 관리 상태)
    try {
      // device_tag를 asset_tag로 변환하여 현재 기기 정보 조회
      const deviceMatch = deviceId.match(/ICH-(\d)(\d{2})(\d{2})/)
      if (deviceMatch) {
        const { data: deviceInfo, error: deviceError } = await adminSupabase
          .from('devices')
          .select('status, updated_at, notes')
          .eq('asset_tag', deviceId)
          .single()

        if (deviceError) {
          console.log('🔍 DEVICE HISTORY - No device info found:', deviceError)
        } else if (deviceInfo) {
          // 관리자/도우미/담임교사가 직접 상태를 변경한 경우 (notes에 "상태 변경" 포함)
          if (deviceInfo.notes && deviceInfo.notes.includes('상태 변경')) {
            let changerName = '관리자'
            let changerClass = '시스템'
            let statusKorean = '알 수 없음'
            let purpose = '상태 변경'

            // notes에서 변경자 정보 추출
            if (deviceInfo.notes) {
              const changerMatch = deviceInfo.notes.match(/변경자:\s*([^)]+)\s*\([^)]+\)/)
              if (changerMatch) {
                changerName = changerMatch[1]
                changerClass = '관리작업'
              }

              // 상태 정보 추출
              const statusMatch = deviceInfo.notes.match(/상태 변경:\s*([^\s(]+)/)
              if (statusMatch) {
                statusKorean = statusMatch[1]
              }

              // 추가 메모가 있으면 purpose로 사용
              const notesParts = deviceInfo.notes.split(' - ')
              if (notesParts.length > 1) {
                purpose = notesParts[1]
              }
            }

            // 상태에 따라 반납일 설정
            const returnedAt = (statusKorean === '대여가능') ? deviceInfo.updated_at : null

            deviceHistory.push({
              student_name: changerName,
              class_name: changerClass,
              created_at: deviceInfo.updated_at || new Date().toISOString(),
              returned_at: returnedAt,
              status: statusKorean,
              purpose: purpose,
              original_status: `admin_change_${deviceInfo.status}`
            })
            console.log('🔍 DEVICE HISTORY - Added admin status change:', { changerName, statusKorean })
          }
        }
      }
    } catch (error) {
      console.error('🔍 DEVICE HISTORY - Error fetching current device status:', error)
    }

    console.log('🔍 DEVICE HISTORY - Total history entries (including current status):', deviceHistory.length)

    // 시간순으로 정렬 (최신순)
    deviceHistory.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    console.log('🔍 DEVICE HISTORY - Total history entries:', deviceHistory.length)

    // 최종 반환 전 데이터 확인
    console.log('🔍 DEVICE HISTORY - FINAL RETURN DATA:')
    deviceHistory.forEach((entry, index) => {
      console.log(`  Entry ${index + 1}:`, {
        student: entry.student_name,
        status: entry.status,
        created_at: entry.created_at,
        returned_at: entry.returned_at
      })
    })

    const response = {
      deviceId,
      history: deviceHistory,
      debug: {
        message: 'Using real loan data from loan_applications table',
        deviceId,
        historyFound: deviceHistory.length > 0,
        totalRecords: deviceHistory.length
      }
    }

    console.log('🔍 DEVICE HISTORY - RESPONSE OBJECT:', JSON.stringify(response, null, 2))

    return NextResponse.json(response)

  } catch (error) {
    console.error('Device history API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}