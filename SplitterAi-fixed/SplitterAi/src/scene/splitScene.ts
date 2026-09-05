import * as THREE from 'three'
import { settingsFor, stepDown, type QualitySettings, type Tier } from '../lib/quality'

/**
 * THE SPLIT
 *
 * The shot: a bundle of lanes fans out from a convergence point just off
 * the top of frame, runs parallel through the visible middle, and
 * reconverges just off the bottom. Luminous pulses travel down each lane
 * at slightly different rates.
 *
 * That is the product — one instruction divided across parallel agents and
 * rejoined — rather than decoration that happens to be three-dimensional.
 * It replaces a rotating additive point cloud, which is the single most
 * recognisable "generated landing page" backdrop there is.
 *
 * Composition notes:
 *  - Both convergence points sit outside the viewport. What you see is the
 *    parallel middle, which is the part that means something.
 *  - No lane runs down the centre. The minimum lateral magnitude is tuned
 *    so the central column stays empty for the headline and input — the
 *    negative space is shaped by the composition, not left to chance.
 *  - Depth is carried by a per-fragment depth fade rather than a fog pass
 *    or a depth-of-field pass. Cheaper, and precisely controllable.
 *  - No bloom, no additive blending, no glow sprites. The pulse reads as
 *    light because it is brighter than its lane, not because it smears.
 */

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform vec3  uLane;    // resting colour of the lane
  uniform vec3  uPulse;   // colour of the travelling head
  uniform float uTime;    // seconds
  uniform float uSpeed;   // laps per second
  uniform float uPhase;   // 0..1 offset so lanes don't march in lockstep
  uniform float uNear;
  uniform float uFar;

  varying vec2  vUv;
  varying float vDepth;

  void main() {
    // vUv.x runs along the tube's length.
    float along = vUv.x;

    // Taper both ends so a lane dissolves instead of stopping dead.
    float ends = smoothstep(0.0, 0.20, along) * (1.0 - smoothstep(0.80, 1.0, along));

    float head = fract(uTime * uSpeed + uPhase);

    // Wrap the distance to the head into -0.5..0.5 so the pulse crosses
    // the seam without a visible jump.
    float d = along - head;
    d -= floor(d + 0.5);

    float core = exp(-abs(d) * 26.0);            // tight bright head
    float tail = exp(-max(-d, 0.0) * 7.0) * 0.34; // longer wake behind it
    float pulse = clamp(core + tail, 0.0, 1.0);

    float depth = 1.0 - smoothstep(uNear, uFar, vDepth);

    vec3 color = mix(uLane, uPulse, pulse);
    float alpha = (0.15 + pulse * 0.85) * ends * depth;

    gl_FragColor = vec4(color, alpha);
  }
`

/** World-space geometry of the shot. */
const SHOT = {
  /** Half the vertical span. Convergence points sit at ±H, off-frame. */
  height: 3.2,
  /** Lateral control magnitude. Widest point lands near 0.75 × this. */
  spread: 3.5,
  /** Depth range the lanes are distributed through. */
  depth: 1.9,
  /** Smallest lateral magnitude, as a fraction. Keeps the centre clear. */
  minMagnitude: 0.72,
  radius: 0.012,
  cameraZ: 7.4,
  fov: 42,
}

/** A still, well-composed frame. Used for reduced motion and the low tier. */
const STILL_TIME = 2.35

interface Lane {
  mesh: THREE.Mesh
  material: THREE.ShaderMaterial
  geometry: THREE.TubeGeometry
}

export class SplitScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private group = new THREE.Group()
  private lanes: Lane[] = []

  private quality: QualitySettings
  private clock = new THREE.Clock()
  private time = STILL_TIME
  private frame = 0

  private pointer = { x: 0, y: 0 }
  private eye = { x: 0, y: 0 }

  /** Rolling mean frame time, for stepping quality down under load. */
  private meanDt = 1 / 60
  private slowFrames = 0
  private running = false
  private disposed = false

  constructor(
    private canvas: HTMLCanvasElement,
    tier: Tier,
  ) {
    this.quality = settingsFor(tier)

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: this.quality.antialias,
      powerPreference: 'default',
    })
    this.renderer.setClearAlpha(0)

    // Linear output space, deliberately. Nothing here is textured or
    // PBR-lit, so there is no colour pipeline to honour — and this way the
    // hex values authored below are exactly what reaches the screen,
    // rather than being converted twice.
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace

    this.camera = new THREE.PerspectiveCamera(SHOT.fov, 1, 0.1, 40)
    this.camera.position.set(0, 0, SHOT.cameraZ)
    this.camera.lookAt(0, 0, 0)

    this.scene.add(this.group)
    this.build()
  }

  /* ── Geometry ───────────────────────────────────────────────────────── */

  private build() {
    const { lanes: count, tubularSegments, radialSegments } = this.quality
    const lane = new THREE.Color('#2A4560')
    const pulse = new THREE.Color('#7FCBFF')

    for (let i = 0; i < count; i++) {
      // Alternate sides and step outward, so no lane sits on the centre
      // line and the bundle reads as pairs rather than a comb.
      const side = i % 2 === 0 ? -1 : 1
      const rank = Math.floor(i / 2)
      const ranks = Math.max(1, Math.ceil(count / 2) - 1)
      const magnitude =
        SHOT.minMagnitude + (1 - SHOT.minMagnitude) * (ranks === 0 ? 1 : rank / ranks)

      const x = side * magnitude * SHOT.spread
      // Spread through depth so the bundle has volume; the nearest lane is
      // slightly in front of the notional plane, the rest recede.
      const z = (i / Math.max(1, count - 1) - 0.72) * SHOT.depth

      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(0, SHOT.height, 0),
        new THREE.Vector3(x, SHOT.height * 0.55, z),
        new THREE.Vector3(x, -SHOT.height * 0.55, z),
        new THREE.Vector3(0, -SHOT.height, 0),
      )

      const geometry = new THREE.TubeGeometry(
        curve,
        tubularSegments,
        SHOT.radius,
        radialSegments,
        false,
      )

      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uLane: { value: lane.clone() },
          uPulse: { value: pulse.clone() },
          uTime: { value: this.time },
          // Rates are close but not equal, and not integer multiples of
          // each other, so the lanes never resynchronise into a pattern.
          uSpeed: { value: 0.108 + i * 0.0121 },
          uPhase: { value: (i * 0.37) % 1 },
          uNear: { value: SHOT.cameraZ - 1.2 },
          uFar: { value: SHOT.cameraZ + SHOT.depth + 2.4 },
        },
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.frustumCulled = false
      this.group.add(mesh)
      this.lanes.push({ mesh, material, geometry })
    }
  }

  private teardownLanes() {
    for (const lane of this.lanes) {
      this.group.remove(lane.mesh)
      lane.geometry.dispose()
      lane.material.dispose()
    }
    this.lanes = []
  }

  /* ── Runtime ────────────────────────────────────────────────────────── */

  resize(width: number, height: number) {
    if (this.disposed || width === 0 || height === 0) return
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.dpr))
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    if (!this.running) this.renderOnce()
  }

  /** Normalised pointer, -0.5..0.5 on both axes. */
  setPointer(x: number, y: number) {
    this.pointer.x = x
    this.pointer.y = y
  }

  /** One frame at the still composition, then nothing. */
  renderOnce() {
    if (this.disposed) return
    for (const lane of this.lanes) lane.material.uniforms.uTime.value = this.time
    this.camera.position.set(0, 0, SHOT.cameraZ)
    this.camera.lookAt(0, 0, 0)
    this.renderer.render(this.scene, this.camera)
  }

  start() {
    if (this.disposed || this.running) return
    if (!this.quality.animate) {
      this.renderOnce()
      return
    }
    this.running = true
    this.clock.start()
    this.loop()
  }

  stop() {
    this.running = false
    this.clock.stop()
  }

  private loop = () => {
    if (!this.running || this.disposed) return
    this.frame = requestAnimationFrame(this.loop)

    // Clamp so a backgrounded tab returning does not jump the pulses.
    const dt = Math.min(this.clock.getDelta(), 1 / 20)
    this.time += dt

    this.watchPerformance(dt)

    // Exponential damping toward the pointer target, framed in dt so the
    // feel is identical at 60 and 144Hz. Amplitude is deliberately tiny —
    // a couple of degrees reads as alive, more reads as seasick.
    const k = 1 - Math.exp(-2.6 * dt)
    this.eye.x += (this.pointer.x * 1.15 - this.eye.x) * k
    this.eye.y += (-this.pointer.y * 0.7 - this.eye.y) * k

    this.camera.position.set(this.eye.x, this.eye.y, SHOT.cameraZ)
    this.camera.lookAt(0, 0, 0)

    for (const lane of this.lanes) lane.material.uniforms.uTime.value = this.time

    this.renderer.render(this.scene, this.camera)
  }

  /**
   * Steps quality down if frames genuinely slip, rather than trusting the
   * up-front device guess. Only ever downward — hunting between tiers is
   * more visible than sitting one tier low.
   */
  private watchPerformance(dt: number) {
    this.meanDt += (dt - this.meanDt) * 0.05

    if (this.meanDt > 1 / 45) {
      this.slowFrames += 1
    } else {
      this.slowFrames = Math.max(0, this.slowFrames - 1)
    }

    if (this.slowFrames < 90) return
    this.slowFrames = 0

    const next = stepDown(this.quality.tier)
    if (next === this.quality.tier) return

    this.quality = settingsFor(next)
    this.teardownLanes()
    this.build()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.dpr))
    this.meanDt = 1 / 60
  }

  dispose() {
    this.disposed = true
    this.running = false
    cancelAnimationFrame(this.frame)
    this.teardownLanes()
    this.scene.remove(this.group)
    this.renderer.dispose()
  }
}
