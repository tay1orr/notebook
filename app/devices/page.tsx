import { MainLayout } from '@/components/layout/main-layout'
import { requireRole } from '@/lib/auth'
import { DevicesManagement } from '@/components/devices/devices-management'

export default async function DevicesPage() {
  const user = await requireRole(['admin', 'homeroom'])

  // 모든 샘플 데이터 제거
  const devices: any[] = []

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