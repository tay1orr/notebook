// 간단한 메모리 기반 rate limiter (프로덕션에서는 Redis 사용 권장)
const requestCounts: Map<string, { count: number; resetTime: number }> = new Map()

export function rateLimit(
  identifier: string,
  limit: number = 60, // 분당 요청 수
  windowMs: number = 60 * 1000 // 1분 윈도우
): { success: boolean; reset: number; remaining: number } {
  const now = Date.now()
  const key = identifier

  const record = requestCounts.get(key)

  if (!record || now > record.resetTime) {
    // 새 윈도우 시작
    requestCounts.set(key, {
      count: 1,
      resetTime: now + windowMs
    })
    return { success: true, reset: now + windowMs, remaining: limit - 1 }
  }

  if (record.count >= limit) {
    return { success: false, reset: record.resetTime, remaining: 0 }
  }

  record.count++
  return { success: true, reset: record.resetTime, remaining: limit - record.count }
}

// 정리 작업 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now()
  const keysToDelete: string[] = []

  requestCounts.forEach((record, key) => {
    if (now > record.resetTime) {
      keysToDelete.push(key)
    }
  })

  keysToDelete.forEach(key => requestCounts.delete(key))
}, 5 * 60 * 1000) // 5분마다 정리