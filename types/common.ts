// 공통 타입 정의
export type UserRole = 'admin' | 'manager' | 'homeroom' | 'helper' | 'student'

export type LoanStatus = 'requested' | 'approved' | 'picked_up' | 'returned' | 'rejected' | 'cancelled' | 'overdue'

export type DeviceStatus = '충전함' | '대여중' | '점검' | '분실'

// 사용자 인터페이스
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  class_id: string | null
  grade?: string
  class?: string
  studentNo?: string
  pendingHomeroom?: boolean
  isApprovedHomeroom?: boolean
  active: boolean
  created_at: string
  updated_at: string
}

// 대여 신청 인터페이스
export interface LoanApplication {
  id: string
  student_name: string
  student_no: string
  class_name: string
  email: string
  student_contact?: string
  purpose: string
  purpose_detail?: string
  return_date: string
  return_time?: string
  due_date: string
  device_tag?: string
  signature?: string
  notes?: string
  status: LoanStatus
  approved_by?: string
  approved_at?: string
  picked_up_at?: string
  returned_at?: string
  created_at: string
  updated_at: string
}

// 기기 인터페이스
export interface Device {
  id: string
  asset_tag: string
  model: string
  serial_number: string
  assigned_class_id?: string
  status: DeviceStatus
  notes?: string
  current_user?: string
  created_at: string
  updated_at: string
}

// 학급 인터페이스
export interface Class {
  id: string
  grade: number
  name: string
  homeroom_teacher_id?: string
  active: boolean
  created_at: string
  updated_at: string
}

// 학생 인터페이스
export interface Student {
  id: string
  class_id: string
  student_no: string
  name: string
  email: string
  phone?: string
  active: boolean
  created_at: string
  updated_at: string
}

// API 응답 타입
export interface ApiResponse<T = any> {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

// 페이지네이션 타입
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

// 필터 타입
export interface FilterParams {
  status?: LoanStatus[]
  class_name?: string
  date_from?: string
  date_to?: string
  search?: string
}

// 대시보드 통계 타입
export interface DashboardStats {
  totalLoans: number
  activeLoans: number
  overdueLoans: number
  availableDevices: number
  totalDevices: number
  recentLoans: LoanApplication[]
}

// 환경 설정 타입
export interface AppConfig {
  siteUrl: string
  allowedDomain: string
  adminEmail: string
  features: {
    calendar: boolean
    notifications: boolean
  }
}