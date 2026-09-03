import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface ParticleNode {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  baseX: number
  baseY: number
}

export default function Background3D({ active = false }: { active?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Setup Three.js Scene, Camera, Renderer
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      1000
    )
    camera.position.z = 400

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    container.appendChild(renderer.domElement)

    // Particle Constellation Geometry
    const particleCount = 75
    const particlesData: ParticleNode[] = []
    const particlePositions = new Float32Array(particleCount * 3)
    const particleColors = new Float32Array(particleCount * 3)

    const colorDefault = new THREE.Color('#4F46E5')
    const colorActive = new THREE.Color('#9D8CFC')

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 800
      const y = (Math.random() - 0.5) * 600
      const z = (Math.random() - 0.5) * 400

      particlePositions[i * 3] = x
      particlePositions[i * 3 + 1] = y
      particlePositions[i * 3 + 2] = z

      particleColors[i * 3] = colorDefault.r
      particleColors[i * 3 + 1] = colorDefault.g
      particleColors[i * 3 + 2] = colorDefault.b

      particlesData.push({
        x,
        y,
        z,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        vz: (Math.random() - 0.5) * 0.8,
        baseX: x,
        baseY: y,
      })
    }

    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3))

    const particleMaterial = new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    })

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particleSystem)

    // Dynamic Connecting Lines Geometry
    const maxConnections = particleCount * 5
    const linePositions = new Float32Array(maxConnections * 6)
    const lineColors = new Float32Array(maxConnections * 6)

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3))

    const lineMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.25 })

    const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial)
    scene.add(lineMesh)

    // Mouse Tracking for Parallax
    let mouseX = 0
    let mouseY = 0
    let targetX = 0
    let targetY = 0

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX - window.innerWidth / 2) * 0.2
      mouseY = (event.clientY - window.innerHeight / 2) * 0.2
    }

    window.addEventListener('mousemove', handleMouseMove)

    // Window Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('resize', handleResize)

    // Animation Loop
    let animationFrameId: number

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      // Parallax Interpolation
      targetX += (mouseX - targetX) * 0.05
      targetY += (mouseY - targetY) * 0.05

      scene.rotation.y = targetX * 0.0008
      scene.rotation.x = -targetY * 0.0008

      const speedMultiplier = active ? 2.5 : 1.0
      let vertexIdx = 0
      let colorIdx = 0
      let lineCount = 0

      const positions = particleGeometry.attributes.position.array as Float32Array

      // Update Particle Positions
      for (let i = 0; i < particleCount; i++) {
        const p = particlesData[i]
        p.x += p.vx * speedMultiplier
        p.y += p.vy * speedMultiplier
        p.z += p.vz * speedMultiplier

        if (p.x < -400 || p.x > 400) p.vx = -p.vx
        if (p.y < -300 || p.y > 300) p.vy = -p.vy
        if (p.z < -200 || p.z > 200) p.vz = -p.vz

        positions[i * 3] = p.x
        positions[i * 3 + 1] = p.y
        positions[i * 3 + 2] = p.z
      }

      particleGeometry.attributes.position.needsUpdate = true

      // Update Connecting Distance Lines
      const maxDistance = active ? 160 : 130
      const activeColor = active ? colorActive : colorDefault

      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const p1 = particlesData[i]
          const p2 = particlesData[j]

          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const dz = p1.z - p2.z
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

          if (dist < maxDistance) {
            const alpha = 1 - dist / maxDistance

            linePositions[vertexIdx++] = p1.x
            linePositions[vertexIdx++] = p1.y
            linePositions[vertexIdx++] = p1.z

            linePositions[vertexIdx++] = p2.x
            linePositions[vertexIdx++] = p2.y
            linePositions[vertexIdx++] = p2.z

            lineColors[colorIdx++] = activeColor.r * alpha
            lineColors[colorIdx++] = activeColor.g * alpha
            lineColors[colorIdx++] = activeColor.b * alpha

            lineColors[colorIdx++] = activeColor.r * alpha
            lineColors[colorIdx++] = activeColor.g * alpha
            lineColors[colorIdx++] = activeColor.b * alpha

            lineCount++
          }
        }
      }

      lineGeometry.setDrawRange(0, lineCount * 2)
      lineGeometry.attributes.position.needsUpdate = true
      lineGeometry.attributes.color.needsUpdate = true

      renderer.render(scene, camera)
    }

    animate()

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [active])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-40"
    />
  )
}
