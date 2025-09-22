'use client'

import { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface SignaturePadProps {
  onSignature: (signature: string) => void
  title?: string
  description?: string
}

export function SignaturePad({ onSignature, title, description }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Get DPR for high-DPI displays
    const dpr = window.devicePixelRatio || 1

    // Set canvas size
    const displayWidth = 400
    const displayHeight = 200

    // Set display size (CSS pixels)
    canvas.style.width = displayWidth + 'px'
    canvas.style.height = displayHeight + 'px'

    // Set actual size (device pixels)
    canvas.width = displayWidth * dpr
    canvas.height = displayHeight * dpr

    // Scale the drawing context to match device pixel ratio
    ctx.scale(dpr, dpr)

    // Set drawing styles
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Fill with white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, displayWidth, displayHeight)
  }, [])

  const getMouseCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const dpr = window.devicePixelRatio || 1

    const x = (e.clientX - rect.left) * scaleX / dpr
    const y = (e.clientY - rect.top) * scaleY / dpr

    return { x, y }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { x, y } = getMouseCoordinates(e)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setIsEmpty(false)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const { x, y } = getMouseCoordinates(e)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const getTouchCoordinates = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0]
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const dpr = window.devicePixelRatio || 1

    const x = (touch.clientX - rect.left) * scaleX / dpr
    const y = (touch.clientY - rect.top) * scaleY / dpr

    return { x, y }
  }

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    const { x, y } = getTouchCoordinates(e)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setIsEmpty(false)
  }

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const { x, y } = getTouchCoordinates(e)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear considering DPR scaling
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()

    // Re-apply scale and background
    const dpr = window.devicePixelRatio || 1
    ctx.scale(dpr, dpr)

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 400, 200) // Display size
    setIsEmpty(true)
  }

  const saveSignature = () => {
    const canvas = canvasRef.current
    if (!canvas || isEmpty) return

    const dataURL = canvas.toDataURL('image/png')
    onSignature(dataURL)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{title || '전자 서명'}</CardTitle>
        <CardDescription>
          {description || '아래 영역에 서명해 주세요.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-2">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawingTouch}
            onTouchMove={drawTouch}
            onTouchEnd={stopDrawingTouch}
            className="w-full h-48 cursor-crosshair touch-none"
            style={{ maxWidth: '100%', height: '200px' }}
          />
        </div>
        <div className="flex justify-between space-x-2">
          <Button
            variant="outline"
            onClick={clearSignature}
            className="flex-1"
          >
            다시 그리기
          </Button>
          <Button
            onClick={saveSignature}
            disabled={isEmpty}
            className="flex-1"
          >
            서명 완료
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}