import { useEffect, useRef } from 'react'

interface ConstellationBackgroundProps {
  enabled?: boolean
}

/**
 * Constellation particle-network background layer.
 * Matches the constellation canvas animation from fixes/*.html.
 */
export default function ConstellationBackground({ enabled = true }: ConstellationBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w: number, h: number, dpr: number
    let particles: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = []
    let raf: number

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ACCENT = [72, 180, 255]
    const LINK_DIST = 150

    function resize() {
      if (!canvas || !ctx) return
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.min(90, Math.round((w * h) / 22000))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.1 + 0.5,
      }))
    }

    function step() {
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < -20) p.x = w + 20
        else if (p.x > w + 20) p.x = -20
        if (p.y < -20) p.y = h + 20
        else if (p.y > h + 20) p.y = -20
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < LINK_DIST) {
            const o = (1 - dist / LINK_DIST) * 0.16
            ctx.strokeStyle = `rgba(${ACCENT[0]},${ACCENT[1]},${ACCENT[2]},${o})`
            ctx.lineWidth = 0.6
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(150,195,230,0.55)'
        ctx.fill()
      }

      if (!reduceMotion) {
        raf = requestAnimationFrame(step)
      }
    }

    resize()
    step()

    const handleResize = () => {
      cancelAnimationFrame(raf)
      resize()
      step()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', handleResize)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <canvas
      id="constellation-canvas"
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
