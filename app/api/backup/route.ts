import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인
    await requireRole(['admin'])

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table') || 'all'

    let backupData: any = {}
    const timestamp = new Date().toISOString().split('T')[0]

    if (table === 'all' || table === 'loan_applications') {
      const { data: loans, error: loansError } = await supabase
        .from('loan_applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (loansError) throw loansError
      backupData.loan_applications = loans
    }

    if (table === 'all' || table === 'user_roles') {
      const { data: users, error: usersError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError
      backupData.user_roles = users
    }

    if (table === 'all' || table === 'devices') {
      const { data: devices, error: devicesError } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false })

      if (devicesError) throw devicesError
      backupData.devices = devices
    }

    // 백업 메타데이터 추가
    const backup = {
      metadata: {
        created_at: new Date().toISOString(),
        version: '1.0.0',
        table_filter: table,
        record_counts: Object.keys(backupData).reduce((acc, key) => {
          acc[key] = backupData[key]?.length || 0
          return acc
        }, {} as Record<string, number>)
      },
      data: backupData
    }

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="notebook-backup-${timestamp}.json"`
      }
    })

  } catch (error) {
    console.error('Backup failed:', error)
    return NextResponse.json(
      { error: '백업 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 확인
    await requireRole(['admin'])

    const supabase = createAdminClient()

    // 백업 통계 정보 반환
    const stats = await Promise.all([
      supabase.from('loan_applications').select('id', { count: 'exact', head: true }),
      supabase.from('user_roles').select('id', { count: 'exact', head: true }),
      supabase.from('devices').select('id', { count: 'exact', head: true })
    ])

    const backupInfo = {
      available_tables: ['loan_applications', 'user_roles', 'devices'],
      record_counts: {
        loan_applications: stats[0].count || 0,
        user_roles: stats[1].count || 0,
        devices: stats[2].count || 0
      },
      last_backup: null // TODO: 백업 이력 추적시 구현
    }

    return NextResponse.json(backupInfo)

  } catch (error) {
    console.error('Backup info failed:', error)
    return NextResponse.json(
      { error: '백업 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}