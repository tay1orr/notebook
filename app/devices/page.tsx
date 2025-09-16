import { MainLayout } from '@/components/layout/main-layout'
import { requireRole } from '@/lib/auth'
import { DevicesManagement } from '@/components/devices/devices-management'

export default async function DevicesPage() {
  const user = await requireRole(['admin', 'homeroom'])

  // 각 학급별 노트북 생성 (1~3학년, 각 학년 13반, 각 반 35대)
  const devices: any[] = []

  // 1학년부터 3학년까지
  for (let grade = 1; grade <= 3; grade++) {
    // 각 학년의 1반부터 13반까지
    for (let classNum = 1; classNum <= 13; classNum++) {
      // 각 반의 1번부터 35번까지
      for (let deviceNum = 1; deviceNum <= 35; deviceNum++) {
        const deviceId = `${grade}-${classNum.toString().padStart(2, '0')}-${deviceNum.toString().padStart(2, '0')}`
        const assetNumber = `ICH-${grade}${classNum.toString().padStart(2, '0')}${deviceNum.toString().padStart(2, '0')}`

        // 일부 기기는 다른 상태로 설정 (시뮬레이션)
        let status = 'available'
        let currentUser = null
        let notes = ''

        // 실제 상황 시뮬레이션: 일부는 대여중, 점검중 등
        const random = Math.random()
        if (random < 0.05) { // 5% 점검중
          status = 'maintenance'
          notes = '정기 점검 중'
        } else if (random < 0.15) { // 10% 대여중
          status = 'loaned'
          currentUser = `학생${deviceNum}`
        } else if (random < 0.17) { // 2% 고장/폐기
          status = 'retired'
          notes = '화면 손상으로 폐기'
        }

        devices.push({
          id: deviceId,
          assetNumber: assetNumber,
          model: 'Samsung Galaxy Book3',
          serialNumber: `SN${grade}${classNum.toString().padStart(2, '0')}${deviceNum.toString().padStart(2, '0')}${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
          status: status,
          assignedClass: `${grade}-${classNum}`,
          deviceNumber: `${grade}-${classNum}-${deviceNum.toString().padStart(2, '0')}`,
          currentUser: currentUser,
          notes: notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    }
  }

  const stats = {
    total: devices.length,
    available: devices.filter(d => d.status === 'available').length,
    loaned: devices.filter(d => d.status === 'loaned').length,
    maintenance: devices.filter(d => d.status === 'maintenance').length,
    retired: devices.filter(d => d.status === 'retired').length
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <DevicesManagement devices={devices} stats={stats} />
      </div>
    </MainLayout>
  )
}