import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

// Server Components 전용 Supabase 클라이언트
export const createServerClient = () => createServerComponentClient<Database>({ cookies })