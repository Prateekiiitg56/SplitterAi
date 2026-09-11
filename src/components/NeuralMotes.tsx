import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/* ─── Configuration ────────────────────────────────────────────────────── */

const PARTICLE_COUNT = 120;
const CONNECTION_DISTANCE = 140;
const MAX_CONNECTIONS = 200;
const DRIFT_SPEED = 0.00012;
const SWAY_AMPLITUDE = 0.4;

/* Warm amber / gold palette that blends with the generative tree */
const PALETTE = [
  new THREE.Color(0.92, 0.72, 0.42),  // warm gold
  new THREE.Color(0.85, 0.58, 0.28),  // amber
  new THREE.Color(0.78, 0.50, 0.22),  // deep amber
  new THREE.Color(0.60, 0.42, 0.24),  // brown-gold
  new THREE.Color(0.45, 0.62, 0.85),  // hint of cool blue (accent)
];

/* ─── Vertex shader — subtle size attenuation + gentle pulse ─────────── */
const vertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPhase;
  uniform float uTime;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    float pulse = 0.7 + 0.3 * sin(uTime * 0.8 + aPhase);
    vAlpha = pulse;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * pulse * (280.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

/* ─── Fragment shader — soft radial glow dot ─────────────────────────── */
const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    glow = pow(glow, 1.8);
    gl_FragColor = vec4(vColor, glow * vAlpha * 0.55);
  }
`;

/* ─── Particle data type ─────────────────────────────────────────────── */
interface Mote {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  phase: number;
  size: number;
  color: THREE.Color;
}

function createMote(width: number, height: number): Mote {
  const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  return {
    x: (Math.random() - 0.5) * width,
    y: (Math.random() - 0.5) * height,
    z: (Math.random() - 0.5) * 300 - 100,
    vx: (Math.random() - 0.5) * 0.08,
    vy: -(Math.random() * 0.12 + 0.02),  // gentle upward drift
    vz: (Math.random() - 0.5) * 0.04,
    phase: Math.random() * Math.PI * 2,
    size: Math.random() * 2.5 + 0.8,
    color,
  };
}

/* ─── Component ──────────────────────────────────────────────────────── */

export default function NeuralMotes() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const width = el.clientWidth;
    const height = el.clientHeight;

    /* ── Renderer ──────────────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    /* ── Scene & Camera ───────────────────────────────────────── */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 1200);
    camera.position.z = 400;

    /* ── Motes ────────────────────────────────────────────────── */
    const motes: Mote[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      motes.push(createMote(width, height));
    }

    /* ── Points geometry ──────────────────────────────────────── */
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const phases = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const m = motes[i];
      positions[i * 3] = m.x;
      positions[i * 3 + 1] = m.y;
      positions[i * 3 + 2] = m.z;
      sizes[i] = m.size;
      colors[i * 3] = m.color.r;
      colors[i * 3 + 1] = m.color.g;
      colors[i * 3 + 2] = m.color.b;
      phases[i] = m.phase;
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    pointsGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    pointsGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const pointsMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(pointsGeo, pointsMat);
    scene.add(points);

    /* ── Connection lines ─────────────────────────────────────── */
    const linePositions = new Float32Array(MAX_CONNECTIONS * 6);
    const lineColors = new Float32Array(MAX_CONNECTIONS * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    lineGeo.setDrawRange(0, 0);

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    /* ── Animation loop ───────────────────────────────────────── */
    let startTime = performance.now();

    function animate() {
      rafRef.current = requestAnimationFrame(animate);

      const elapsed = (performance.now() - startTime) * 0.001;
      pointsMat.uniforms.uTime.value = elapsed;

      // Update mote positions
      const posAttr = pointsGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const m = motes[i];

        // Organic drift
        m.x += m.vx + Math.sin(elapsed * DRIFT_SPEED * 1000 + m.phase) * SWAY_AMPLITUDE * 0.02;
        m.y += m.vy;
        m.z += m.vz + Math.cos(elapsed * DRIFT_SPEED * 800 + m.phase * 1.3) * 0.01;

        // Wrap boundaries
        const hw = width * 0.7;
        const hh = height * 0.7;
        if (m.y < -hh) { m.y = hh; m.x = (Math.random() - 0.5) * width; }
        if (m.x < -hw) m.x = hw;
        if (m.x > hw) m.x = -hw;
        if (m.z < -300) m.z = 100;
        if (m.z > 100) m.z = -300;

        posAttr.array[i * 3] = m.x;
        posAttr.array[i * 3 + 1] = m.y;
        posAttr.array[i * 3 + 2] = m.z;
      }
      posAttr.needsUpdate = true;

      // Update connections
      let lineCount = 0;
      const lp = lineGeo.getAttribute('position') as THREE.BufferAttribute;
      const lc = lineGeo.getAttribute('color') as THREE.BufferAttribute;

      for (let i = 0; i < PARTICLE_COUNT && lineCount < MAX_CONNECTIONS; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT && lineCount < MAX_CONNECTIONS; j++) {
          const dx = motes[i].x - motes[j].x;
          const dy = motes[i].y - motes[j].y;
          const dz = motes[i].z - motes[j].z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < CONNECTION_DISTANCE) {
            const fade = 1 - dist / CONNECTION_DISTANCE;
            const idx = lineCount * 6;

            lp.array[idx] = motes[i].x;
            lp.array[idx + 1] = motes[i].y;
            lp.array[idx + 2] = motes[i].z;
            lp.array[idx + 3] = motes[j].x;
            lp.array[idx + 4] = motes[j].y;
            lp.array[idx + 5] = motes[j].z;

            // Blend colors of connected motes
            const mr = (motes[i].color.r + motes[j].color.r) * 0.5 * fade;
            const mg = (motes[i].color.g + motes[j].color.g) * 0.5 * fade;
            const mb = (motes[i].color.b + motes[j].color.b) * 0.5 * fade;

            lc.array[idx] = mr;
            lc.array[idx + 1] = mg;
            lc.array[idx + 2] = mb;
            lc.array[idx + 3] = mr;
            lc.array[idx + 4] = mg;
            lc.array[idx + 5] = mb;

            lineCount++;
          }
        }
      }
      lp.needsUpdate = true;
      lc.needsUpdate = true;
      lineGeo.setDrawRange(0, lineCount * 2);

      // Gentle camera sway
      camera.position.x = Math.sin(elapsed * 0.06) * 15;
      camera.position.y = Math.cos(elapsed * 0.04) * 10;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }

    animate();

    /* ── Resize handler ──────────────────────────────────────── */
    function onResize() {
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    /* ── Cleanup ──────────────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      pointsGeo.dispose();
      pointsMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
