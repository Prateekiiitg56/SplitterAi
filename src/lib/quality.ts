/**
 * Scene quality tiers.
 *
 * The scene is built once and then scaled to the device, rather than
 * shipping the desktop scene everywhere and hoping. Tier is decided from
 * cheap signals available before any WebGL work happens, then the frame
 * loop is allowed to step it down at runtime if frames actually slip.
 */

export type Tier = 'high' | 'medium' | 'low' | 'off'

export interface QualitySettings {
  tier: Tier
  /** Device pixel ratio cap. Native retina is rarely worth 4x the fill cost. */
  dpr: number
  /** Parallel lanes drawn between the split and the join. */
  lanes: number
  /** Segments along each lane's curve — this is the main triangle driver. */
  tubularSegments: number
  /** Cross-section resolution of each lane. 3 is a flat ribbon, 6 reads round. */
  radialSegments: number
  antialias: boolean
  /** False means render one frame and stop. */
  animate: boolean
}

const PRESETS: Record<Tier, Omit<QualitySettings, 'tier'>> = {
  high: { dpr: 1.75, lanes: 5, tubularSegments: 96, radialSegments: 6, antialias: true, animate: true },
  medium: { dpr: 1.35, lanes: 4, tubularSegments: 64, radialSegments: 5, antialias: true, animate: true },
  low: { dpr: 1, lanes: 3, tubularSegments: 40, radialSegments: 4, antialias: false, animate: true },
  off: { dpr: 1, lanes: 3, tubularSegments: 40, radialSegments: 4, antialias: false, animate: false },
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * True when WebGL is genuinely available, not merely when the API exists.
 * Creating a throwaway context is the only reliable check — a browser can
 * expose WebGLRenderingContext and still fail to give you a context on a
 * blocklisted driver.
 */
export function hasWebGL(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return false
    const lose = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')
    lose?.loseContext()
    return true
  } catch {
    return false
  }
}

export function detectTier(): Tier {
  if (typeof window === 'undefined') return 'off'
  if (!hasWebGL()) return 'off'
  if (prefersReducedMotion()) return 'off'

  const cores = navigator.hardwareConcurrency ?? 4
  const dpr = window.devicePixelRatio || 1
  const narrow = window.innerWidth < 900
  // A coarse-only pointer is the most reliable "this is a phone or tablet"
  // signal available without user-agent sniffing.
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false

  if (coarse || narrow) return cores >= 8 ? 'low' : 'off'
  if (cores <= 4) return 'low'
  if (cores <= 8 || dpr > 2) return 'medium'
  return 'high'
}

export function settingsFor(tier: Tier): QualitySettings {
  return { tier, ...PRESETS[tier] }
}

export function stepDown(tier: Tier): Tier {
  if (tier === 'high') return 'medium'
  if (tier === 'medium') return 'low'
  return 'low'
}

export function getQuality(): QualitySettings {
  return settingsFor(detectTier())
}
