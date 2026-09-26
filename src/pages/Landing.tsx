import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { animate, createSpring } from 'animejs'
import {
  ArrowRight,
  ArrowUpRight,
  Cpu,
  Database,
  Workflow,
  Boxes,
  Terminal,
  Layers,
} from 'lucide-react'
import { cx } from '../lib/cx'
import { ElementsCollection } from '../shaders/elements/ElementsCollection'
import NeuralMotes from '../components/NeuralMotes'
import '../shaders/threeui.css'

const GITHUB_URL = 'https://github.com/Prateekiiitg56/SplitterAi'

/* ── Tech strip items ──────────────────────────────────────────── */

const TECH_ITEMS = [
  { icon: Boxes, label: 'Multiple AI agents' },
  { icon: Terminal, label: 'Safe isolated environment' },
  { icon: Layers, label: 'Tasks run in parallel' },
  { icon: Cpu, label: 'Free AI models' },
  { icon: Database, label: 'Works on your computer' },
  { icon: Workflow, label: 'Import workflows' },
]

/* ── Landing Page ──────────────────────────────────────────────── */

export default function Landing() {
  const navigate = useNavigate()
  const ctaRef = useRef<HTMLButtonElement>(null)
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const springTo = (scale: number) => {
    if (!ctaRef.current || reduceMotion()) return
    animate(ctaRef.current, { scale, ease: createSpring({ stiffness: 320, damping: 14 }) })
  }

  useEffect(() => {
    const el = ctaRef.current
    if (!el || reduceMotion()) return
    const pop = animate(el, {
      scale: [0.4, 1],
      opacity: [0, 1],
      delay: 350,
      ease: createSpring({ stiffness: 260, damping: 11 }),
    })
    return () => { pop.revert() }
  }, [])

  return (
    <div className="relative h-screen overflow-x-hidden overflow-y-auto bg-[var(--bg)] text-[var(--text)] font-sans">
      {/* ══════════════ Full-page Fixed WebGL Background ══════════════ */}
      <div className="fixed inset-0 z-0 opacity-80 pointer-events-auto">
        <ElementsCollection
          variant="generative-tree"
          speed={0.8}
          size={1.00}
          particleAmount={1.00}
          hue={0}
          saturation={1.00}
          brightness={0.9}
          opacity={0.8}
        />
        <NeuralMotes />
      </div>

      <div className="relative z-10 min-h-screen bg-gradient-to-b from-[var(--bg)]/80 via-transparent to-[var(--bg)]/95">
        {/* ══════════════ Product navigation ══════════════ */}
        <header className="mx-auto flex w-full max-w-[1240px] items-center justify-between border-b border-[var(--border-soft)]/70 px-6 py-5 sm:px-10 lg:px-12">
          <button
            type="button"
            onClick={() => navigate('/welcome')}
            className="group flex items-center gap-3 text-left"
            aria-label="Go to SplitterAI home"
          >
            <img
              src="/splitterai-logo.svg"
              alt=""
              className="h-8 w-8 transition-transform duration-[var(--d-quick)] group-hover:scale-105"
            />
            <span className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
              Splitter<span className="text-[var(--accent)]">AI</span>
            </span>
            <span className="hidden border-l border-white/15 pl-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--dim)] sm:block">
              Dashboard
            </span>
          </button>

          <nav className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--dim)] sm:gap-7">
            <a href="#stack" className="hidden transition-colors hover:text-[var(--text)] sm:block">Features</a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1.5 text-[var(--text-2)] transition-colors hover:text-[var(--accent)]"
            >
              GitHub
              <ArrowUpRight size={13} className="transition-transform duration-[var(--d-quick)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </nav>
        </header>

      {/* ══════════════ Section 2 — Tech strip ══════════════ */}
      <section id="stack" className="fixed inset-x-0 bottom-0 z-20 border-y border-[var(--border-soft)]/70 bg-[var(--bg)]/85 px-4 py-4 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex w-full max-w-none items-center justify-between gap-4 overflow-x-auto">
          {TECH_ITEMS.map(({ icon: TechIcon, label }, i) => (
            <span key={label} className="flex shrink-0 items-center gap-2">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="mr-2 h-4 w-px bg-[var(--border)] opacity-50"
                />
              )}
              <TechIcon size={13} className="text-[var(--faint)]" />
              <span className="font-mono text-micro tracking-[0.06em] uppercase text-[var(--dim)]">
                {label}
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* ══════════════ Section 3 — Footer CTA + footer ══════════════ */}
      <section className="relative z-10 flex min-h-[calc(100vh-88px)] flex-col items-center justify-end px-6 pb-32 pt-20 text-center">

        <button
          ref={ctaRef}
          type="button"
          onClick={() => navigate('/console')}
          onPointerEnter={() => springTo(1.06)}
          onPointerLeave={() => springTo(1)}
          onPointerDown={() => springTo(0.94)}
          onPointerUp={() => springTo(1.06)}
          className={cx(
            'group relative inline-flex h-11 items-center gap-2 rounded-full px-7',
            'border border-white/20 bg-white/[0.03] backdrop-blur-md',
            'text-[var(--text)] font-medium text-ui tracking-[0.02em]',
            'hover:border-white/40 hover:bg-white/[0.07]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
            'transition-colors duration-[var(--d-quick)] ease-standard',
            'mb-8',
          )}
        >
          Get Started
          <ArrowRight size={15} className="transition-transform duration-[var(--d-quick)] group-hover:translate-x-1" />
        </button>

        <div className="flex items-center gap-4 text-micro text-[var(--faint)]">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text)] transition-colors duration-[var(--d-quick)]"
          >
            GitHub
          </a>
          <span aria-hidden="true" className="w-px h-3 bg-[var(--border)]" />
          <a
            href={`${GITHUB_URL}/blob/main/LICENSE`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text)] transition-colors duration-[var(--d-quick)]"
          >
            MIT License
          </a>
          <span aria-hidden="true" className="w-px h-3 bg-[var(--border)]" />
          <span>Uses free AI model limits, no paid plan needed.</span>
        </div>
      </section>
    </div>
    </div>
  )
}
