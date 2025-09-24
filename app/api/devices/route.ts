import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/supabase'
import { getCurrentKoreaTime, getCurrentKoreaDateTimeString } from '@/lib/utils'
import { createAdminClient } from '@/lib/supabase-server'

// GET: 모든 기기 목록 조회
export async function GET() {
  try {
    console.log('🔍 GET /api/devices - Starting request')
    const adminSupabase = createAdminClient()

    // 기기 정보만 조회 (Admin client 사용으로 RLS 우회)
    const { data: devices, error } = await adminSupabase
      .from('devices')
      .select('*')
      .order('asset_tag')

    if (error) {
      console.error('Database error:', error)

      // 데이터베이스에 기기가 없으면 기본 기기들을 생성
      if (error.code === 'PGRST116') {
        return await initializeDevices(adminSupabase)
      }

      return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
    }

    // 기기 데이터가 없으면 기본 기기들을 생성
    if (!devices || devices.length === 0) {
      return await initializeDevices(adminSupabase)
    }

    // 현재 대여중인 대여 정보 조회
    const { data: currentLoans, error: loanError } = await adminSupabase
      .from('loan_applications')
      .select('device_tag, student_name, status')
      .in('status', ['approved', 'picked_up'])

    if (loanError) {
      console.error('Error fetching loan data:', loanError)
    }

    // 현재 대여중인 기기 정보 로깅
    console.log('📊 Current loans:', currentLoans?.length || 0, 'loans found')

    // 대여 정보를 deviceTag 기준으로 매핑
    const loanMap = new Map()
    if (currentLoans && currentLoans.length > 0) {
      currentLoans.forEach(loan => {
        console.log('Processing loan:', loan)
        if (loan.device_tag) {
          // device_tag를 asset_tag 형식으로 변환하여 매핑
          const parts = loan.device_tag.split('-')
          console.log('Device tag parts:', parts)
          if (parts.length === 3) {
            // "2-1-11" -> "20111" (grade + padded class + padded device)
            const grade = parts[0]
            const classNum = parts[1].padStart(2, '0')
            const deviceNum = parts[2].padStart(2, '0')
            const serialNumber = `${grade}${classNum}${deviceNum}`
            const assetTag = `ICH-${serialNumber}`
            console.log(`Mapping ${loan.device_tag} -> ${assetTag} (serial: ${serialNumber})`)
            loanMap.set(assetTag, loan)
          } else {
            // 직접적인 매핑도 시도 (asset_tag가 그대로 들어온 경우)
            console.log(`Direct mapping attempt: ${loan.device_tag}`)
            loanMap.set(loan.device_tag, loan)
          }
        }
      })
    }

    console.log('Final loan mapping size:', loanMap.size)
    console.log('Loan map entries:', Array.from(loanMap.entries()))

    // ICH-20111 기기가 매핑되었는지 확인
    const ich20111Loan = loanMap.get('ICH-20111')
    console.log('ICH-20111 device loan mapping result:', ich20111Loan)

    // 기기 데이터를 프론트엔드 형식으로 변환
    const formattedDevices = devices.map(device => {
      const loan = loanMap.get(device.asset_tag)

      return {
        id: device.asset_tag,
        assetNumber: device.asset_tag,
        model: device.model,
        serialNumber: device.serial_number,
        status: loan ? 'loaned' : mapDeviceStatus(device.status), // 대여 정보가 있으면 강제로 대여중으로 설정
        assignedClass: device.assigned_class_id ? `할당됨` : '',
        deviceNumber: device.asset_tag.replace('ICH-', ''),
        currentUser: loan ? loan.student_name : null,
        notes: device.notes || '',
        createdAt: device.created_at,
        updatedAt: device.updated_at
      }
    })

    return NextResponse.json({ devices: formattedDevices })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 기본 기기 초기화 함수
async function initializeDevices(supabase: any) {
  try {
    console.log('Initializing devices and classes...')

    // 먼저 클래스 데이터가 있는지 확인
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('*')
      .order('grade, name')

    if (classError) {
      console.error('Error fetching classes:', classError)
      // classes 테이블이 아예 없을 수도 있으므로 메모리 데이터로 폴백
      return generateInMemoryDevices()
    }

    let finalClasses = classes
    if (!classes || classes.length === 0) {
      console.log('No classes found, creating default classes...')
      // 클래스 먼저 생성
      const classData = []
      for (let grade = 1; grade <= 3; grade++) {
        for (let classNum = 1; classNum <= 13; classNum++) {
          classData.push({
            grade: grade,
            name: `${classNum}반`
          })
        }
      }

      const { data: insertedClasses, error: insertError } = await supabase
        .from('classes')
        .insert(classData)
        .select()

      if (insertError) {
        console.error('Error inserting classes:', insertError)
        return generateInMemoryDevices()
      }

      finalClasses = insertedClasses
    }

    // 기기가 이미 있는지 확인
    const { data: existingDevices } = await supabase
      .from('devices')
      .select('asset_tag')
      .limit(1)

    if (existingDevices && existingDevices.length > 0) {
      console.log('Devices already exist, fetching existing data...')
      // 이미 기기가 있으면 기존 데이터 반환
      return await fetchExistingDevices(supabase)
    }

    console.log('Creating devices for', finalClasses.length, 'classes...')

    // 기기 데이터를 배치로 생성 (한 번에 너무 많이 하지 않음)
    const batchSize = 100
    let allDevices = []

    for (const classInfo of finalClasses) {
      const classDevices = []
      for (let deviceNum = 1; deviceNum <= 35; deviceNum++) {
        const serialNumber = `${classInfo.grade}${classInfo.name.replace('반', '').padStart(2, '0')}${deviceNum.toString().padStart(2, '0')}`
        const assetTag = `ICH-${serialNumber}`

        classDevices.push({
          asset_tag: assetTag,
          model: 'Samsung Galaxy Book3',
          serial_number: serialNumber,
          assigned_class_id: classInfo.id,
          status: '충전함'
        })
      }

      // 배치로 삽입
      for (let i = 0; i < classDevices.length; i += batchSize) {
        const batch = classDevices.slice(i, i + batchSize)
        const { error: deviceError } = await supabase
          .from('devices')
          .insert(batch)

        if (deviceError) {
          console.error('Error inserting device batch:', deviceError)
          // 배치 삽입 실패 시 메모리 데이터로 폴백
          return generateInMemoryDevices()
        }
      }

      allDevices.push(...classDevices)
    }

    console.log('Successfully created', allDevices.length, 'devices')

    // 생성된 기기 목록 반환
    return await fetchExistingDevices(supabase)
  } catch (error) {
    console.error('Failed to initialize devices:', error)
    return generateInMemoryDevices()
  }
}

// 기존 기기 데이터 조회
async function fetchExistingDevices(supabase: any) {
  const { data: devices, error } = await supabase
    .from('devices')
    .select(`
      *,
      assigned_class:classes!assigned_class_id(
        grade,
        name
      )
    `)
    .order('asset_tag')

  if (error) {
    console.error('Error fetching existing devices:', error)
    return generateInMemoryDevices()
  }

  const formattedDevices = devices.map((device: any) => ({
    id: device.asset_tag,
    assetNumber: device.asset_tag,
    model: device.model,
    serialNumber: device.serial_number,
    status: mapDeviceStatus(device.status),
    assignedClass: device.assigned_class_id ? `할당됨` : '',
    deviceNumber: device.asset_tag.replace('ICH-', ''),
    currentUser: null,
    notes: device.notes || '',
    createdAt: device.created_at,
    updatedAt: device.updated_at
  }))

  return NextResponse.json({ devices: formattedDevices })
}

// 메모리 기반 기기 생성 (폴백용)
function generateInMemoryDevices() {
  console.log('Generating in-memory devices as fallback...')
  const devices: any[] = []

  for (let grade = 1; grade <= 3; grade++) {
    for (let classNum = 1; classNum <= 13; classNum++) {
      for (let deviceNum = 1; deviceNum <= 35; deviceNum++) {
        const deviceId = `${grade}-${classNum.toString().padStart(2, '0')}-${deviceNum.toString().padStart(2, '0')}`
        const serialNumber = `${grade}${classNum.toString().padStart(2, '0')}${deviceNum.toString().padStart(2, '0')}`
        const assetNumber = `ICH-${serialNumber}`

        devices.push({
          id: deviceId,
          assetNumber: assetNumber,
          model: 'Samsung Galaxy Book3',
          serialNumber: serialNumber,
          status: 'available',
          assignedClass: `${grade}-${classNum}반`,
          deviceNumber: `${grade}-${classNum.toString().padStart(2, '0')}-${deviceNum.toString().padStart(2, '0')}`,
          currentUser: null,
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    }
  }

  return NextResponse.json({ devices })
}

// DB 상태를 프론트엔드 상태로 매핑
function mapDeviceStatus(dbStatus: string): string {
  const statusMap: Record<string, string> = {
    '충전함': 'available',
    '대여중': 'loaned',
    '점검': 'maintenance'
  }
  return statusMap[dbStatus] || 'available'
}

// PATCH: 기기 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })
    const body = await request.json()
    const { deviceTag, status, currentUser, notes } = body

    console.log('PATCH devices - Request body:', { deviceTag, status, currentUser, notes })

    // 현재 사용자 정보 가져오기 (변경자 정보 기록용)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    let changerInfo = '시스템'

    // userProfile은 아래에서 더 자세히 조회할 예정
    changerInfo = authUser?.email || '시스템'

    console.log('PATCH devices - Changer info:', changerInfo)

    // 권한 확인: 관리자, 담임교사, 노트북 관리 도우미만 기기 상태 변경 가능
    if (!authUser) {
      console.error('No authenticated user')
      return NextResponse.json({ error: 'Unauthorized - No user' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, grade, class, isApprovedHomeroom')
      .eq('user_id', authUser.id)
      .single()

    if (!userProfile) {
      console.error('User profile not found:', authUser.id)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (!['admin', 'manager', 'homeroom', 'helper'].includes(userProfile.role)) {
      console.error('Insufficient permissions:', userProfile.role)
      return NextResponse.json({
        error: 'Unauthorized - Only admin, managers, homeroom teachers, and helpers can change device status'
      }, { status: 403 })
    }

    // 담임교사는 승인된 경우에만, 자신의 반 기기만 변경 가능
    if (userProfile.role === 'homeroom' && !userProfile.isApprovedHomeroom) {
      console.error('Homeroom teacher not approved')
      return NextResponse.json({ error: 'Unauthorized - Homeroom approval required' }, { status: 403 })
    }

    // 담임교사와 도우미는 자신의 반 기기만 변경 가능 (관리자와 관리팀은 모든 기기 가능)
    if ((userProfile.role === 'homeroom' || userProfile.role === 'helper') && userProfile.grade && userProfile.class) {
      // deviceTag를 기반으로 기기의 학급 정보 추출
      let deviceGrade: number | null = null
      let deviceClass: number | null = null

      // ICH-30135 -> 3학년 1반 35번 형태로 파싱
      const assetTagMatch = deviceTag.match(/ICH-(\d)(\d{2})(\d{2})/)
      if (assetTagMatch) {
        deviceGrade = parseInt(assetTagMatch[1])
        deviceClass = parseInt(assetTagMatch[2])
      } else {
        // device_tag가 "3-1-35" 형태인 경우
        const tagParts = deviceTag.split('-')
        if (tagParts.length === 3) {
          deviceGrade = parseInt(tagParts[0])
          deviceClass = parseInt(tagParts[1])
        }
      }

      const userGrade = parseInt(userProfile.grade)
      const userClass = parseInt(userProfile.class)

      if (deviceGrade !== userGrade || deviceClass !== userClass) {
        console.error('Class mismatch:', {
          deviceGrade, deviceClass, userGrade, userClass,
          userRole: userProfile.role
        })
        return NextResponse.json({
          error: `Unauthorized - Can only change devices in your assigned class (${userProfile.grade}-${userProfile.class})`
        }, { status: 403 })
      }
    }

    // 권한 체크 완료 후 changerInfo 설정
    const roleText = userProfile.role === 'admin' ? '관리자' :
                     userProfile.role === 'manager' ? '관리팀' :
                     userProfile.role === 'homeroom' ? '담임교사' :
                     userProfile.role === 'helper' ? '도우미' : '사용자'
    changerInfo = `${(userProfile as any).name || authUser.email?.split('@')[0] || '알 수 없음'} (${roleText})`

    console.log('PATCH devices - Permission check passed:', {
      role: userProfile.role,
      grade: userProfile.grade,
      class: userProfile.class,
      changerInfo
    })

    if (!deviceTag || !status) {
      console.error('Missing required fields:', { deviceTag, status })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 프론트엔드 상태를 DB 상태로 매핑
    const dbStatus = mapFrontendStatusToDb(status)
    console.log(`Status mapping: '${status}' -> '${dbStatus}'`)

    // deviceTag를 asset_tag 형식으로 변환
    let assetTag = deviceTag
    if (deviceTag && !deviceTag.startsWith('ICH-')) {
      // "2-01-11" -> "ICH-20111" 형식으로 변환
      const parts = deviceTag.split('-')
      if (parts.length === 3) {
        const serialNumber = `${parts[0]}${parts[1]}${parts[2]}`
        assetTag = `ICH-${serialNumber}`
      }
    }

    console.log(`Converting deviceTag '${deviceTag}' to assetTag '${assetTag}'`)

    // 서비스 역할로 기기가 존재하는지 먼저 확인 (RLS 우회)
    const { createClient } = require('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: existingDevices, error: checkError } = await supabaseAdmin
      .from('devices')
      .select('asset_tag, status')
      .eq('asset_tag', assetTag)

    if (checkError) {
      console.error('Device lookup error:', checkError)
      return NextResponse.json({
        error: `Device lookup failed: ${assetTag}`,
        details: checkError.message
      }, { status: 500 })
    }

    if (!existingDevices || existingDevices.length === 0) {
      console.log('Device not found, creating new device:', assetTag)
      // 기기가 없으면 새로 생성
      const { error: createError } = await supabaseAdmin
        .from('devices')
        .insert({
          asset_tag: assetTag,
          model: 'Samsung Galaxy Book3',
          status: '충전함'
        })

      if (createError) {
        console.error('Device creation error:', createError)
        return NextResponse.json({
          error: `Failed to create device: ${assetTag}`,
          details: createError.message
        }, { status: 500 })
      }
    }

    console.log('Found device(s):', existingDevices?.length || 0)

    // 기기 상태 업데이트 - 변경자 정보 포함
    const statusText = status === 'maintenance' ? '점검중' :
                      status === 'available' ? '대여가능' :
                      status === 'loaned' ? '대여중' : status

    const changeNote = `상태 변경: ${statusText} (변경자: ${changerInfo})`
    const finalNotes = notes ? `${changeNote} - ${notes}` : changeNote

    const updateData = {
      status: dbStatus,
      notes: finalNotes
    }

    console.log('Updating device with data:', updateData)

    const { data: devices, error } = await supabaseAdmin
      .from('devices')
      .update(updateData)
      .eq('asset_tag', assetTag)
      .select()

    const device = devices && devices.length > 0 ? devices[0] : null

    if (error) {
      console.error('Database update error:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json({
        error: 'Failed to update device',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    if (!device) {
      return NextResponse.json({
        error: 'Device update failed',
        details: 'No device returned after update'
      }, { status: 500 })
    }

    console.log(`Device ${deviceTag} status updated successfully:`, device)

    return NextResponse.json({
      success: true,
      deviceTag,
      status: mapDeviceStatus(device.status),
      currentUser,
      notes: device.notes,
      updatedAt: device.updated_at
    })
  } catch (error) {
    console.error('Unexpected error in PATCH devices:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// 프론트엔드 상태를 DB 상태로 매핑
function mapFrontendStatusToDb(frontendStatus: string): string {
  const statusMap: Record<string, string> = {
    'available': '충전함',
    'loaned': '대여중',
    'maintenance': '점검'
  }
  return statusMap[frontendStatus] || '충전함'
}