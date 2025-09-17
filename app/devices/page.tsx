import { MainLayout } from '@/components/layout/main-layout'
import { requireRole } from '@/lib/auth'
import { DevicesManagementWrapper } from '@/components/devices/devices-management-wrapper'

export default async function DevicesPage() {
  const user = await requireRole(['admin', 'homeroom'])

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <DevicesManagementWrapper />
      </div>
    </MainLayout>
  )
}