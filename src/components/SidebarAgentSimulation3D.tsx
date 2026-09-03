import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { mockAgents } from '../data'

export default function SidebarAgentSimulation3D() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 240
    const height = 110

    // Scene, Camera, Renderer
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    camera.position.set(0, 0, 14)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    container.appendChild(renderer.domElement)

    // Palette Colors for Agents
    const colors = {
      planner: new THREE.Color('#E64833'), // Coral (Orchestrator)
      coder: new THREE.Color('#34D399'),   // Emerald
      auditor: new THREE.Color('#FBBF24'), // Amber
      tester: new THREE.Color('#90AEAD'),  // Sage
    }

    // Central Planner Core
    const plannerGeo = new THREE.IcosahedronGeometry(1.2, 1)
    const plannerMat = new THREE.MeshBasicMaterial({
      color: colors.planner,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    })
    const plannerMesh = new THREE.Mesh(plannerGeo, plannerMat)
    scene.add(plannerMesh)

    // Inner glowing core
    const coreGeo = new THREE.SphereGeometry(0.5, 16, 16)
    const coreMat = new THREE.MeshBasicMaterial({
      color: colors.planner,
      transparent: true,
      opacity: 0.6,
    })
    const coreMesh = new THREE.Mesh(coreGeo, coreMat)
    plannerMesh.add(coreMesh)

    // Worker Node Geometries
    const workerNodes: { mesh: THREE.Mesh; angle: number; radius: number; speed: number; role: string }[] = []
    const roles: ('coder' | 'auditor' | 'tester')[] = ['coder', 'auditor', 'tester']
    const geometries = [
      new THREE.OctahedronGeometry(0.65),
      new THREE.TorusGeometry(0.5, 0.18, 8, 16),
      new THREE.DodecahedronGeometry(0.55),
    ]

    roles.forEach((role, idx) => {
      const isRunning = mockAgents.find((a) => a.role === role)?.status === 'active'
      const mat = new THREE.MeshBasicMaterial({
        color: colors[role],
        wireframe: true,
        transparent: true,
        opacity: isRunning ? 0.9 : 0.4,
      })

      const mesh = new THREE.Mesh(geometries[idx], mat)
      scene.add(mesh)

      workerNodes.push({
        mesh,
        angle: (idx * (Math.PI * 2)) / 3,
        radius: 4.8,
        speed: isRunning ? 0.025 : 0.008,
        role,
      })
    })

    // Orbital Ring Indicator
    const ringGeo = new THREE.RingGeometry(4.75, 4.82, 48)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x90aead,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.12,
    })
    const ringMesh = new THREE.Mesh(ringGeo, ringMat)
    ringMesh.rotation.x = Math.PI / 2.5
    scene.add(ringMesh)

    // Data Pulses (Connecting lines)
    const pulseLinesGeo = new THREE.BufferGeometry()
    const pulseLinesMat = new THREE.LineBasicMaterial({
      color: 0xe64833,
      transparent: true,
      opacity: 0.35,
    })
    const pulseLines = new THREE.LineSegments(pulseLinesGeo, pulseLinesMat)
    scene.add(pulseLines)

    // Animation Loop
    let animationFrameId: number
    let clock = 0

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      clock += 0.02

      // Rotate Planner Core
      plannerMesh.rotation.x += 0.01
      plannerMesh.rotation.y += 0.015
      coreMesh.scale.setScalar(1 + Math.sin(clock * 3) * 0.12)

      // Orbit Worker Nodes & Update Data Connections
      const linePositions: number[] = []

      workerNodes.forEach((node) => {
        node.angle += node.speed
        node.mesh.position.x = Math.cos(node.angle) * node.radius
        node.mesh.position.z = Math.sin(node.angle) * node.radius * 0.4
        node.mesh.position.y = Math.sin(node.angle * 2) * 0.8

        node.mesh.rotation.x += 0.02
        node.mesh.rotation.y += 0.02

        // Draw data beam line from Planner core to worker node
        linePositions.push(
          plannerMesh.position.x, plannerMesh.position.y, plannerMesh.position.z,
          node.mesh.position.x, node.mesh.position.y, node.mesh.position.z
        )
      })

      pulseLinesGeo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(linePositions, 3)
      )

      renderer.render(scene, camera)
    }

    animate()

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId)
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  return (
    <div className="px-3 my-1 select-none">
      <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden relative group">
        <div className="absolute top-2 left-3 z-10 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-3 font-semibold">
            3D AGENT MESH
          </span>
        </div>
        <div ref={containerRef} className="w-full flex justify-center items-center" style={{ height: 110 }} />
      </div>
    </div>
  )
}
