import { useNavigate } from 'react-router-dom'
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
import '../shaders/threeui.css'

const GITHUB_URL = 'https://github.com/Prateekiiitg56/SplitterAi'

/* ── Tech strip items ──────────────────────────────────────────── */

const TECH_ITEMS = [
  { icon: Boxes, label: 'Multi-agent' },
  { icon: Terminal, label: 'Sandboxed runtime' },
  { icon: Layers, label: 'Parallel execution' },
  { icon: Cpu, label: 'Free-tier models' },
  { icon: Database, label: 'Local workspace' },
  { icon: Workflow, label: 'n8n-compatible' },
]

/* ── Landing Page ──────────────────────────────────────────────── */

export default function Landing() {
  const navigate = useNavigate()

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
              src="/splitterai-logo.png"
              alt="SplitterAI"
              className="h-8 w-auto object-contain transition-transform duration-[var(--d-quick)] group-hover:scale-105"
            />
            <span className="hidden border-l border-white/15 pl-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--dim)] sm:block">
              Control plane
            </span>
          </button>

          <nav className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--dim)] sm:gap-7">
            <a href="#stack" className="hidden transition-colors hover:text-[var(--text)] sm:block">Stack</a>
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
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(62vw,560px)] w-[min(62vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--accent)]/10 shadow-[0_0_120px_rgba(72,180,255,0.08)]" />
        <button
          type="button"
          onClick={() => navigate('/console')}
          className={cx(
            'relative inline-flex h-10 items-center gap-2 rounded-control border border-[var(--accent)]/50 bg-[var(--accent)] px-6',
            'text-[var(--accent-ink)] font-semibold text-ui',
            'hover:brightness-110 active:scale-[0.985]',
            'transition-all duration-[var(--d-quick)] ease-standard',
            'mb-8',
          )}
        >
          Open Console
          <ArrowRight size={15} />
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
          <span>Runs entirely on free-tier API quotas.</span>
        </div>
      </section>
    </div>
    </div>
  )
}
