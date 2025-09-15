'use client'

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SignaturePadRef {
  clear: () => void
  getSignatureData: () => string | null
  isEmpty: () => boolean
}

interface SignaturePadProps {
  width?: number
  height?: number
  penColor?: string
  penWidth?: number
  className?: string
  onSignatureChange?: (hasSignature: boolean) => void
  disabled?: boolean
  placeholder?: string
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({
  width = 400,
  height = 200,
  penColor = '#000000',
  penWidth = 2,
  className,
  onSignatureChange,
  disabled = false,
  placeholder = '여기에 서명해주세요'
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null)

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = penColor
        ctx.lineWidth = penWidth
        setContext(ctx)

        // 캔버스 크기 설정
        canvas.width = width
        canvas.height = height

        // 고해상도 디스플레이 지원
        const devicePixelRatio = window.devicePixelRatio || 1
        canvas.width = width * devicePixelRatio
        canvas.height = height * devicePixelRatio
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        ctx.scale(devicePixelRatio, devicePixelRatio)

        // 초기 배경 설정
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
      }
    }
  }, [width, height, penColor, penWidth])

  const getEventPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      // 터치 이벤트
      const touch = e.touches[0] || e.changedTouches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      }
    } else {
      // 마우스 이벤트
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      }
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || !context) return

    e.preventDefault()
    setIsDrawing(true)

    const pos = getEventPos(e)
    context.beginPath()
    context.moveTo(pos.x, pos.y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || !isDrawing || !context) return

    e.preventDefault()
    const pos = getEventPos(e)
    context.lineTo(pos.x, pos.y)
    context.stroke()

    if (!hasSignature) {
      setHasSignature(true)
      onSignatureChange?.(true)
    }
  }

  const stopDrawing = () => {
    if (disabled || !context) return

    setIsDrawing(false)
    context.closePath()
  }

  const clear = () => {
    if (!context || !canvasRef.current) return

    const canvas = canvasRef.current
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    setHasSignature(false)
    onSignatureChange?.(false)
  }

  const getSignatureData = (): string | null => {
    if (!canvasRef.current || !hasSignature) return null

    try {
      return canvasRef.current.toDataURL('image/png')
    } catch (error) {
      console.error('Error getting signature data:', error)
      return null
    }
  }

  const isEmpty = (): boolean => {
    return !hasSignature
  }

  useImperativeHandle(ref, () => ({
    clear,
    getSignatureData,
    isEmpty
  }))

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'relative border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden',
          {
            'border-blue-300 bg-blue-50': isDrawing,
            'opacity-50 cursor-not-allowed': disabled,
            'hover:border-gray-400': !disabled && !isDrawing
          }
        )}
        style={{ width, height }}
      >
        <canvas
          ref={canvasRef}
          className={cn(
            'absolute inset-0 cursor-crosshair',
            {
              'cursor-not-allowed': disabled
            }
          )}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            touchAction: 'none' // 터치 스크롤 방지
          }}
        />

        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-400">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <p className="text-sm">{placeholder}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {hasSignature ? '서명 완료' : '서명이 필요합니다'}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
          disabled={disabled || !hasSignature}
          className="text-xs"
        >
          지우기
        </Button>
      </div>
    </div>
  )
})

SignaturePad.displayName = 'SignaturePad'

// 서명 데이터를 이미지로 표시하는 컴포넌트
interface SignatureDisplayProps {
  signatureData: string
  width?: number
  height?: number
  className?: string
  alt?: string
}

export function SignatureDisplay({
  signatureData,
  width = 200,
  height = 100,
  className,
  alt = '서명'
}: SignatureDisplayProps) {
  if (!signatureData) {
    return (
      <div
        className={cn(
          'border border-gray-200 rounded bg-gray-50 flex items-center justify-center',
          className
        )}
        style={{ width, height }}
      >
        <span className="text-gray-400 text-sm">서명 없음</span>
      </div>
    )
  }

  return (
    <img
      src={signatureData}
      alt={alt}
      width={width}
      height={height}
      className={cn('border border-gray-200 rounded', className)}
      style={{ maxWidth: width, maxHeight: height }}
    />
  )
}

// 서명 확인 다이얼로그용 컴포넌트
interface SignatureConfirmProps {
  signatureData: string
  signerName: string
  onConfirm: () => void
  onCancel: () => void
}

export function SignatureConfirm({
  signatureData,
  signerName,
  onConfirm,
  onCancel
}: SignatureConfirmProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">서명 확인</h3>
        <p className="text-sm text-gray-600">
          <strong>{signerName}</strong>님의 서명을 확인해주세요.
        </p>
      </div>

      <div className="flex justify-center">
        <SignatureDisplay
          signatureData={signatureData}
          width={300}
          height={150}
          className="border-2"
        />
      </div>

      <div className="flex space-x-3 justify-end">
        <Button variant="outline" onClick={onCancel}>
          다시 서명
        </Button>
        <Button onClick={onConfirm}>
          확인
        </Button>
      </div>
    </div>
  )
}