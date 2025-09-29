/**
 * 환경변수 검증 유틸리티
 * 운영 배포 시 필수 환경변수들이 정상적으로 설정되었는지 검증
 */

interface EnvironmentConfig {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  NEXT_PUBLIC_ALLOWED_DOMAIN: string
}

function validateEnvironmentVariables(): EnvironmentConfig {
  const required = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_ALLOWED_DOMAIN: process.env.NEXT_PUBLIC_ALLOWED_DOMAIN || 'gclass.ice.go.kr'
  }

  const missing: string[] = []

  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `다음 환경변수가 설정되지 않았습니다: ${missing.join(', ')}\n` +
      '시스템 운영을 위해 필수 환경변수를 설정해주세요.'
    )
  }

  // At this point, we know all required values exist (or we would have thrown above)
  const config = required as EnvironmentConfig

  // Supabase URL 유효성 검사
  if (!config.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL은 https://로 시작해야 합니다.')
  }

  // 키 길이 검증 (Supabase 키는 일반적으로 64자 이상)
  if (config.NEXT_PUBLIC_SUPABASE_ANON_KEY.length < 64) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY가 올바르지 않습니다.')
  }

  if (config.SUPABASE_SERVICE_ROLE_KEY.length < 64) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY가 올바르지 않습니다.')
  }

  return config
}

// 앱 시작 시 환경변수 검증
export const env = validateEnvironmentVariables()

export default env