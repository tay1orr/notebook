'use client'

import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-6 p-8">
            <div className="space-y-2">
              <h1 className="text-6xl font-bold text-muted-foreground">오류</h1>
              <h2 className="text-2xl font-semibold">시스템 오류가 발생했습니다</h2>
              <p className="text-muted-foreground max-w-md">
                예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <Button onClick={() => reset()}>
                다시 시도
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
              >
                대시보드로 이동
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}