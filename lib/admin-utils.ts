// 관리자 권한 확인 유틸리티
// 환경변수를 통한 안전한 관리자 관리

/**
 * 관리자 이메일 목록을 가져옵니다.
 * 환경변수 ADMIN_EMAIL에서 쉼표로 구분된 이메일 목록을 파싱합니다.
 */
export function getAdminEmails(): string[] {
  const adminEmailsEnv = process.env.ADMIN_EMAIL
  if (!adminEmailsEnv) {
    console.warn('ADMIN_EMAIL 환경변수가 설정되지 않았습니다.')
    return []
  }

  return adminEmailsEnv
    .split(',')
    .map(email => email.trim())
    .filter(email => email.length > 0)
}

/**
 * 특정 이메일이 관리자인지 확인합니다.
 * @param email 확인할 이메일 주소 (undefined 가능)
 * @returns 관리자 여부
 */
export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false
  const adminEmails = getAdminEmails()
  return adminEmails.includes(email)
}

/**
 * 현재 사용자가 관리자인지 확인합니다.
 * @param userEmail 사용자 이메일
 * @returns 관리자 여부
 */
export function checkAdminPermission(userEmail: string): boolean {
  return isAdminEmail(userEmail)
}

/**
 * API 라우트에서 관리자 권한을 검증합니다.
 * @param userEmail 사용자 이메일
 * @throws 관리자가 아닌 경우 에러 발생
 */
export function requireAdminPermission(userEmail: string): void {
  if (!isAdminEmail(userEmail)) {
    throw new Error('관리자 권한이 필요합니다.')
  }
}

/**
 * 클라이언트 사이드에서 관리자 권한을 확인합니다.
 * (환경변수 접근 불가하므로 서버에서 전달받은 역할로 확인)
 * @param userRole 사용자 역할
 * @returns 관리자 여부
 */
export function isAdminRole(userRole: string): boolean {
  return userRole === 'admin'
}