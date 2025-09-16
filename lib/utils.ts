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

  const d = new Date(date)
  if (isNaN(d.getTime())) return 'Invalid Date'

  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul'
  })
}

export function getCurrentKoreaTime(): string {
  const now = new Date()
  return new Date(now.getTime() + (9 * 60 * 60 * 1000)).toISOString()
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
  const d = new Date(date)
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function maskPhone(phone: string): string {
  if (!phone) return ''
  return phone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, '$1-****-$3')
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    'requested': 'bg-yellow-100 text-yellow-800',
    'approved': 'bg-blue-100 text-blue-800',
    'picked_up': 'bg-green-100 text-green-800',
    'returned': 'bg-gray-100 text-gray-800',
    'overdue': 'bg-red-100 text-red-800',
    '충전함': 'bg-green-100 text-green-800',
    '대여중': 'bg-blue-100 text-blue-800',
    '점검': 'bg-yellow-100 text-yellow-800',
    '분실': 'bg-red-100 text-red-800'
  }
  return statusColors[status] || 'bg-gray-100 text-gray-800'
}

export function getStatusText(status: string): string {
  const statusText: Record<string, string> = {
    'requested': '신청됨',
    'approved': '승인됨',
    'picked_up': '수령됨',
    'returned': '반납됨',
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
    'helper': '노트북 도우미',
    'teacher': '교사',
    'student': '학생'
  }
  return roleText[role] || role
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