import { MainLayout } from '@/components/layout/main-layout'
import { requireRole } from '@/lib/auth'
import { DevicesManagement } from '@/components/devices/devices-management'

export default async function DevicesPage() {
  const user = await requireRole(['admin', 'homeroom'])

  // 임시 데이터 (실제로는 데이터베이스에서 가져와야 함)
  const devices = [
    {
      id: '1',
      assetTag: 'NB-2024-001',
      model: 'LG gram 16',
      serial: 'LG24001001',
      status: 'available',
      assignedClass: '1-1',
      currentUser: null,
      notes: '양호한 상태',
      lastMaintenance: '2024-09-01'
    },
    {
      id: '2',
      assetTag: 'NB-2024-002',
      model: 'LG gram 16',
      serial: 'LG24001002',
      status: 'loaned',
      assignedClass: '1-1',
      currentUser: '김학생 (10101)',
      notes: '',
      lastMaintenance: '2024-09-01'
    },
    {
      id: '3',
      assetTag: 'NB-2024-003',
      model: 'LG gram 14',
      serial: 'LG24001003',
      status: 'maintenance',
      assignedClass: '1-2',
      currentUser: null,
      notes: '키보드 점검 중',
      lastMaintenance: '2024-09-15'
    },
    {
      id: '4',
      assetTag: 'NB-2024-004',
      model: 'LG gram 16',
      serial: 'LG24001004',
      status: 'retired',
      assignedClass: null,
      currentUser: null,
      notes: '화면 파손으로 폐기',
      lastMaintenance: '2024-08-15'
    }
  ]

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