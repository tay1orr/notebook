import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
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

// 관리자 전용 Supabase 클라이언트 (서비스 롤 키 사용)
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin credentials')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}