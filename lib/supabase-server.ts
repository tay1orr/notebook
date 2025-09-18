import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Server Components 전용 Supabase 클라이언트
export const createServerClient = () => {
  try {
    return createServerComponentClient({ cookies })
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    throw error
  }
}