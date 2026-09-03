import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function Background3D() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene, Camera, Renderer
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.z = 30

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    container.appendChild(renderer.domElement)

    // Palette Colors
    const palette = [
      new THREE.Color('#244855'), // Deep teal
      new THREE.Color('#E64833'), // Coral
      new THREE.Color('#874F41'), // Warm brown
      new THREE.Color('#90AEAD'), // Sage
    ]

    // Create Particle Constellation / Network Nodes
    const particleCount = 70
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const velocities: { x: number; y: number; z: number }[] = []

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50
      positions[i * 3 + 1] = (Math.random() - 0.5) * 35
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20

      velocities.push({
        x: (Math.random() - 0.5) * 0.015,
        y: (Math.random() - 0.5) * 0.015,
        z: (Math.random() - 0.5) * 0.01,
      })

      const col = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    // Particle Material
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
    })

    const particleSystem = new THREE.Points(geometry, particleMaterial)
    scene.add(particleSystem)

    // Dynamic Connecting Lines
    const linesGeometry = new THREE.BufferGeometry()
    const linesMaterial = new THREE.LineBasicMaterial({
      color: 0x874f41,
      transparent: true,
      opacity: 0.15,
    })
    const linesMesh = new THREE.LineSegments(linesGeometry, linesMaterial)
    scene.add(linesMesh)

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)

    // Floating 3D Geometric Orbs/Icosahedrons
    const shapeGroup = new THREE.Group()
    const shapeGeo = new THREE.IcosahedronGeometry(1.8, 1)

    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: palette[i % palette.length],
        wireframe: true,
        transparent: true,
        opacity: 0.25,
      })
      const mesh = new THREE.Mesh(shapeGeo, mat)
      mesh.position.set(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 15
      )
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
      mesh.scale.setScalar(0.8 + Math.random() * 0.8)
      shapeGroup.add(mesh)
    }
    scene.add(shapeGroup)

    // Mouse Interaction
    let mouseX = 0
    let mouseY = 0

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', handleMouseMove)

    // Handle Resize
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

      // Move Particles
      const posArr = geometry.attributes.position.array as Float32Array
      for (let i = 0; i < particleCount; i++) {
        posArr[i * 3] += velocities[i].x
        posArr[i * 3 + 1] += velocities[i].y
        posArr[i * 3 + 2] += velocities[i].z

        // Bounce boundaries
        if (Math.abs(posArr[i * 3]) > 28) velocities[i].x *= -1
        if (Math.abs(posArr[i * 3 + 1]) > 20) velocities[i].y *= -1
        if (Math.abs(posArr[i * 3 + 2]) > 12) velocities[i].z *= -1
      }
      geometry.attributes.position.needsUpdate = true

      // Reconnect dynamic lines
      const linePositions: number[] = []
      const maxDist = 9
      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dx = posArr[i * 3] - posArr[j * 3]
          const dy = posArr[i * 3 + 1] - posArr[j * 3 + 1]
          const dz = posArr[i * 3 + 2] - posArr[j * 3 + 2]
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

          if (dist < maxDist) {
            linePositions.push(
              posArr[i * 3], posArr[i * 3 + 1], posArr[i * 3 + 2],
              posArr[j * 3], posArr[j * 3 + 1], posArr[j * 3 + 2]
            )
          }
        }
      }
      linesGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(linePositions, 3)
      )

      // Slow shape rotation & mouse parallax
      shapeGroup.children.forEach((child, idx) => {
        child.rotation.x += 0.003 * (idx % 2 === 0 ? 1 : -1)
        child.rotation.y += 0.004 * (idx % 3 === 0 ? 1 : -1)
      })

      // Smooth camera sway based on mouse
      camera.position.x += (mouseX * 2 - camera.position.x) * 0.02
      camera.position.y += (-mouseY * 2 - camera.position.y) * 0.02
      camera.lookAt(scene.position)

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
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.85 }}
    />
  )
}
