import { MainLayout } from '@/components/layout/main-layout'
import { requireRole } from '@/lib/auth'
import { DevicesManagement } from '@/components/devices/devices-management'

export default async function DevicesPage() {
  const user = await requireRole(['admin', 'homeroom'])

  // API에서 기기 목록 조회
  let devices: any[] = []
  let stats = {
    total: 0,
    available: 0,
    loaned: 0,
    maintenance: 0,
    retired: 0
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/devices`, {
      cache: 'no-store'
    })

    if (response.ok) {
      const data = await response.json()
      devices = data.devices || []

      // 통계 계산
      stats = {
        total: devices.length,
        available: devices.filter(d => d.status === 'available').length,
        loaned: devices.filter(d => d.status === 'loaned').length,
        maintenance: devices.filter(d => d.status === 'maintenance').length,
        retired: devices.filter(d => d.status === 'retired').length
      }
    }
  } catch (error) {
    console.error('Failed to fetch devices:', error)
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <DevicesManagement devices={devices} stats={stats} />
      </div>
    </MainLayout>
  )
}