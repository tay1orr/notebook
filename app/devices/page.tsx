import { MainLayout } from '@/components/layout/main-layout'
import { requireApprovedHomeroom } from '@/lib/auth'
import { DevicesManagementWrapper } from '@/components/devices/devices-management-wrapper'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function DevicesPage() {
  const user = await requireApprovedHomeroom(['admin', 'homeroom'])

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <DevicesManagementWrapper />
      </div>
    </MainLayout>
  )
}