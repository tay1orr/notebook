'use client'

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'

interface SignaturePadProps {
  width?: number
  height?: number
  className?: string
  onSignatureChange?: (isEmpty: boolean) => void
}

export interface SignaturePadRef {
  clear: () => void
  isEmpty: () => boolean
  toDataURL: () => string
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ width = 400, height = 150, className = '', onSignatureChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawing = useRef(false)
    const hasDrawn = useRef(false)

    useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current
        if (canvas) {
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            hasDrawn.current = false
            onSignatureChange?.(true)
          }
        }
      },
      isEmpty: () => !hasDrawn.current,
      toDataURL: () => {
        const canvas = canvasRef.current
        return canvas ? canvas.toDataURL() : ''
      }
    }))

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Set canvas size
      canvas.width = width
      canvas.height = height

      // Set drawing properties
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const startDrawing = (e: MouseEvent | TouchEvent) => {
        isDrawing.current = true
        hasDrawn.current = true
        onSignatureChange?.(false)

        const rect = canvas.getBoundingClientRect()
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

        ctx.beginPath()
        ctx.moveTo(clientX - rect.left, clientY - rect.top)
      }

      const draw = (e: MouseEvent | TouchEvent) => {
        if (!isDrawing.current) return

        const rect = canvas.getBoundingClientRect()
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

        ctx.lineTo(clientX - rect.left, clientY - rect.top)
        ctx.stroke()
      }

      const stopDrawing = () => {
        isDrawing.current = false
      }

      // Mouse events
      canvas.addEventListener('mousedown', startDrawing)
      canvas.addEventListener('mousemove', draw)
      canvas.addEventListener('mouseup', stopDrawing)
      canvas.addEventListener('mouseout', stopDrawing)

      // Touch events
      canvas.addEventListener('touchstart', startDrawing)
      canvas.addEventListener('touchmove', draw)
      canvas.addEventListener('touchend', stopDrawing)

      // Prevent scrolling when touching the canvas
      const preventScroll = (e: TouchEvent) => {
        if (e.target === canvas) {
          e.preventDefault()
        }
      }
      document.addEventListener('touchstart', preventScroll, { passive: false })
      document.addEventListener('touchend', preventScroll, { passive: false })
      document.addEventListener('touchmove', preventScroll, { passive: false })

      return () => {
        canvas.removeEventListener('mousedown', startDrawing)
        canvas.removeEventListener('mousemove', draw)
        canvas.removeEventListener('mouseup', stopDrawing)
        canvas.removeEventListener('mouseout', stopDrawing)
        canvas.removeEventListener('touchstart', startDrawing)
        canvas.removeEventListener('touchmove', draw)
        canvas.removeEventListener('touchend', stopDrawing)
        document.removeEventListener('touchstart', preventScroll)
        document.removeEventListener('touchend', preventScroll)
        document.removeEventListener('touchmove', preventScroll)
      }
    }, [width, height, onSignatureChange])

    return (
      <div className={`border border-gray-300 rounded-md bg-white ${className}`}>
        <canvas
          ref={canvasRef}
          className="block"
          style={{ touchAction: 'none' }}
        />
      </div>
    )
  }
)

SignaturePad.displayName = 'SignaturePad'