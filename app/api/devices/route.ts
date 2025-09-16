import { NextRequest, NextResponse } from 'next/server'

// GET: 모든 기기 목록 조회
export async function GET() {
  try {
    // 모든 기기를 생성 (메모리상 데이터)
    const devices: any[] = []

    // 1학년부터 3학년까지
    for (let grade = 1; grade <= 3; grade++) {
      // 각 학년의 1반부터 13반까지
      for (let classNum = 1; classNum <= 13; classNum++) {
        // 각 반의 1번부터 35번까지
        for (let deviceNum = 1; deviceNum <= 35; deviceNum++) {
          const deviceId = `${grade}-${classNum.toString().padStart(2, '0')}-${deviceNum.toString().padStart(2, '0')}`
          const assetNumber = `ICH-${grade}${classNum.toString().padStart(2, '0')}${deviceNum.toString().padStart(2, '0')}`

          devices.push({
            id: deviceId,
            assetNumber: assetNumber,
            model: 'Samsung Galaxy Book3',
            serialNumber: `SN${grade}${classNum.toString().padStart(2, '0')}${deviceNum.toString().padStart(2, '0')}${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
            status: 'available', // 기본값: 대여 가능
            assignedClass: `${grade}-${classNum}`,
            deviceNumber: `${grade}-${classNum}-${deviceNum.toString().padStart(2, '0')}`,
            currentUser: null,
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        }
      }
    }

    return NextResponse.json({ devices })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: 기기 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceTag, status, currentUser, notes } = body

    if (!deviceTag || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 실제 구현에서는 데이터베이스 업데이트
    // 현재는 성공 응답만 반환
    console.log(`Device ${deviceTag} status updated to ${status}`)

    return NextResponse.json({
      success: true,
      deviceTag,
      status,
      currentUser,
      notes,
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}