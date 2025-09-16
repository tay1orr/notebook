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

        // 시리얼 번호를 10101부터 31335까지 순차적으로 배정
        const totalDeviceIndex = (grade - 1) * 13 * 35 + (classNum - 1) * 35 + (deviceNum - 1)
        const serialNumber = (10101 + totalDeviceIndex).toString()

        // 모든 기기는 기본적으로 대여 가능 상태
        let status = 'available'
        let currentUser = null
        let notes = ''

        devices.push({
          id: deviceId,
          assetNumber: assetNumber,
          model: 'Samsung Galaxy Book3',
          serialNumber: serialNumber,
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