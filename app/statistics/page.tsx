import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase-server'
import { ClassUsageStats } from '@/components/admin/class-usage-stats'
import { MainLayout } from '@/components/layout/main-layout'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function StatisticsPage() {
  // 관리자 권한 확인
  const user = await requireRole(['admin'])

  console.log('🔍 STATISTICS PAGE - User accessing:', {
    email: user.email,
    role: user.role,
    id: user.id
  })

  const supabase = createAdminClient()

  // 대여 데이터 로드 (서버 사이드에서 직접 supabase 사용)
  let loans: any[] = []
  try {
    const { data: loansData, error } = await supabase
      .from('loan_applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load loans:', error)
    } else {
      loans = loansData || []
    }
  } catch (error) {
    console.error('Failed to load loans for statistics:', error)
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">이용률 통계</h1>
          <p className="text-muted-foreground mt-2">
            학급별, 학년별, 월별 노트북 대여 이용률을 확인할 수 있습니다.
          </p>
        </div>

        <ClassUsageStats loans={loans} />
      </div>
    </MainLayout>
  )
}