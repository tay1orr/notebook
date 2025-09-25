export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'manager' | 'homeroom' | 'helper' | 'student'
          class_id: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: 'admin' | 'manager' | 'homeroom' | 'helper' | 'student'
          class_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'admin | manager | homeroom | helper | student'
          class_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      classes: {
        Row: {
          id: string
          grade: number
          name: string
          homeroom_teacher_id: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          grade: number
          name: string
          homeroom_teacher_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          grade?: number
          name?: string
          homeroom_teacher_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          user_id?: string
          role?: string
          created_at?: string
        }
      }
      students: {
        Row: {
          id?: string
          user_id: string
          name: string
          email: string
          grade: number
          class: number
          student_no: number | null
          phone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email: string
          grade: number
          class: number
          student_no?: number | null
          phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string
          grade?: number
          class?: number
          student_no?: number | null
          phone?: string | null
          created_at?: string
        }
      }
      devices: {
        Row: {
          id: string
          asset_tag: string
          model: string
          serial_number: string
          assigned_class_id: string | null
          status: '충전함' | '대여중' | '점검' | '분실'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          asset_tag: string
          model: string
          serial_number: string
          assigned_class_id?: string | null
          status?: '충전함' | '대여중' | '점검' | '분실'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          asset_tag?: string
          model?: string
          serial_number?: string
          assigned_class_id?: string | null
          status?: '충전함' | '대여중' | '점검' | '분실'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      loans: {
        Row: {
          id: string
          device_id: string
          student_id: string
          requested_at: string
          approved_at: string | null
          approver_id: string | null
          picked_up_at: string | null
          due_date: string
          returned_at: string | null
          status: 'requested' | 'approved' | 'picked_up' | 'returned' | 'overdue'
          student_signature: string | null
          helper_signature: string | null
          homeroom_signature: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          device_id: string
          student_id: string
          requested_at?: string
          approved_at?: string | null
          approver_id?: string | null
          picked_up_at?: string | null
          due_date: string
          returned_at?: string | null
          status?: 'requested' | 'approved' | 'picked_up' | 'returned' | 'overdue'
          student_signature?: string | null
          helper_signature?: string | null
          homeroom_signature?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          student_id?: string
          requested_at?: string
          approved_at?: string | null
          approver_id?: string | null
          picked_up_at?: string | null
          due_date?: string
          returned_at?: string | null
          status?: 'requested' | 'approved' | 'picked_up' | 'returned' | 'overdue'
          student_signature?: string | null
          helper_signature?: string | null
          homeroom_signature?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      loan_applications: {
        Row: {
          id: string
          student_name: string
          student_no: string
          class_name: string
          email: string
          student_contact: string | null
          purpose: string
          purpose_detail: string | null
          return_date: string
          return_time: string | null
          due_date: string | null
          device_tag: string | null
          status: 'requested' | 'approved' | 'picked_up' | 'returned' | 'overdue' | 'rejected'
          signature: string | null
          approved_by: string | null
          approved_by_role: 'admin' | 'manager' | 'homeroom' | 'helper' | null
          approved_at: string | null
          rejected_by_role: 'admin' | 'manager' | 'homeroom' | 'helper' | null
          picked_up_at: string | null
          returned_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_name: string
          student_no: string
          class_name: string
          email: string
          student_contact?: string | null
          purpose: string
          purpose_detail?: string | null
          return_date: string
          return_time?: string | null
          due_date?: string | null
          device_tag?: string | null
          status?: 'requested' | 'approved' | 'picked_up' | 'returned' | 'overdue' | 'rejected'
          signature?: string | null
          approved_by?: string | null
          approved_by_role?: 'admin' | 'manager' | 'homeroom' | 'helper' | null
          approved_at?: string | null
          rejected_by_role?: 'admin' | 'manager' | 'homeroom' | 'helper' | null
          picked_up_at?: string | null
          returned_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_name?: string
          student_no?: string
          class_name?: string
          email?: string
          student_contact?: string | null
          purpose?: string
          purpose_detail?: string | null
          return_date?: string
          return_time?: string | null
          due_date?: string | null
          device_tag?: string | null
          status?: 'requested' | 'approved' | 'picked_up' | 'returned' | 'overdue' | 'rejected'
          signature?: string | null
          approved_by?: string | null
          approved_by_role?: 'admin' | 'manager' | 'homeroom' | 'helper' | null
          approved_at?: string | null
          rejected_by_role?: 'admin' | 'manager' | 'homeroom' | 'helper' | null
          picked_up_at?: string | null
          returned_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      loan_summaries_daily: {
        Row: {
          id: string
          date: string
          class_id: string
          total_loans: number
          total_returns: number
          remaining_devices: number
          unauthorized_count: number
          overdue_count: number
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          class_id: string
          total_loans?: number
          total_returns?: number
          remaining_devices?: number
          unauthorized_count?: number
          overdue_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          class_id?: string
          total_loans?: number
          total_returns?: number
          remaining_devices?: number
          unauthorized_count?: number
          overdue_count?: number
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string
          old_values: Json | null
          new_values: Json | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id: string
          old_values?: Json | null
          new_values?: Json | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string
          old_values?: Json | null
          new_values?: Json | null
          metadata?: Json | null
          created_at?: string
        }
      }
      school_calendar: {
        Row: {
          id: string
          date: string
          is_school_day: boolean
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          is_school_day?: boolean
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          is_school_day?: boolean
          description?: string | null
          created_at?: string
        }
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      v_active_loans: {
        Row: {
          id: string
          device_id: string
          student_id: string
          requested_at: string
          approved_at: string | null
          approver_id: string | null
          picked_up_at: string | null
          due_date: string
          returned_at: string | null
          status: 'requested' | 'approved' | 'picked_up' | 'returned' | 'overdue'
          student_signature: string | null
          helper_signature: string | null
          homeroom_signature: string | null
          notes: string | null
          created_at: string
          updated_at: string
          student_name: string
          student_no: string
          grade: number
          class_name: string
          asset_tag: string
          device_model: string
          approver_name: string | null
        }
      }
      v_overdue_loans: {
        Row: {
          id: string
          device_id: string
          student_id: string
          requested_at: string
          approved_at: string | null
          approver_id: string | null
          picked_up_at: string | null
          due_date: string
          returned_at: string | null
          status: 'requested' | 'approved' | 'picked_up' | 'returned' | 'overdue'
          student_signature: string | null
          helper_signature: string | null
          homeroom_signature: string | null
          notes: string | null
          created_at: string
          updated_at: string
          student_name: string
          student_no: string
          grade: number
          class_name: string
          asset_tag: string
          device_model: string
          hours_overdue: number
        }
      }
      v_device_availability: {
        Row: {
          class_id: string
          grade: number
          class_name: string
          total_devices: number
          available_devices: number
          loaned_devices: number
          maintenance_devices: number
          lost_devices: number
        }
      }
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_class_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}