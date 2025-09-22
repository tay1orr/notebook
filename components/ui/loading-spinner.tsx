'use client'

import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  text?: string
  variant?: 'default' | 'overlay' | 'inline'
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
}

export function LoadingSpinner({
  size = 'md',
  className,
  text,
  variant = 'default'
}: LoadingSpinnerProps) {
  const spinnerElement = (
    <div className="flex items-center justify-center space-x-2">
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-muted border-t-primary',
          sizeClasses[size],
          className
        )}
      />
      {text && (
        <span className={cn(
          'text-muted-foreground',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base',
          size === 'xl' && 'text-lg'
        )}>
          {text}
        </span>
      )}
    </div>
  )

  if (variant === 'overlay') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="rounded-lg border bg-card p-6 shadow-lg">
          {spinnerElement}
        </div>
      </div>
    )
  }

  if (variant === 'inline') {
    return spinnerElement
  }

  return (
    <div className="flex min-h-[200px] items-center justify-center">
      {spinnerElement}
    </div>
  )
}

// 페이지 로딩용 스피너
export function PageLoadingSpinner({ text = "페이지를 불러오는 중..." }: { text?: string }) {
  return <LoadingSpinner size="lg" text={text} variant="default" />
}

// 오버레이 로딩 스피너
export function OverlayLoadingSpinner({ text = "처리 중..." }: { text?: string }) {
  return <LoadingSpinner size="lg" text={text} variant="overlay" />
}

// 버튼 내 로딩 스피너
export function ButtonLoadingSpinner() {
  return <LoadingSpinner size="sm" variant="inline" className="mr-2" />
}

// 테이블 로딩 스피너
export function TableLoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner size="md" text="데이터를 불러오는 중..." />
    </div>
  )
}