import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

// Client Components용 Supabase 클라이언트
export const createClient = () => createClientComponentClient<Database>()

// Server Components용 Supabase 클라이언트 (cookies를 매개변수로 받음)
export const createServerClient = (cookies: () => any) =>
  createServerComponentClient<Database>({ cookies })

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'