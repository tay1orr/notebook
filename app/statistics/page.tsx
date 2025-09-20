import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Database } from '@/types/supabase'
import { ClassUsageStats } from '@/components/admin/class-usage-stats'

export default async function StatisticsPage() {
  const supabase = createServerComponentClient<Database>({ cookies })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 사용자 권한 확인
  const { data: userData } = await supabase
    .from('users')
    .select('role, is_approved')
    .eq('id', user.id)
    .single()

  if (!userData || !userData.is_approved || userData.role !== 'admin') {
    redirect('/dashboard')
  }

  // 대여 데이터 로드
  let loans: any[] = []
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/loans`, {
      headers: {
        'Cookie': cookies().toString()
      }
    })
    if (response.ok) {
      const data = await response.json()
      loans = data.loans || []
    }
  } catch (error) {
    console.error('Failed to load loans for statistics:', error)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">이용률 통계</h1>
        <p className="text-muted-foreground mt-2">
          학급별, 학년별, 월별 노트북 대여 이용률을 확인할 수 있습니다.
        </p>
      </div>

      <ClassUsageStats loans={loans} />
    </div>
  )
}