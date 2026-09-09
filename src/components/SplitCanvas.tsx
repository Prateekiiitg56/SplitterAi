import { useEffect, useRef, useState } from 'react'
import { SplitScene, type CanvasVariant } from '../scene/splitScene'
import { detectTier, hasWebGL } from '../lib/quality'

interface SplitCanvasProps {
  className?: string
  variant?: CanvasVariant
  speed?: number
  opacity?: number
}

/**
 * SplitCanvas — React surface for Three.js background scene.
 * Supports 'console' (default) and 'idle-tree' painterly branching variants.
 */
export default function SplitCanvas({
  className,
  variant = 'console',
  speed = 1.0,
  opacity = 1.0,
}: SplitCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [supported] = useState(hasWebGL)

  useEffect(() => {
    if (!supported) return
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return

    let scene: SplitScene
    try {
      scene = new SplitScene(canvas, detectTier(), variant, speed)
    } catch {
      return
    }

    const size = () => {
      const rect = host.getBoundingClientRect()
      scene.resize(rect.width, rect.height)
    }
    size()

    let onScreen = true
    const sync = () => {
      if (onScreen && document.visibilityState === 'visible') scene.start()
      else scene.stop()
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting
        sync()
      },
      { threshold: 0 }
    )
    observer.observe(host)

    const resize = new ResizeObserver(size)
    resize.observe(host)

    const onPointer = (event: PointerEvent) => {
      scene.setPointer(
        event.clientX / window.innerWidth - 0.5,
        event.clientY / window.innerHeight - 0.5
      )
    }

    document.addEventListener('visibilitychange', sync)
    window.addEventListener('pointermove', onPointer, { passive: true })
    sync()

    return () => {
      observer.disconnect()
      resize.disconnect()
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('pointermove', onPointer)
      scene.dispose()
    }
  }, [supported, variant, speed])

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      style={{ opacity }}
      className={className ?? 'absolute inset-0 overflow-hidden pointer-events-none'}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(58% 44% at 50% 34%, rgba(72, 180, 255, 0.055), transparent 72%)',
        }}
      />

      {supported ? <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" /> : null}

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(78% 62% at 50% 50%, transparent 38%, var(--bg) 100%)',
        }}
      />
    </div>
  )
}
