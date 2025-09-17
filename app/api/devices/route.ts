import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/supabase'

// GET: 모든 기기 목록 조회
export async function GET() {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })

    // 기기와 할당된 클래스 정보를 조회
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
      console.error('Database error:', error)

      // 데이터베이스에 기기가 없으면 기본 기기들을 생성
      if (error.code === 'PGRST116' || !devices || devices.length === 0) {
        return await initializeDevices(supabase)
      }

      return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
    }

    // 기기 데이터를 프론트엔드 형식으로 변환
    const formattedDevices = devices.map(device => ({
      id: device.asset_tag,
      assetNumber: device.asset_tag,
      model: device.model,
      serialNumber: device.serial_number,
      status: mapDeviceStatus(device.status),
      assignedClass: device.assigned_class ? `${device.assigned_class.grade}-${device.assigned_class.name}` : '',
      deviceNumber: device.asset_tag.replace('ICH-', ''),
      currentUser: null, // 현재 대여자는 별도 조회 필요
      notes: device.notes || '',
      createdAt: device.created_at,
      updatedAt: device.updated_at
    }))

    return NextResponse.json({ devices: formattedDevices })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 기본 기기 초기화 함수
async function initializeDevices(supabase: any) {
  try {
    // 먼저 클래스 데이터가 있는지 확인
    const { data: classes } = await supabase
      .from('classes')
      .select('*')
      .order('grade, name')

    if (!classes || classes.length === 0) {
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

      await supabase.from('classes').insert(classData)
    }

    // 다시 클래스 데이터 조회
    const { data: refreshedClasses } = await supabase
      .from('classes')
      .select('*')
      .order('grade, name')

    // 기기 데이터 생성
    const devices = []
    for (const classInfo of refreshedClasses) {
      for (let deviceNum = 1; deviceNum <= 35; deviceNum++) {
        const serialNumber = `${classInfo.grade}${classInfo.name.replace('반', '').padStart(2, '0')}${deviceNum.toString().padStart(2, '0')}`
        const assetTag = `ICH-${serialNumber}`

        devices.push({
          asset_tag: assetTag,
          model: 'Samsung Galaxy Book3',
          serial_number: serialNumber,
          assigned_class_id: classInfo.id,
          status: '충전함'
        })
      }
    }

    await supabase.from('devices').insert(devices)

    // 생성된 기기 목록 반환
    return GET()
  } catch (error) {
    console.error('Failed to initialize devices:', error)
    return NextResponse.json({ error: 'Failed to initialize devices' }, { status: 500 })
  }
}

// DB 상태를 프론트엔드 상태로 매핑
function mapDeviceStatus(dbStatus: string): string {
  const statusMap: Record<string, string> = {
    '충전함': 'available',
    '대여중': 'loaned',
    '점검': 'maintenance',
    '분실': 'retired'
  }
  return statusMap[dbStatus] || 'available'
}

// PATCH: 기기 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })
    const body = await request.json()
    const { deviceTag, status, currentUser, notes } = body

    if (!deviceTag || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 프론트엔드 상태를 DB 상태로 매핑
    const dbStatus = mapFrontendStatusToDb(status)

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

    // 기기 상태 업데이트
    const { data: device, error } = await supabase
      .from('devices')
      .update({
        status: dbStatus,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('asset_tag', assetTag)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update device' }, { status: 500 })
    }

    console.log(`Device ${deviceTag} status updated to ${dbStatus}`)

    return NextResponse.json({
      success: true,
      deviceTag,
      status: mapDeviceStatus(device.status),
      currentUser,
      notes: device.notes,
      updatedAt: device.updated_at
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 프론트엔드 상태를 DB 상태로 매핑
function mapFrontendStatusToDb(frontendStatus: string): string {
  const statusMap: Record<string, string> = {
    'available': '충전함',
    'loaned': '대여중',
    'maintenance': '점검',
    'retired': '분실'
  }
  return statusMap[frontendStatus] || '충전함'
}