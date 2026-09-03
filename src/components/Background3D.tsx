import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function Background3D() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let scene: THREE.Scene
    let camera: THREE.PerspectiveCamera
    let renderer: THREE.WebGLRenderer
    let points: THREE.Points
    let lines: THREE.LineSegments
    let animId: number
    let bgT = 0
    let mouseX = 0
    let mouseY = 0

    const w = window.innerWidth
    const h = window.innerHeight

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000)
    camera.position.z = 62

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      container.appendChild(renderer.domElement)
    } catch {
      return
    }

    const NODES = 34
    const positions = new Float32Array(NODES * 3)
    for (let i = 0; i < NODES; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100
      positions[i * 3 + 1] = (Math.random() - 0.5) * 58
      positions[i * 3 + 2] = (Math.random() - 0.5) * 58
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0x6FC3FF,
      size: 1.5,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    points = new THREE.Points(geo, mat)
    scene.add(points)

    const linePositions: number[] = []
    for (let i = 0; i < NODES; i++) {
      for (let j = i + 1; j < NODES; j++) {
        const dx = positions[i * 3] - positions[j * 3]
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < 20) {
          linePositions.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
          linePositions.push(positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2])
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3))
    const lineMat = new THREE.LineBasicMaterial({ color: 0x2E5C86, transparent: true, opacity: 0.22 })
    lines = new THREE.LineSegments(lineGeo, lineMat)
    scene.add(lines)

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX / window.innerWidth - 0.5
      mouseY = e.clientY / window.innerHeight - 0.5
    }

    const handleResize = () => {
      if (!camera || !renderer) return
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', handleResize)

    const animateBG = () => {
      animId = requestAnimationFrame(animateBG)
      bgT += 0.0015
      if (points && lines) {
        points.rotation.y = bgT
        lines.rotation.y = bgT
        camera.position.x += (mouseX * 10 - camera.position.x) * 0.015
        camera.position.y += (-mouseY * 7 - camera.position.y) * 0.015
        camera.lookAt(scene.position)
      }
      renderer.render(scene, camera)
    }

    animateBG()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      if (renderer && renderer.domElement) {
        renderer.domElement.remove()
        renderer.dispose()
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-50 z-0 overflow-hidden"
    />
  )
}
