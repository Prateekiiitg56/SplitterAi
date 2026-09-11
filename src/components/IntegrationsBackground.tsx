import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/* ─── Configuration ────────────────────────────────────────────────────── */

const GRID_COUNT = 80;        // Fewer particles than landing — subtle ambient
const CONNECTION_DIST = 180;
const MAX_CONNECTIONS = 120;

/* Cool-tinted palette matching the accent (#48B4FF) */
const PALETTE = [
  new THREE.Color(0.28, 0.70, 1.0),   // accent blue
  new THREE.Color(0.22, 0.55, 0.82),  // muted blue
  new THREE.Color(0.18, 0.42, 0.68),  // deep blue
  new THREE.Color(0.30, 0.80, 0.72),  // teal hint (--good)
  new THREE.Color(0.50, 0.58, 0.72),  // slate
];

/* ─── Vertex shader ──────────────────────────────────────────────────── */
const vertexShader = `
  attribute float aSize;
  attribute vec3  aColor;
  attribute float aPhase;
  uniform float uTime;
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    float pulse = 0.6 + 0.4 * sin(uTime * 0.5 + aPhase);
    vAlpha = pulse;

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * pulse * (220.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

/* ─── Fragment shader ────────────────────────────────────────────────── */
const fragmentShader = `
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    glow = pow(glow, 2.2);
    gl_FragColor = vec4(vColor, glow * vAlpha * 0.35);
  }
`;

/* ─── Particle type ──────────────────────────────────────────────────── */
interface Dot {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  phase: number;
  size: number;
  color: THREE.Color;
}

function createDot(w: number, h: number): Dot {
  const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  return {
    x: (Math.random() - 0.5) * w * 1.1,
    y: (Math.random() - 0.5) * h * 1.1,
    z: (Math.random() - 0.5) * 350 - 80,
    vx: (Math.random() - 0.5) * 0.045,
    vy: (Math.random() - 0.5) * 0.035,
    vz: (Math.random() - 0.5) * 0.02,
    phase: Math.random() * Math.PI * 2,
    size: Math.random() * 2.0 + 0.6,
    color,
  };
}

/* ─── Component ──────────────────────────────────────────────────────── */

export default function IntegrationsBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = el.clientWidth;
    const h = el.clientHeight;

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    /* Scene & Camera */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, w / h, 1, 1200);
    camera.position.z = 450;

    /* Dots */
    const dots: Dot[] = [];
    for (let i = 0; i < GRID_COUNT; i++) dots.push(createDot(w, h));

    /* Points geometry */
    const positions = new Float32Array(GRID_COUNT * 3);
    const sizes     = new Float32Array(GRID_COUNT);
    const colors    = new Float32Array(GRID_COUNT * 3);
    const phases    = new Float32Array(GRID_COUNT);

    for (let i = 0; i < GRID_COUNT; i++) {
      const d = dots[i];
      positions[i * 3]     = d.x;
      positions[i * 3 + 1] = d.y;
      positions[i * 3 + 2] = d.z;
      sizes[i]             = d.size;
      colors[i * 3]        = d.color.r;
      colors[i * 3 + 1]    = d.color.g;
      colors[i * 3 + 2]    = d.color.b;
      phases[i]            = d.phase;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));
    pGeo.setAttribute('aColor',   new THREE.BufferAttribute(colors, 3));
    pGeo.setAttribute('aPhase',   new THREE.BufferAttribute(phases, 1));

    const pMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    scene.add(new THREE.Points(pGeo, pMat));

    /* Connection lines */
    const lPos = new Float32Array(MAX_CONNECTIONS * 6);
    const lCol = new Float32Array(MAX_CONNECTIONS * 6);
    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
    lGeo.setAttribute('color',    new THREE.BufferAttribute(lCol, 3));
    lGeo.setDrawRange(0, 0);

    const lMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.07,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    scene.add(new THREE.LineSegments(lGeo, lMat));

    /* Animation loop */
    const t0 = performance.now();

    function animate() {
      rafRef.current = requestAnimationFrame(animate);
      const t = (performance.now() - t0) * 0.001;
      pMat.uniforms.uTime.value = t;

      // Update dots
      const pa = pGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < GRID_COUNT; i++) {
        const d = dots[i];
        d.x += d.vx + Math.sin(t * 0.08 + d.phase) * 0.015;
        d.y += d.vy + Math.cos(t * 0.06 + d.phase * 1.3) * 0.012;
        d.z += d.vz;

        const hw = w * 0.65, hh = h * 0.65;
        if (d.x < -hw) d.x = hw;
        if (d.x >  hw) d.x = -hw;
        if (d.y < -hh) d.y = hh;
        if (d.y >  hh) d.y = -hh;
        if (d.z < -350) d.z = 80;
        if (d.z >  80)  d.z = -350;

        pa.array[i * 3]     = d.x;
        pa.array[i * 3 + 1] = d.y;
        pa.array[i * 3 + 2] = d.z;
      }
      pa.needsUpdate = true;

      // Update connections
      let lc = 0;
      const lp = lGeo.getAttribute('position') as THREE.BufferAttribute;
      const lk = lGeo.getAttribute('color') as THREE.BufferAttribute;

      for (let i = 0; i < GRID_COUNT && lc < MAX_CONNECTIONS; i++) {
        for (let j = i + 1; j < GRID_COUNT && lc < MAX_CONNECTIONS; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dz = dots[i].z - dots[j].z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < CONNECTION_DIST) {
            const fade = 1 - dist / CONNECTION_DIST;
            const idx = lc * 6;
            lp.array[idx]     = dots[i].x;
            lp.array[idx + 1] = dots[i].y;
            lp.array[idx + 2] = dots[i].z;
            lp.array[idx + 3] = dots[j].x;
            lp.array[idx + 4] = dots[j].y;
            lp.array[idx + 5] = dots[j].z;

            const cr = (dots[i].color.r + dots[j].color.r) * 0.5 * fade;
            const cg = (dots[i].color.g + dots[j].color.g) * 0.5 * fade;
            const cb = (dots[i].color.b + dots[j].color.b) * 0.5 * fade;
            lk.array[idx]     = cr;
            lk.array[idx + 1] = cg;
            lk.array[idx + 2] = cb;
            lk.array[idx + 3] = cr;
            lk.array[idx + 4] = cg;
            lk.array[idx + 5] = cb;
            lc++;
          }
        }
      }
      lp.needsUpdate = true;
      lk.needsUpdate = true;
      lGeo.setDrawRange(0, lc * 2);

      // Gentle camera drift
      camera.position.x = Math.sin(t * 0.03) * 12;
      camera.position.y = Math.cos(t * 0.025) * 8;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }

    animate();

    /* Resize */
    function onResize() {
      if (!el) return;
      const nw = el.clientWidth;
      const nh = el.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    }
    window.addEventListener('resize', onResize);

    /* Cleanup */
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      pGeo.dispose();
      pMat.dispose();
      lGeo.dispose();
      lMat.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
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
        zIndex: 0,
      }}
    />
  );
}
