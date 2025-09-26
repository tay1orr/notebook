import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { monitoring } from '@/lib/monitoring'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    // 관리자만 모니터링 정보 접근 가능
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = monitoring.getSystemStats()
    const recentErrors = monitoring.getErrors({ since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() })
    const recentMetrics = monitoring.getMetrics({ since: new Date(Date.now() - 60 * 60 * 1000).toISOString() })

    return NextResponse.json({
      stats,
      recentErrors: recentErrors.slice(-10), // 최근 10개 오류만
      metrics: {
        totalRequests: recentMetrics.filter(m => m.name === 'api_request').length,
        averageResponseTime: (() => {
          const durations = recentMetrics.filter(m => m.name.includes('_duration'))
          return durations.length > 0
            ? durations.reduce((sum, m) => sum + m.value, 0) / durations.length
            : 0
        })(),
        loansCreated: recentMetrics.filter(m => m.name === 'loan_created').length,
        loansApproved: recentMetrics.filter(m => m.name === 'loan_approved').length
      }
    })
  } catch (error) {
    monitoring.recordError(error as Error, 'GET /api/monitoring')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    monitoring.clear()
    return NextResponse.json({ message: 'Monitoring data cleared' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}