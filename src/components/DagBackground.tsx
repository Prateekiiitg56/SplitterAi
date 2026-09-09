import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { hasWebGL, prefersReducedMotion } from '../lib/quality'

/**
 * DagBackground — halo-framed node graph.
 *
 * Nodes are distributed in a wide framing halo around the viewport edges,
 * keeping the hero copy region clear of clutter while framing the headline.
 */

interface DagNode {
  position: THREE.Vector3
  basePosition: THREE.Vector3
  phaseX: number
  phaseY: number
  phaseZ: number
  freqX: number
  freqY: number
  freqZ: number
}

const COLORS = {
  accent: 0x48b4ff,
  good: 0x4dcfb8,
  wait: 0x8296b8,
  line: 0x3b5278,
}

function createScene(canvas: HTMLCanvasElement, width: number, height: number, reducedMotion: boolean) {
  const isMobile = width < 768
  const NODE_COUNT = isMobile ? 12 : 24

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
  camera.position.set(0, 0, 20)
  camera.lookAt(0, 0, 0)

  const nodeColors = [COLORS.accent, COLORS.good, COLORS.wait, COLORS.accent]
  const nodes: DagNode[] = []
  const sphereGeom = new THREE.SphereGeometry(0.12, 10, 8)
  const nodeGroup = new THREE.Group()

  // Distribute nodes in a wide halo arc framing the text block (leaving center x: -4.5..4.5, y: -2.5..2.5 clear)
  for (let i = 0; i < NODE_COUNT; i++) {
    const angle = (i / NODE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.2
    const rx = 9.2 + Math.random() * 3.2
    const ry = 4.8 + Math.random() * 2.2

    let x = Math.cos(angle) * rx
    let y = Math.sin(angle) * ry
    const z = (Math.random() - 0.5) * 3.0

    // Ensure central text box is kept sparse
    if (Math.abs(x) < 4.2 && Math.abs(y) < 2.5) {
      x = x >= 0 ? 5.0 + Math.random() * 3 : -5.0 - Math.random() * 3
    }

    const color = nodeColors[i % nodeColors.length]
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.75,
    })
    const mesh = new THREE.Mesh(sphereGeom, mat)
    mesh.position.set(x, y, z)
    nodeGroup.add(mesh)

    nodes.push({
      position: mesh.position,
      basePosition: new THREE.Vector3(x, y, z),
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      phaseZ: Math.random() * Math.PI * 2,
      freqX: 0.05 + Math.random() * 0.07,
      freqY: 0.04 + Math.random() * 0.06,
      freqZ: 0.03 + Math.random() * 0.05,
    })
  }
  scene.add(nodeGroup)

  // --- Edges ---
  // Connect neighboring halo nodes while keeping line density low across center text block
  const edgePositions: number[] = []
  let centerCrossingCount = 0

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const n1 = nodes[i]
      const n2 = nodes[j]
      const dist = n1.basePosition.distanceTo(n2.basePosition)

      const midX = (n1.basePosition.x + n2.basePosition.x) / 2
      const midY = (n1.basePosition.y + n2.basePosition.y) / 2
      const passesNearCenter = Math.abs(midX) < 4.0 && Math.abs(midY) < 2.2

      if (passesNearCenter) {
        // Strict cap: max 2 faint lines across center text region
        if (centerCrossingCount < 2 && dist < 11 && Math.random() < 0.12) {
          centerCrossingCount++
          edgePositions.push(
            n1.position.x, n1.position.y, n1.position.z,
            n2.position.x, n2.position.y, n2.position.z,
          )
        }
      } else if (dist < 4.8 && Math.random() < 0.45) {
        edgePositions.push(
          n1.position.x, n1.position.y, n1.position.z,
          n2.position.x, n2.position.y, n2.position.z,
        )
      }
    }
  }

  const edgeGeom = new THREE.BufferGeometry()
  const edgeAttr = new Float32Array(
    edgePositions.length > 0 ? edgePositions.length : 6,
  )
  if (edgePositions.length > 0) {
    edgeAttr.set(edgePositions)
  }
  edgeGeom.setAttribute('position', new THREE.BufferAttribute(edgeAttr, 3))

  const edgeMat = new THREE.LineBasicMaterial({
    color: COLORS.line,
    transparent: true,
    opacity: 0.5,
  })
  const edges = new THREE.LineSegments(edgeGeom, edgeMat)
  scene.add(edges)

  // Store edge pairs for frame updates
  const edgePairs: [number, number][] = []
  for (let k = 0; k < edgePositions.length; k += 6) {
    let ni = 0,
      nj = 0
    for (let n = 0; n < nodes.length; n++) {
      const bp = nodes[n].basePosition
      if (
        Math.abs(bp.x - edgePositions[k]) < 0.001 &&
        Math.abs(bp.y - edgePositions[k + 1]) < 0.001
      )
        ni = n
      if (
        Math.abs(bp.x - edgePositions[k + 3]) < 0.001 &&
        Math.abs(bp.y - edgePositions[k + 4]) < 0.001
      )
        nj = n
    }
    edgePairs.push([ni, nj])
  }

  let animId = 0
  let running = true

  function animate(time: number) {
    if (!running) return
    animId = requestAnimationFrame(animate)

    const t = time * 0.001

    // Subtle drift
    for (const node of nodes) {
      node.position.x =
        node.basePosition.x + Math.sin(t * node.freqX + node.phaseX) * 0.35
      node.position.y =
        node.basePosition.y + Math.sin(t * node.freqY + node.phaseY) * 0.25
      node.position.z =
        node.basePosition.z + Math.sin(t * node.freqZ + node.phaseZ) * 0.18
    }

    // Update edge line endpoints
    const posArr = edgeGeom.attributes.position as THREE.BufferAttribute
    for (let e = 0; e < edgePairs.length; e++) {
      const [ni, nj] = edgePairs[e]
      const base = e * 6
      posArr.array[base] = nodes[ni].position.x
      posArr.array[base + 1] = nodes[ni].position.y
      posArr.array[base + 2] = nodes[ni].position.z
      posArr.array[base + 3] = nodes[nj].position.x
      posArr.array[base + 4] = nodes[nj].position.y
      posArr.array[base + 5] = nodes[nj].position.z
    }
    posArr.needsUpdate = true

    // Ambient orbit
    nodeGroup.rotation.y = t * 0.012
    nodeGroup.rotation.x = Math.sin(t * 0.01) * 0.03
    edges.rotation.y = nodeGroup.rotation.y
    edges.rotation.x = nodeGroup.rotation.x

    renderer.render(scene, camera)
  }

  function start() {
    if (reducedMotion) return
    if (!running) {
      running = true
      animId = requestAnimationFrame(animate)
    }
  }

  function stop() {
    running = false
    cancelAnimationFrame(animId)
  }

  function resize(w: number, h: number) {
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  function dispose() {
    stop()
    renderer.dispose()
    sphereGeom.dispose()
    edgeGeom.dispose()
    edgeMat.dispose()
    scene.clear()
  }

  // Start — a single static, deliberately composed frame when the user
  // prefers reduced motion, otherwise the drifting animation loop.
  if (reducedMotion) {
    renderer.render(scene, camera)
  } else {
    animId = requestAnimationFrame(animate)
  }

  return { start, stop, resize, dispose }
}

export default function DagBackground() {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!hasWebGL()) return
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return

    const rect = host.getBoundingClientRect()
    let dag: ReturnType<typeof createScene>
    try {
      dag = createScene(canvas, rect.width, rect.height, prefersReducedMotion())
    } catch {
      return
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') dag.start()
      else dag.stop()
    }

    const resizeObs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      dag.resize(width, height)
    })
    resizeObs.observe(host)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      resizeObs.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      dag.dispose()
    }
  }, [])

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ opacity: 0.55 }}
    >
      {/* CSS radial backdrop gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(72,180,255,0.06), transparent 70%)',
        }}
      />
      {hasWebGL() && (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      )}
    </div>
  )
}
