import { useNavigate } from 'react-router-dom'
import {
  GitBranch,
  Users,
  GitMerge,
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
import DagBackground from '../components/DagBackground'
import ConsolePreview from '../components/ConsolePreview'

const GITHUB_URL = 'https://github.com/Prateekiiitg56/SplitterAi'

/* ── Step-card inline SVGs ─────────────────────────────────────── */

function DiagramSplit() {
  return (
    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto mt-3 opacity-50">
      {/* Single node → 3 children */}
      <circle cx="20" cy="30" r="4" fill="var(--accent)" opacity="0.6" />
      <circle cx="80" cy="10" r="3" fill="var(--good)" opacity="0.5" />
      <circle cx="80" cy="30" r="3" fill="var(--accent)" opacity="0.5" />
      <circle cx="80" cy="50" r="3" fill="var(--wait)" opacity="0.5" />
      <line x1="24" y1="30" x2="77" y2="10" stroke="var(--border-strong)" strokeWidth="0.8" />
      <line x1="24" y1="30" x2="77" y2="30" stroke="var(--border-strong)" strokeWidth="0.8" />
      <line x1="24" y1="30" x2="77" y2="50" stroke="var(--border-strong)" strokeWidth="0.8" />
    </svg>
  )
}

function DiagramParallel() {
  return (
    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto mt-3 opacity-50">
      {/* 3 parallel lanes with arrows */}
      {[10, 30, 50].map((y) => (
        <g key={y}>
          <circle cx="20" cy={y} r="3" fill="var(--accent)" opacity="0.5" />
          <line x1="23" y1={y} x2="90" y2={y} stroke="var(--border-strong)" strokeWidth="0.8" strokeDasharray="3 2" />
          <circle cx="96" cy={y} r="3" fill="var(--good)" opacity="0.5" />
          {/* Arrow head */}
          <path d={`M90 ${y - 3} L96 ${y} L90 ${y + 3}`} stroke="var(--border-strong)" strokeWidth="0.8" fill="none" />
        </g>
      ))}
    </svg>
  )
}

function DiagramMerge() {
  return (
    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto mt-3 opacity-50">
      {/* 3 nodes → single merged result */}
      <circle cx="30" cy="10" r="3" fill="var(--good)" opacity="0.5" />
      <circle cx="30" cy="30" r="3" fill="var(--good)" opacity="0.5" />
      <circle cx="30" cy="50" r="3" fill="var(--good)" opacity="0.5" />
      <circle cx="90" cy="30" r="4" fill="var(--good)" opacity="0.7" />
      <line x1="33" y1="10" x2="86" y2="30" stroke="var(--border-strong)" strokeWidth="0.8" />
      <line x1="33" y1="30" x2="86" y2="30" stroke="var(--border-strong)" strokeWidth="0.8" />
      <line x1="33" y1="50" x2="86" y2="30" stroke="var(--border-strong)" strokeWidth="0.8" />
    </svg>
  )
}

/* ── Tech strip items ──────────────────────────────────────────── */

const TECH_ITEMS = [
  { icon: Boxes, label: 'React 19' },
  { icon: Terminal, label: 'FastAPI' },
  { icon: Layers, label: 'Three.js' },
  { icon: Cpu, label: 'litellm' },
  { icon: Database, label: 'SQLite' },
  { icon: Workflow, label: 'n8n-compatible' },
]

/* ── Step cards data ───────────────────────────────────────────── */

const STEPS = [
  {
    num: '01',
    title: 'Plan',
    icon: GitBranch,
    desc: 'Describe your task in natural language. The Planner agent decomposes it into a dependency-aware subtask DAG — grouped for maximum parallelism.',
    diagram: DiagramSplit,
  },
  {
    num: '02',
    title: 'Execute',
    icon: Users,
    desc: 'Grouped agents (Coder, Auditor, Tester) run in parallel per dependency. Each operates in a sandboxed workspace with tool access.',
    diagram: DiagramParallel,
  },
  {
    num: '03',
    title: 'Combine',
    icon: GitMerge,
    desc: 'Results merge automatically. The full execution — model calls, tool invocations, file changes — streams live over the WebSocket event feed.',
    diagram: DiagramMerge,
  },
]

/* ── Landing Page ──────────────────────────────────────────────── */

export default function Landing() {
  const navigate = useNavigate()
  const score = useScore()

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans overflow-x-hidden">

      {/* ══════════════ Section 1 — Hero ══════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 overflow-hidden">
        <DagBackground />

        <motion.div
          variants={score.revealParent}
          initial="hidden"
          animate="shown"
          className="relative z-10 flex flex-col items-center max-w-[680px] text-center"
        >
          {/* Eyebrow */}
          <motion.p
            variants={score.revealChild}
            className="font-mono text-micro tracking-[0.15em] uppercase text-[var(--dim)] mb-5"
          >
            Multi-agent orchestration
          </motion.p>

          {/* Headline */}
          <motion.h1
            variants={score.revealChild}
            className="text-hero leading-[1.15] font-semibold tracking-tight mb-4"
          >
            Direct a team of AI agents through one console
          </motion.h1>

          {/* Subhead */}
          <motion.p
            variants={score.revealChild}
            className="text-ui leading-body text-[var(--text-2)] max-w-[500px] mb-8"
          >
            Free-tier models. Sandboxed workspace. Parallel execution.
            Split complex tasks across Planner, Coder, Auditor, and Tester agents — all orchestrated from a single interface.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={score.revealChild} className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => navigate('/')}
              className={cx(
                'inline-flex items-center gap-2 h-9 px-5 rounded-panel',
                'bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-meta',
                'hover:brightness-110 active:scale-[0.985]',
                'transition-all duration-[var(--d-quick)] ease-standard',
              )}
            >
              Open Console
              <ArrowRight size={14} />
            </button>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(
                'inline-flex items-center gap-2 h-9 px-5 rounded-panel',
                'border border-[var(--border)] text-[var(--text-2)] font-medium text-meta',
                'hover:border-[var(--border-strong)] hover:text-[var(--text)]',
                'transition-all duration-[var(--d-quick)] ease-standard',
              )}
            >
              View on GitHub
              <ExternalLink size={13} />
            </a>
          </motion.div>

          {/* Status strip */}
          <motion.div
            variants={score.revealChild}
            className="flex items-center gap-4 flex-wrap justify-center"
          >
            {[
              { label: 'Planner → 2 groups', status: 'working' },
              { label: '4 agents online', status: 'completed' },
              { label: 'Free-tier', status: 'paused' },
            ].map(({ label, status }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--border-soft)] bg-[var(--panel)] text-micro font-mono text-[var(--dim)]"
              >
                <StatusDot status={status} />
                {label}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════ Section 2 — How it works ══════════════ */}
      <section className="px-6 py-20 max-w-[1000px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="text-center mb-12"
        >
          <p className="font-mono text-micro tracking-[0.12em] uppercase text-[var(--dim)] mb-2">
            Architecture
          </p>
          <h2 className="text-display font-semibold tracking-tight">
            How it works
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            const Diagram = step.diagram
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.1, ease: [0.32, 0.72, 0, 1] }}
                className={cx(
                  'flex flex-col p-4 rounded-panel',
                  'bg-[var(--panel)] border border-[var(--border)]',
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="w-7 h-7 rounded-control bg-[var(--panel-2)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--accent)]">
                    <Icon size={14} />
                  </span>
                  <span className="font-mono text-micro text-[var(--faint)] tabular-nums">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-strong font-semibold text-[var(--text)] mb-1.5">
                  {step.title}
                </h3>
                <p className="text-meta text-[var(--text-2)] leading-relaxed flex-1">
                  {step.desc}
                </p>
                <Diagram />
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ══════════════ Section 3 — Live console preview ══════════════ */}
      <section className="px-6 py-20 bg-[var(--bg-inset)]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="text-center mb-10"
        >
          <p className="font-mono text-micro tracking-[0.12em] uppercase text-[var(--dim)] mb-2">
            Console
          </p>
          <h2 className="text-display font-semibold tracking-tight">
            See it in action
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <ConsolePreview />
        </motion.div>

        <p className="text-center mt-6 text-meta text-[var(--faint)] font-mono">
          Live task execution — agents run in parallel, stream results over WebSocket
        </p>
      </section>

      {/* ══════════════ Section 4 — Tech strip ══════════════ */}
      <section className="px-6 py-12 border-y border-[var(--border-soft)]">
        <div className="flex items-center justify-center gap-6 flex-wrap max-w-[800px] mx-auto">
          {TECH_ITEMS.map(({ icon: TechIcon, label }, i) => (
            <span key={label} className="flex items-center gap-2">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="w-px h-4 bg-[var(--border)] -ml-3 mr-0"
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

      {/* ══════════════ Section 5 — Footer CTA + footer ══════════════ */}
      <section className="px-6 py-20 flex flex-col items-center text-center">
        <h2 className="text-title font-semibold tracking-tight mb-3">
          Ready to orchestrate?
        </h2>
        <p className="text-meta text-[var(--text-2)] mb-6 max-w-[400px]">
          No API keys required to start. Runs entirely on free-tier model quotas.
        </p>

        <button
          type="button"
          onClick={() => navigate('/')}
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
