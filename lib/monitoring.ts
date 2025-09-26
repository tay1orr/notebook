export interface MetricData {
  name: string
  value: number
  timestamp: string
  tags?: Record<string, string>
}

export interface ErrorMetric {
  message: string
  stack?: string
  endpoint: string
  userId?: string
  timestamp: string
  userAgent?: string
}

class MonitoringService {
  private metrics: MetricData[] = []
  private errors: ErrorMetric[] = []
  private readonly maxStoredMetrics = 1000
  private readonly maxStoredErrors = 500

  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    const metric: MetricData = {
      name,
      value,
      timestamp: new Date().toISOString(),
      tags
    }

    this.metrics.push(metric)

    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics = this.metrics.slice(-this.maxStoredMetrics)
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Metric:', metric)
    }
  }

  recordError(error: Error | string, endpoint: string, userId?: string, userAgent?: string) {
    const errorMetric: ErrorMetric = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      endpoint,
      userId,
      userAgent,
      timestamp: new Date().toISOString()
    }

    this.errors.push(errorMetric)

    if (this.errors.length > this.maxStoredErrors) {
      this.errors = this.errors.slice(-this.maxStoredErrors)
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Error metric:', errorMetric)
    }
  }

  getMetrics(filter?: { name?: string, since?: string }): MetricData[] {
    let filtered = this.metrics

    if (filter?.name) {
      filtered = filtered.filter(m => m.name === filter.name)
    }

    if (filter?.since) {
      filtered = filtered.filter(m => m.timestamp >= filter.since!)
    }

    return filtered
  }

  getErrors(filter?: { endpoint?: string, since?: string }): ErrorMetric[] {
    let filtered = this.errors

    if (filter?.endpoint) {
      filtered = filtered.filter(e => e.endpoint === filter.endpoint)
    }

    if (filter?.since) {
      filtered = filtered.filter(e => e.timestamp >= filter.since!)
    }

    return filtered
  }

  getSystemStats() {
    const now = new Date()
    const hour = new Date(now.getTime() - 60 * 60 * 1000)

    const recentMetrics = this.getMetrics({ since: hour.toISOString() })
    const recentErrors = this.getErrors({ since: hour.toISOString() })

    return {
      totalMetrics: this.metrics.length,
      totalErrors: this.errors.length,
      recentMetrics: recentMetrics.length,
      recentErrors: recentErrors.length,
      lastHour: {
        requests: recentMetrics.filter(m => m.name === 'api_request').length,
        loansCreated: recentMetrics.filter(m => m.name === 'loan_created').length,
        loansApproved: recentMetrics.filter(m => m.name === 'loan_approved').length,
        errors: recentErrors.length
      }
    }
  }

  clear() {
    this.metrics = []
    this.errors = []
  }
}

export const monitoring = new MonitoringService()

export function withMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  metricName: string,
  tags?: Record<string, string>
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()

    try {
      const result = await fn(...args)
      const duration = Date.now() - startTime

      monitoring.recordMetric(`${metricName}_duration`, duration, tags)
      monitoring.recordMetric(`${metricName}_success`, 1, tags)

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      monitoring.recordMetric(`${metricName}_duration`, duration, tags)
      monitoring.recordMetric(`${metricName}_error`, 1, tags)
      monitoring.recordError(error as Error, metricName)

      throw error
    }
  }
}