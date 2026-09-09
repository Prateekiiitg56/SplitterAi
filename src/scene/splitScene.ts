import * as THREE from 'three'
import { settingsFor, stepDown, type QualitySettings, type Tier } from '../lib/quality'

export type CanvasVariant = 'console' | 'idle-tree'

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

  uniform vec3  uLane;
  uniform vec3  uPulse;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uPhase;
  uniform float uNear;
  uniform float uFar;

  varying vec2  vUv;
  varying float vDepth;

  void main() {
    float along = vUv.x;
    float ends = smoothstep(0.0, 0.20, along) * (1.0 - smoothstep(0.80, 1.0, along));
    float head = fract(uTime * uSpeed + uPhase);

    float d = along - head;
    d -= floor(d + 0.5);

    float core = exp(-abs(d) * 26.0);
    float tail = exp(-max(-d, 0.0) * 7.0) * 0.34;
    float pulse = clamp(core + tail, 0.0, 1.0);

    float depth = 1.0 - smoothstep(uNear, uFar, vDepth);

    vec3 color = mix(uLane, uPulse, pulse);
    float alpha = (0.15 + pulse * 0.85) * ends * depth;

    gl_FragColor = vec4(color, alpha);
  }
`

const SHOT = {
  height: 3.2,
  spread: 3.5,
  depth: 1.9,
  minMagnitude: 0.72,
  radius: 0.012,
  cameraZ: 7.4,
  fov: 42,
}

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

  // Tree variant elements
  private treeMesh: THREE.LineSegments | null = null
  private motesMesh: THREE.Points | null = null

  private quality: QualitySettings
  private clock = new THREE.Clock()
  private time = STILL_TIME
  private frame = 0

  private pointer = { x: 0, y: 0 }
  private eye = { x: 0, y: 0 }

  private meanDt = 1 / 60
  private slowFrames = 0
  private running = false
  private disposed = false

  constructor(
    private canvas: HTMLCanvasElement,
    tier: Tier,
    private variant: CanvasVariant = 'console',
    private speedMultiplier = 1.0,
  ) {
    this.quality = settingsFor(tier)

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: this.quality.antialias,
      powerPreference: 'default',
    })
    this.renderer.setClearAlpha(0)
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace

    this.camera = new THREE.PerspectiveCamera(SHOT.fov, 1, 0.1, 40)
    this.camera.position.set(0, 0, SHOT.cameraZ)
    this.camera.lookAt(0, 0, 0)

    this.scene.add(this.group)
    if (this.variant === 'idle-tree') {
      this.buildTree()
    } else {
      this.buildLanes()
    }
  }

  /* ── Console Lanes Variant ────────────────────────────────────────────── */

  private buildLanes() {
    const { lanes: count, tubularSegments, radialSegments } = this.quality
    const lane = new THREE.Color('#2A4560')
    const pulse = new THREE.Color('#7FCBFF')

    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const rank = Math.floor(i / 2)
      const ranks = Math.max(1, Math.ceil(count / 2) - 1)
      const magnitude =
        SHOT.minMagnitude + (1 - SHOT.minMagnitude) * (ranks === 0 ? 1 : rank / ranks)

      const x = side * magnitude * SHOT.spread
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
          uSpeed: { value: (0.108 + i * 0.0121) * this.speedMultiplier },
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

  /* ── Generative Idle-Tree Variant ──────────────────────────────────────── */

  private buildTree() {
    const positions: number[] = []
    const colors: number[] = []

    const trunkColor = new THREE.Color('#8b4513') // Sienna
    const tipColor = new THREE.Color('#38bdf8')   // Golden/cyan tips

    const addBranch = (
      x0: number, y0: number, z0: number,
      angle: number, length: number, depth: number, maxDepth: number
    ) => {
      if (depth > maxDepth) return

      const x1 = x0 + Math.sin(angle) * length
      const y1 = y0 + Math.cos(angle) * length
      const z1 = z0 + (Math.random() - 0.5) * length * 0.3

      positions.push(x0, y0, z0, x1, y1, z1)

      const t0 = depth / maxDepth
      const t1 = (depth + 1) / maxDepth

      const c0 = trunkColor.clone().lerp(tipColor, t0)
      const c1 = trunkColor.clone().lerp(tipColor, t1)

      colors.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b)

      const branchCount = 2 + Math.floor(Math.random() * 2)
      for (let b = 0; b < branchCount; b++) {
        const deltaAngle = (Math.random() - 0.5) * 0.75
        addBranch(x1, y1, z1, angle + deltaAngle, length * 0.72, depth + 1, maxDepth)
      }
    }

    addBranch(0, -2.5, 0, 0, 1.2, 0, 6)

    const treeGeom = new THREE.BufferGeometry()
    treeGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    treeGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const treeMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      linewidth: 1.5,
    })

    this.treeMesh = new THREE.LineSegments(treeGeom, treeMat)
    this.group.add(this.treeMesh)

    // Ambient floating motes
    const moteCount = 60
    const motePos: number[] = []
    for (let m = 0; m < moteCount; m++) {
      motePos.push(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 3
      )
    }
    const motesGeom = new THREE.BufferGeometry()
    motesGeom.setAttribute('position', new THREE.Float32BufferAttribute(motePos, 3))
    const motesMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.04,
      transparent: true,
      opacity: 0.5,
    })
    this.motesMesh = new THREE.Points(motesGeom, motesMat)
    this.group.add(this.motesMesh)
  }

  private teardown() {
    for (const lane of this.lanes) {
      this.group.remove(lane.mesh)
      lane.geometry.dispose()
      lane.material.dispose()
    }
    this.lanes = []

    if (this.treeMesh) {
      this.group.remove(this.treeMesh)
      this.treeMesh.geometry.dispose()
      ;(this.treeMesh.material as THREE.Material).dispose()
      this.treeMesh = null
    }

    if (this.motesMesh) {
      this.group.remove(this.motesMesh)
      this.motesMesh.geometry.dispose()
      ;(this.motesMesh.material as THREE.Material).dispose()
      this.motesMesh = null
    }
  }

  /* ── Runtime ────────────────────────────────────────────────────────── */

  resize(width: number, height: number) {
    if (this.disposed || width === 0 || height === 0) return
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    if (!this.running) this.renderOnce()
  }

  setPointer(x: number, y: number) {
    this.pointer.x = x
    this.pointer.y = y
  }

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

    const dt = Math.min(this.clock.getDelta(), 1 / 20)
    this.time += dt * this.speedMultiplier

    this.watchPerformance(dt)

    const k = 1 - Math.exp(-2.6 * dt)
    this.eye.x += (this.pointer.x * 1.15 - this.eye.x) * k
    this.eye.y += (-this.pointer.y * 0.7 - this.eye.y) * k

    this.camera.position.set(this.eye.x, this.eye.y, SHOT.cameraZ)
    this.camera.lookAt(0, 0, 0)

    if (this.variant === 'idle-tree' && this.treeMesh) {
      this.treeMesh.rotation.y = Math.sin(this.time * 0.5) * 0.08 + this.eye.x * 0.2
      this.treeMesh.rotation.z = Math.cos(this.time * 0.3) * 0.03
    } else {
      for (const lane of this.lanes) lane.material.uniforms.uTime.value = this.time
    }

    this.renderer.render(this.scene, this.camera)
  }

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
    this.teardown()
    if (this.variant === 'idle-tree') this.buildTree()
    else this.buildLanes()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.meanDt = 1 / 60
  }

  dispose() {
    this.disposed = true
    this.running = false
    cancelAnimationFrame(this.frame)
    this.teardown()
    this.scene.remove(this.group)
    this.renderer.dispose()
  }
}
