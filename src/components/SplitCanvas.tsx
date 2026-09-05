import { useEffect, useRef, useState } from 'react'
import { SplitScene } from '../scene/splitScene'
import { detectTier, hasWebGL } from '../lib/quality'

/**
 * SplitCanvas — the React surface for the one earned 3D moment.
 *
 * Rules this wrapper exists to enforce:
 *
 *  - It is decoration in the accessibility tree's eyes, so `aria-hidden`
 *    and `pointer-events-none`. The meaning it carries is also stated in
 *    the copy it sits behind; nothing here is the only way to learn
 *    anything.
 *  - It never runs when it cannot be seen. Off-screen (IntersectionObserver)
 *    and backgrounded (`visibilitychange`) both stop the loop, because a
 *    hidden rAF loop is just a battery drain.
 *  - Reduced motion is answered with a still, deliberately composed frame
 *    rather than a blank space — the tier resolves to `off`, which renders
 *    one frame and stops.
 *  - No WebGL means the CSS gradient fallback below stands alone, and no
 *    three.js work is attempted at all.
 *
 * Mounted once, high in the tree, and left alone: re-creating a WebGL
 * context on navigation is the classic way to leak them.
 */
export default function SplitCanvas({ className }: { className?: string }) {
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
      scene = new SplitScene(canvas, detectTier())
    } catch {
      // A context can still fail after the probe said yes — a lost driver,
      // a tab over the browser's context limit. Fall through to the CSS.
      return
    }

    const size = () => {
      const rect = host.getBoundingClientRect()
      scene.resize(rect.width, rect.height)
    }
    size()

    /* Visible AND foregrounded, or the loop stays parked. */
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
      { threshold: 0 },
    )
    observer.observe(host)

    const resize = new ResizeObserver(size)
    resize.observe(host)

    // Pointer parallax is read at the window level, normalised to
    // -0.5..0.5, and only moves the camera by a couple of degrees.
    const onPointer = (event: PointerEvent) => {
      scene.setPointer(
        event.clientX / window.innerWidth - 0.5,
        event.clientY / window.innerHeight - 0.5,
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
  }, [supported])

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={className ?? 'absolute inset-0 overflow-hidden pointer-events-none'}
    >
      {/*
        The floor of the composition, present at every tier. A single very
        soft cold pool behind the copy column, so the headline sits on
        something even with the canvas dark or absent.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(58% 44% at 50% 34%, rgba(72, 180, 255, 0.055), transparent 72%)',
        }}
      />

      {supported ? <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" /> : null}

      {/*
        Vignette. Pulls the eye to the centre and keeps the lanes from
        reaching the panel edges, where they would fight the chrome.
      */}
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
