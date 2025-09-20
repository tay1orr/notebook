import { MainLayout } from '@/components/layout/main-layout'
import { requireRole } from '@/lib/auth'
import { AdminDashboardClient } from './admin-dashboard-client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const user = await requireRole(['admin'])

  return (
    <MainLayout>
      <AdminDashboardClient user={user} />
    </MainLayout>
  )
}