import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { hasWebGL } from '../lib/quality'

/**
 * DagBackground — the hero's slow-drifting particle/node graph.
 *
 * A constellation of small nodes connected by thin lines, orbiting
 * slowly in 3D. Purely decorative: aria-hidden, pointer-events-none,
 * pauses on tab blur. Falls back to nothing if WebGL is unavailable
 * (the CSS gradient in the hero still works).
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
  accent: 0x48B4FF,
  good: 0x4DCFB8,
  wait: 0x8296B8,
  border: 0x232B3D,
  ghost: 0x3B4356,
}

function createScene(canvas: HTMLCanvasElement, width: number, height: number) {
  const isMobile = width < 768
  const NODE_COUNT = isMobile ? 16 : 38
  const EDGE_PROBABILITY = 0.12

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
  camera.position.set(0, 0, 22)
  camera.lookAt(0, 0, 0)

  // --- Nodes ---
  const nodeColors = [COLORS.accent, COLORS.good, COLORS.wait, COLORS.accent, COLORS.good]
  const nodes: DagNode[] = []
  const sphereGeom = new THREE.SphereGeometry(0.12, 8, 6)
  const nodeGroup = new THREE.Group()

  for (let i = 0; i < NODE_COUNT; i++) {
    const colorIdx = i % nodeColors.length
    const mat = new THREE.MeshBasicMaterial({ color: nodeColors[colorIdx], transparent: true, opacity: 0.7 })
    const mesh = new THREE.Mesh(sphereGeom, mat)
    const x = (Math.random() - 0.5) * 18
    const y = (Math.random() - 0.5) * 12
    const z = (Math.random() - 0.5) * 6
    mesh.position.set(x, y, z)
    nodeGroup.add(mesh)
    nodes.push({
      position: mesh.position,
      basePosition: new THREE.Vector3(x, y, z),
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      phaseZ: Math.random() * Math.PI * 2,
      freqX: 0.1 + Math.random() * 0.15,
      freqY: 0.08 + Math.random() * 0.12,
      freqZ: 0.06 + Math.random() * 0.1,
    })
  }
  scene.add(nodeGroup)

  // --- Edges ---
  const edgePositions: number[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = nodes[i].basePosition.distanceTo(nodes[j].basePosition)
      if (dist < 6 && Math.random() < EDGE_PROBABILITY) {
        edgePositions.push(
          nodes[i].position.x, nodes[i].position.y, nodes[i].position.z,
          nodes[j].position.x, nodes[j].position.y, nodes[j].position.z,
        )
      }
    }
  }

  const edgeGeom = new THREE.BufferGeometry()
  const edgeAttr = new Float32Array(edgePositions.length > 0 ? edgePositions.length : 6)
  if (edgePositions.length > 0) {
    edgeAttr.set(edgePositions)
  }
  edgeGeom.setAttribute('position', new THREE.BufferAttribute(edgeAttr, 3))

  const edgeMat = new THREE.LineBasicMaterial({
    color: COLORS.ghost,
    transparent: true,
    opacity: 0.3,
  })
  const edges = new THREE.LineSegments(edgeGeom, edgeMat)
  scene.add(edges)

  // Store edge pairs for updates
  const edgePairs: [number, number][] = []
  for (let k = 0; k < edgePositions.length; k += 6) {
    // Find which nodes these belong to by matching initial positions
    let ni = -1, nj = -1
    for (let n = 0; n < nodes.length; n++) {
      const bp = nodes[n].basePosition
      if (Math.abs(bp.x - edgePositions[k]) < 0.001 && Math.abs(bp.y - edgePositions[k + 1]) < 0.001) ni = n
      if (Math.abs(bp.x - edgePositions[k + 3]) < 0.001 && Math.abs(bp.y - edgePositions[k + 4]) < 0.001) nj = n
    }
    edgePairs.push([ni >= 0 ? ni : 0, nj >= 0 ? nj : 0])
  }

  let animId = 0
  let running = true

  function animate(time: number) {
    if (!running) return
    animId = requestAnimationFrame(animate)

    const t = time * 0.001

    // Drift nodes
    for (const node of nodes) {
      node.position.x = node.basePosition.x + Math.sin(t * node.freqX + node.phaseX) * 0.6
      node.position.y = node.basePosition.y + Math.sin(t * node.freqY + node.phaseY) * 0.4
      node.position.z = node.basePosition.z + Math.sin(t * node.freqZ + node.phaseZ) * 0.3
    }

    // Update edge positions
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

    // Slow orbit
    nodeGroup.rotation.y = t * 0.03
    nodeGroup.rotation.x = Math.sin(t * 0.02) * 0.08
    edges.rotation.y = nodeGroup.rotation.y
    edges.rotation.x = nodeGroup.rotation.x

    renderer.render(scene, camera)
  }

  function start() {
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
    nodes.forEach(() => {}) // meshes are disposed via scene
    scene.clear()
  }

  // Start
  animId = requestAnimationFrame(animate)

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
      dag = createScene(canvas, rect.width, rect.height)
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
      style={{ opacity: 0.35 }}
    >
      {/* CSS fallback gradient — always present */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(72,180,255,0.06), transparent 70%)',
        }}
      />
      {hasWebGL() && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />}
    </div>
  )
}
