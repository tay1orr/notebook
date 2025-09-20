import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
}

export function formatDateTime(date: string | Date): string {
  if (!date) return 'Invalid Date'

  let d: Date
  if (typeof date === 'string') {
    d = new Date(date)
  } else {
    d = date
  }

  if (isNaN(d.getTime())) return 'Invalid Date'

  // 한국 시간으로 직접 표시 (Intl.DateTimeFormat의 timeZone 옵션 사용)
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Seoul'  // 한국 시간대로 강제 변환
  }).format(d)
}

export function getCurrentKoreaTime(): string {
  // 현재 한국 시간을 정확히 계산 - 로컬 타임존 고려
  const now = new Date()
  // UTC 시간에 9시간 추가하고, 현재 타임존 오프셋 제거
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
  const koreaTime = new Date(utcTime + (9 * 60 * 60 * 1000))
  return koreaTime.toISOString()
}

export function getCurrentKoreaDateTime(): Date {
  // 현재 한국 시간을 Date 객체로 반환
  const now = new Date()
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
  return new Date(utcTime + (9 * 60 * 60 * 1000))
}

export function getCurrentKoreaDateTimeString(): string {
  // 현재 한국 시간을 문자열로 반환 (YYYY-MM-DDTHH:mm:ss 형식)
  const now = new Date()
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
  const koreaTime = new Date(utcTime + (9 * 60 * 60 * 1000))
  return koreaTime.toISOString().slice(0, 19) // 초까지만 포함, Z 제거
}

export function getReturnDateTime(returnDate: string): string {
  // 반납일을 받아서 오전 9시로 고정된 반납 시간 반환 (한국 시간 기준)
  const date = new Date(returnDate)
  date.setHours(9, 0, 0, 0) // 오전 9시로 고정
  return date.toISOString()
}

export function isWeekend(date: Date): boolean {
  // 토요일(6) 또는 일요일(0)인지 확인
  const day = date.getDay()
  return day === 0 || day === 6
}

export function getNextWeekday(date: Date): Date {
  // 주말이면 다음 월요일로 이동
  const nextDate = new Date(date)
  while (isWeekend(nextDate)) {
    nextDate.setDate(nextDate.getDate() + 1)
  }
  return nextDate
}

export function parseStudentId(email: string): {
  grade: string
  class: string
  number: string
  deviceNumber: string
} | null {
  // kko92-2510101@gclass.ice.go.kr 형식에서 정보 추출
  const match = email.match(/([a-zA-Z]+)(\d{2})-(\d)(\d{2})(\d{2})@/)

  if (!match) return null

  const [, prefix, year, grade, classNum, studentNum] = match

  return {
    grade: grade,
    class: `${grade}-${classNum}`,
    number: studentNum,
    deviceNumber: `${classNum}-${studentNum}` // 예: "05-01" (5반 1번)
  }
}

export function getDeviceNumberForStudent(email: string): string | null {
  const studentInfo = parseStudentId(email)
  if (!studentInfo) return null

  return studentInfo.deviceNumber
}

export function formatTime(date: string | Date): string {
  if (!date) return 'Invalid Time'

  let d: Date
  if (typeof date === 'string') {
    d = new Date(date)
  } else {
    d = date
  }

  if (isNaN(d.getTime())) return 'Invalid Time'

  // 한국 시간으로 포맷팅
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Seoul'
  }).format(d)
}

export function maskPhone(phone: string): string {
  if (!phone) return ''
  return phone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, '$1-****-$3')
}

export function getStatusColor(status: string, notes?: string): string {
  if (status === 'rejected' && notes === 'STUDENT_CANCELLED') {
    return 'bg-orange-100 text-orange-800 border-orange-200'
  }

  const statusColors: Record<string, string> = {
    'requested': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'approved': 'bg-blue-100 text-blue-800 border-blue-200',
    'picked_up': 'bg-green-100 text-green-800 border-green-200',
    'returned': 'bg-gray-100 text-gray-800 border-gray-200',
    'rejected': 'bg-red-100 text-red-800 border-red-200',
    'cancelled': 'bg-orange-100 text-orange-800 border-orange-200',
    'overdue': 'bg-red-100 text-red-800 border-red-200',
    '충전함': 'bg-green-100 text-green-800 border-green-200',
    '대여중': 'bg-blue-100 text-blue-800 border-blue-200',
    '점검': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    '분실': 'bg-red-100 text-red-800 border-red-200'
  }
  return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
}

export function getStatusText(status: string, notes?: string): string {
  const statusText: Record<string, string> = {
    'requested': '신청됨',
    'approved': '승인됨',
    'picked_up': '수령됨',
    'returned': '반납됨',
    'rejected': notes === 'STUDENT_CANCELLED' ? '취소됨' : '거절됨',
    'cancelled': '취소됨',
    'overdue': '연체',
    '충전함': '충전함',
    '대여중': '대여중',
    '점검': '점검중',
    '분실': '분실'
  }
  return statusText[status] || status
}

export function getRoleText(role: string): string {
  const roleText: Record<string, string> = {
    'admin': '관리자',
    'homeroom': '담임교사',
    'helper': '노트북 관리 도우미',
    'student': '학생'
  }
  return roleText[role] || role
}

export function getPurposeText(purpose: string): string {
  const purposeText: Record<string, string> = {
    'homework': '과제 작성',
    'report': '보고서 준비',
    'research': '조사 활동',
    'presentation': '발표 준비',
    'project': '프로젝트 작업',
    'exam_prep': '시험 준비',
    'other': '기타'
  }
  return purposeText[purpose] || purpose
}

export function getTimeRemaining(dueDate: string | Date): string {
  const now = new Date()
  const due = new Date(dueDate)
  const diff = due.getTime() - now.getTime()

  if (diff < 0) {
    const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60))
    return `${hours}시간 연체`
  }

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}시간 ${minutes}분 남음`
  } else {
    return `${minutes}분 남음`
  }
}

export function generateQRCodeUrl(text: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`
}

export function isLoanOverdue(dueDate: string | Date): boolean {
  if (!dueDate) return false

  // 한국 시간 기준으로 연체 판단
  const nowKorea = getCurrentKoreaDateTime()
  const due = new Date(dueDate)

  return nowKorea > due
}

export function getOverdueDays(dueDate: string | Date): number {
  if (!dueDate) return 0

  const now = new Date()
  const due = new Date(dueDate)

  if (now <= due) return 0

  const diffTime = now.getTime() - due.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

export function getLoanStatus(loan: any): string {
  // 실시간 연체 판단
  if (loan.status === 'picked_up' && isLoanOverdue(loan.due_date || loan.dueDate)) {
    return 'overdue'
  }

  return loan.status
}