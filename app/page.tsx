'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/auth')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">인천중산고 노트북 관리</h1>
        <p className="text-muted-foreground">로그인 페이지로 이동중...</p>
      </div>
    </div>
  )
}