import { useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  ArrowRight,
  Cpu,
  Database,
  Workflow,
  Boxes,
  Terminal,
  Layers,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useScore } from '../lib/motion'
import { cx } from '../lib/cx'
import { StatusDot } from '../components/Badges'
import { ElementsCollection } from '../shaders/elements/ElementsCollection'
import '../shaders/threeui.css'

const GITHUB_URL = 'https://github.com/Prateekiiitg56/SplitterAi'

/* ── Tech strip items ──────────────────────────────────────────── */

const TECH_ITEMS = [
  { icon: Boxes, label: 'React 19' },
  { icon: Terminal, label: 'FastAPI' },
  { icon: Layers, label: 'Three.js' },
  { icon: Cpu, label: 'litellm' },
  { icon: Database, label: 'SQLite' },
  { icon: Workflow, label: 'n8n-compatible' },
]

/* ── Landing Page ──────────────────────────────────────────────── */

export default function Landing() {
  const navigate = useNavigate()
  const score = useScore()

  return (
    <div className="relative min-h-screen text-[var(--text)] font-sans overflow-x-hidden bg-[#0a0a0a]">
      {/* ══════════════ Full-page Fixed WebGL Background ══════════════ */}
      <div className="fixed inset-0 z-0 opacity-100 pointer-events-auto">
        <ElementsCollection
          variant="generative-tree"
          speed={1.00}
          size={1.00}
          particleAmount={1.00}
          hue={0}
          saturation={1.00}
          brightness={1.00}
          opacity={1.00}
        />
      </div>

      {/* ══════════════ Section 1 — Hero ══════════════ */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-16 md:py-20 overflow-hidden">
        <div className="w-full max-w-[960px] mx-auto flex flex-col items-center">
          <motion.div
            variants={score.revealParent}
            initial="hidden"
            animate="shown"
            className="flex flex-col items-center max-w-[640px] text-center"
          >
            {/* Eyebrow */}
            <motion.p
              variants={score.revealChild}
              className="font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--dim)] opacity-80 mb-4"
            >
              Multi-agent orchestration
            </motion.p>

            {/* Headline */}
            <motion.h1
              variants={score.revealChild}
              className="text-[34px] sm:text-[46px] md:text-[54px] leading-[1.1] font-bold tracking-tight text-[var(--text)] max-w-[580px] mb-5"
            >
              Direct a team of AI agents through one console
            </motion.h1>

            {/* Subhead */}
            <motion.p
              variants={score.revealChild}
              className="text-[16px] sm:text-[17px] font-normal leading-[1.55] text-[var(--text-2)] max-w-[560px] mb-8"
            >
              Free-tier models. Sandboxed workspace. Parallel execution.
              Split complex tasks across Planner, Coder, Auditor, and Tester agents — all orchestrated from a single interface.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={score.revealChild} className="flex items-center gap-4 mb-2">
              <button
                type="button"
                onClick={() => navigate('/console')}
                className={cx(
                  'inline-flex items-center justify-center gap-2.5 h-11 px-7 rounded-[8px]',
                  'bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-[14px]',
                  'shadow-[0_0_24px_rgba(72,180,255,0.22)] hover:brightness-110 hover:shadow-[0_0_28px_rgba(72,180,255,0.35)]',
                  'active:scale-[0.985] transition-all duration-[var(--d-quick)] ease-standard',
                )}
              >
                Open Console
                <ArrowRight size={15} />
              </button>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cx(
                  'inline-flex items-center justify-center gap-2 h-11 px-7 rounded-[8px]',
                  'border border-[var(--border-strong)] text-[var(--text-2)] bg-transparent',
                  'hover:bg-[var(--panel-2)] hover:border-[var(--text-2)] hover:text-[var(--text)]',
                  'font-medium text-[14px] active:scale-[0.985] transition-all duration-[var(--d-quick)] ease-standard',
                )}
              >
                View on GitHub
                <ExternalLink size={14} />
              </a>
            </motion.div>

            {/* Status strip */}
            <motion.div
              variants={score.revealChild}
              className="flex items-center gap-3 flex-wrap justify-center mt-8"
            >
              {[
                { label: 'Planner → 2 groups', status: 'working' },
                { label: '4 agents online', status: 'completed' },
                { label: 'Free-tier', status: 'paused' },
              ].map(({ label, status }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-soft)] bg-[var(--panel-2)]/80 text-[12px] font-mono text-[var(--dim)] shadow-sm backdrop-blur-sm"
                >
                  <StatusDot status={status} />
                  {label}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════ Section 2 — Tech strip ══════════════ */}
      <section className="relative z-10 px-6 py-12 border-y border-[var(--border-soft)]/60">
        <div className="flex items-center justify-center gap-6 flex-wrap max-w-[800px] mx-auto">
          {TECH_ITEMS.map(({ icon: TechIcon, label }, i) => (
            <span key={label} className="flex items-center gap-2">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="w-px h-4 bg-[var(--border)] -ml-3 mr-0 opacity-50"
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
      <section className="relative z-10 px-6 py-20 flex flex-col items-center text-center">
        <h2 className="text-title font-semibold tracking-tight mb-3">
          Ready to orchestrate?
        </h2>
        <p className="text-meta text-[var(--text-2)] mb-6 max-w-[400px]">
          No API keys required to start. Runs entirely on free-tier model quotas.
        </p>

        <button
          type="button"
          onClick={() => navigate('/console')}
          className={cx(
            'inline-flex items-center gap-2 h-10 px-6 rounded-panel',
            'bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-ui',
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
  )
}
