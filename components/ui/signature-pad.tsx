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
  ({ width = 350, height = 120, className = '', onSignatureChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawing = useRef(false)
    const hasDrawn = useRef(false)

    useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current
        if (canvas) {
          const ctx = canvas.getContext('2d')
          if (ctx) {
            // Clear the entire canvas considering DPR scaling
            ctx.save()
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.restore()

            // Re-apply scale for future drawings
            const dpr = window.devicePixelRatio || 1
            ctx.scale(dpr, dpr)

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

      // Get DPR for high-DPI displays
      const dpr = window.devicePixelRatio || 1

      // Get parent container size for responsive design
      const container = canvas.parentElement
      const containerWidth = container ? container.clientWidth : width
      const containerHeight = container ? container.clientHeight : height

      // Set canvas size (responsive)
      const finalWidth = Math.min(containerWidth, width)
      const finalHeight = height

      // Set display size (CSS pixels)
      canvas.style.width = finalWidth + 'px'
      canvas.style.height = finalHeight + 'px'

      // Set actual size (device pixels)
      canvas.width = finalWidth * dpr
      canvas.height = finalHeight * dpr

      // Scale the drawing context to match device pixel ratio
      ctx.scale(dpr, dpr)

      // Set drawing properties
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const getCoordinates = (e: MouseEvent | TouchEvent) => {
        const rect = canvas.getBoundingClientRect()
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

        // Calculate coordinates relative to canvas element with correct scaling
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        const x = (clientX - rect.left) * scaleX / (window.devicePixelRatio || 1)
        const y = (clientY - rect.top) * scaleY / (window.devicePixelRatio || 1)

        return { x, y }
      }

      const startDrawing = (e: MouseEvent | TouchEvent) => {
        e.preventDefault()
        isDrawing.current = true
        hasDrawn.current = true
        onSignatureChange?.(false)

        const { x, y } = getCoordinates(e)
        ctx.beginPath()
        ctx.moveTo(x, y)
      }

      const draw = (e: MouseEvent | TouchEvent) => {
        if (!isDrawing.current) return
        e.preventDefault()

        const { x, y } = getCoordinates(e)
        ctx.lineTo(x, y)
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
          className="w-full h-full block"
          style={{
            touchAction: 'none',
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </div>
    )
  }
)

SignaturePad.displayName = 'SignaturePad'