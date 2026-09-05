import { useReducedMotion } from 'framer-motion'
import type { Transition, Variants } from 'framer-motion'

/**
 * THE MOTION SCORE
 *
 * Every duration and easing in the application resolves to something in
 * this file. These values mirror the --d-* and --e-* custom properties in
 * index.css; if you change one, change both.
 *
 * The rule that matters: interface motion and scene motion are different
 * vocabularies. Anything that answers a user's click resolves in under
 * 300ms — a button that responds cinematically feels broken, not
 * expensive. Only the WebGL scene is allowed `cine` timing.
 */

/** Seconds, for framer-motion. */
export const duration = {
  quick: 0.14, // hover, colour shift, press
  base: 0.22, // reveal, expand, dropdown
  slow: 0.42, // drawer, modal, layout move
  cine: 1.2, // WebGL scene only
} as const

/**
 * Custom curves, deliberately not the library defaults. `easeInOut` on
 * everything is the commonest tell that nobody chose the motion.
 *
 * Typed as mutable 4-tuples rather than `as const`: framer-motion's
 * `Easing` accepts `[number, number, number, number]`, and a readonly
 * tuple is not assignable to it.
 */
type Bezier = [number, number, number, number]

export const ease = {
  /** Workhorse. Decisive start, long settle. */
  standard: [0.32, 0.72, 0, 1] as Bezier,
  /** Entrances. Very strong ease-out — arrives fast, lands softly. */
  out: [0.16, 1, 0.3, 1] as Bezier,
  /** Exits. Accelerates away; nothing should linger on the way out. */
  in: [0.7, 0, 0.84, 0] as Bezier,
}

/** Stagger held to 40–80ms so children overlap rather than queue. */
export const stagger = { tight: 0.04, base: 0.055, loose: 0.08 } as const

export const transition = {
  quick: { duration: duration.quick, ease: ease.standard },
  base: { duration: duration.base, ease: ease.out },
  slow: { duration: duration.slow, ease: ease.standard },
  exit: { duration: duration.quick, ease: ease.in },
} satisfies Record<string, Transition>

/* ── Variants ───────────────────────────────────────────────────────────
   Entrances travel a short distance. Long slides read as decoration and
   make a dense interface feel unstable.                                */

export const revealParent: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: stagger.base, delayChildren: 0.04 } },
}

export const revealChild: Variants = {
  hidden: { opacity: 0, y: 6 },
  shown: { opacity: 1, y: 0, transition: transition.base },
}

export const backdrop: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: duration.base, ease: ease.out } },
  gone: { opacity: 0, transition: transition.exit },
}

/** Modals scale from very near 1. Anything punchier reads as a toy. */
export const dialog: Variants = {
  hidden: { opacity: 0, scale: 0.985, y: 8 },
  shown: { opacity: 1, scale: 1, y: 0, transition: { duration: duration.slow, ease: ease.out } },
  gone: { opacity: 0, scale: 0.99, y: 4, transition: transition.exit },
}

export const popover: Variants = {
  hidden: { opacity: 0, y: -4, scale: 0.98 },
  shown: { opacity: 1, y: 0, scale: 1, transition: transition.base },
  gone: { opacity: 0, y: -2, scale: 0.99, transition: transition.exit },
}

/**
 * Reduced-motion-aware score.
 *
 * This does not disable motion, it substitutes a different one: distance
 * and scale collapse to zero, durations collapse to near-instant, and
 * what survives is a plain opacity change. State transitions still read
 * as transitions, they just stop moving through space.
 */
export function useScore() {
  const reduced = useReducedMotion()

  if (!reduced) {
    return { reduced, revealParent, revealChild, backdrop, dialog, popover, transition }
  }

  const instant: Transition = { duration: 0.01 }
  const fade: Variants = {
    hidden: { opacity: 0 },
    shown: { opacity: 1, transition: instant },
    gone: { opacity: 0, transition: instant },
  }

  return {
    reduced,
    revealParent: { hidden: {}, shown: { transition: { staggerChildren: 0 } } } as Variants,
    revealChild: fade,
    backdrop: fade,
    dialog: fade,
    popover: fade,
    transition: { quick: instant, base: instant, slow: instant, exit: instant },
  }
}
