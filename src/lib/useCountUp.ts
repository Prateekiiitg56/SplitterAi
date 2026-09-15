import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * useCountUp — the reference's `data-count` entrance animation, as a hook.
 *
 * The original walked every [data-count] node on DOMContentLoaded and drove
 * textContent from a rAF loop. Same curve and duration here (700ms, cubic
 * ease-out), just owned by React instead of the DOM.
 *
 * Reduced motion returns the target immediately — matching the reference's own
 * `prefers-reduced-motion` check rather than animating a value nobody asked to
 * see move. useReducedMotion is framer-motion's, already the codebase's way of
 * asking (see lib/motion.ts's useScore).
 *
 * If `target` changes mid-flight — a session finishing while Home is open —
 * the animation restarts from the current displayed value, so the number never
 * jumps backwards to zero on a data refresh.
 */
export function useCountUp(target: number, durationMs = 700): number {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(reduced ? target : 0)
  const displayedRef = useRef(value)

  displayedRef.current = value

  useEffect(() => {
    if (reduced) {
      setValue(target)
      return
    }

    const from = displayedRef.current
    if (from === target) return

    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (p < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // displayedRef is read, not tracked — including `value` here would restart
    // the animation on every frame it sets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, reduced])

  return value
}

/**
 * useMountedFill — the `data-fill` progress animation.
 *
 * The reference set width to 0, then bumped it to the target inside a double
 * requestAnimationFrame so the browser would commit the 0 first and actually
 * transition. Returns false on the first paint and true immediately after,
 * which callers feed to IdeProgress's `from` prop.
 *
 * Under reduced motion it starts true, so bars render at their final width
 * with no transition at all.
 */
export function useMountedFill(): boolean {
  const reduced = useReducedMotion()
  const [filled, setFilled] = useState(Boolean(reduced))

  useEffect(() => {
    if (reduced) {
      setFilled(true)
      return
    }
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setFilled(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [reduced])

  return filled
}
