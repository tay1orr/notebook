import { z } from 'zod'

export const loanApplicationSchema = z.object({
  student_name: z.string().min(1, '학생 이름을 입력해주세요').max(50, '이름이 너무 깁니다'),
  student_no: z.string().min(1, '학번을 입력해주세요').regex(/^\d{1,2}$/, '올바른 학번 형식이 아닙니다'),
  class_name: z.string().min(1, '학급을 입력해주세요').regex(/^\d{1}-\d{1,2}$/, '올바른 학급 형식이 아닙니다 (예: 2-1)'),
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  student_contact: z.string().optional(),
  purpose: z.enum(['study', 'assignment', 'project', 'other'], {
    errorMap: () => ({ message: '사용 목적을 선택해주세요' })
  }),
  purpose_detail: z.string().max(200, '세부 목적은 200자를 초과할 수 없습니다').optional(),
  return_date: z.string().min(1, '반납 예정일을 선택해주세요'),
  return_time: z.string().min(1, '반납 예정 시간을 선택해주세요'),
  due_date: z.string().optional(),
  device_tag: z.string().optional(),
  signature: z.string().min(1, '서명을 해주세요'),
  notes: z.string().max(500, '비고는 500자를 초과할 수 없습니다').optional()
})

export const deviceUpdateSchema = z.object({
  deviceTag: z.string().min(1, '기기 태그를 입력해주세요'),
  status: z.enum(['available', 'loaned', 'maintenance', 'broken']),
  currentUser: z.string().nullable().optional(),
  notes: z.string().max(200, '비고는 200자를 초과할 수 없습니다').optional()
})

export const userUpdateSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(50, '이름이 너무 깁니다'),
  role: z.enum(['student', 'helper', 'homeroom', 'manager', 'admin']).optional(),
  grade: z.string().regex(/^[1-3]$/, '1-3학년 중 선택해주세요').optional(),
  class: z.string().regex(/^\d{1,2}$/, '올바른 반 번호를 입력해주세요').optional(),
  studentNo: z.string().regex(/^\d{1,2}$/, '올바른 번호를 입력해주세요').optional()
})

export function sanitizeInput(input: string): string {
  return input.trim().replace(/<[^>]*>/g, '') // HTML 태그 제거
}

export function validateEmail(email: string): boolean {
  const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN || 'gclass.ice.go.kr'
  const domain = email.split('@')[1]
  return domain === allowedDomain
}

export function validateDeviceTag(deviceTag: string): boolean {
  return /^\d{1}-\d{1,2}-\d{1,2}$/.test(deviceTag)
}

export function validateClassFormat(className: string): boolean {
  return /^\d{1}-\d{1,2}$/.test(className)
}

export function validateStudentNo(studentNo: string): boolean {
  return /^\d{1,2}$/.test(studentNo) && parseInt(studentNo) <= 40
}

export type LoanApplicationData = z.infer<typeof loanApplicationSchema>
export type DeviceUpdateData = z.infer<typeof deviceUpdateSchema>
export type UserUpdateData = z.infer<typeof userUpdateSchema>