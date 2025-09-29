// 에러 처리 유틸리티
export interface AppError {
  message: string
  code?: string
  status?: number
  details?: any
}

export class APIError extends Error {
  public status: number
  public code?: string
  public details?: any

  constructor(message: string, status: number = 500, code?: string, details?: any) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// 사용자 친화적 에러 메시지 변환
export function getUserFriendlyErrorMessage(error: any): string {
  if (error instanceof APIError) {
    return error.message
  }

  if (error?.code) {
    switch (error.code) {
      case 'PGRST301':
        return '데이터를 찾을 수 없습니다.'
      case 'PGRST204':
        return '요청한 데이터가 없습니다.'
      case '23505':
        return '이미 존재하는 데이터입니다.'
      case '23503':
        return '참조되는 데이터가 존재하지 않습니다.'
      case '42501':
        return '권한이 없습니다.'
      default:
        break
    }
  }

  if (error?.message) {
    // 일반적인 에러 메시지들을 한국어로 변환
    const message = error.message.toLowerCase()

    if (message.includes('network')) {
      return '네트워크 연결을 확인해주세요.'
    }
    if (message.includes('timeout')) {
      return '요청 시간이 초과되었습니다. 다시 시도해주세요.'
    }
    if (message.includes('unauthorized')) {
      return '로그인이 필요합니다.'
    }
    if (message.includes('forbidden')) {
      return '접근 권한이 없습니다.'
    }
    if (message.includes('not found')) {
      return '요청한 리소스를 찾을 수 없습니다.'
    }
    if (message.includes('conflict')) {
      return '데이터 충돌이 발생했습니다.'
    }
    if (message.includes('validation')) {
      return '입력한 정보를 확인해주세요.'
    }

    return error.message
  }

  return '알 수 없는 오류가 발생했습니다.'
}

// API 응답 에러 처리
export async function handleAPIResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    let errorDetails: any = null

    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
      errorDetails = errorData.details || errorData
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
      errorMessage = response.statusText || errorMessage
    }

    throw new APIError(
      getUserFriendlyErrorMessage({ message: errorMessage }),
      response.status,
      response.status.toString(),
      errorDetails
    )
  }

  try {
    return await response.json()
  } catch (error) {
    throw new APIError('응답 데이터를 처리할 수 없습니다.', 500)
  }
}

// Supabase 에러 처리
export function handleSupabaseError(error: any): AppError {
  if (!error) {
    return { message: '알 수 없는 오류가 발생했습니다.' }
  }

  let message = getUserFriendlyErrorMessage(error)
  let code = error.code
  let status = 500

  // Supabase 특정 에러 코드 처리
  if (error.code) {
    switch (error.code) {
      case 'PGRST116':
        message = '중복된 키값이 존재합니다.'
        status = 409
        break
      case 'PGRST301':
        message = '데이터를 찾을 수 없습니다.'
        status = 404
        break
      case 'PGRST204':
        message = '요청한 데이터가 없습니다.'
        status = 404
        break
      case '42501':
        message = '접근 권한이 없습니다.'
        status = 403
        break
      case '23505':
        message = '이미 존재하는 데이터입니다.'
        status = 409
        break
      case '23503':
        message = '연관된 데이터가 존재하지 않습니다.'
        status = 400
        break
    }
  }

  return {
    message,
    code,
    status,
    details: error.details || error.hint
  }
}

// 로그 기능 (개인정보 보호 강화)
export function logError(error: any, context?: string) {
  // 개인정보 마스킹
  const sanitizedMessage = maskPersonalInfo(error.message || error.toString())

  const errorInfo = {
    message: sanitizedMessage,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    severity: getErrorSeverity(error)
  }

  console.error(`[${errorInfo.severity}]`, errorInfo)

  // 프로덕션 환경에서는 외부 로깅 서비스로 전송
  if (process.env.NODE_ENV === 'production') {
    // TODO: 외부 로깅 서비스 연동 (예: Sentry, LogRocket 등)
  }
}

// React 컴포넌트에서 사용할 에러 처리 훅
export function useErrorHandler() {
  const handleError = (error: any, context?: string) => {
    logError(error, context)

    // 사용자에게 토스트 메시지로 표시 (toast 라이브러리 필요)
    const message = getUserFriendlyErrorMessage(error)
    console.error('User Error:', message)

    // TODO: toast.error(message) 등으로 사용자에게 표시
  }

  return { handleError }
}

// 개인정보 마스킹 함수
function maskPersonalInfo(message: string): string {
  if (!message) return message

  return message
    .replace(/[가-힣]{2,4}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***.***') // 이메일 마스킹
    .replace(/\b\d{5,}\b/g, '***') // 학번 등 숫자 마스킹
    .replace(/[가-힣]{2,4}(?=\s|$)/g, '***') // 한글 이름 마스킹
}

// 에러 심각도 판단
function getErrorSeverity(error: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (error?.status >= 500) return 'CRITICAL'
  if (error?.status >= 400) return 'HIGH'
  if (error?.code === 'NETWORK_ERROR') return 'MEDIUM'
  if (error?.name === 'ValidationError') return 'MEDIUM'
  return 'LOW'
}