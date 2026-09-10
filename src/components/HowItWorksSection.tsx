import { GitBranch, Users, GitMerge } from 'lucide-react'
import { motion } from 'framer-motion'
import { cx } from '../lib/cx'
import { useScore } from '../lib/motion'

function DiagramSplit() {
  return (
    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto mt-3 opacity-50">
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
      {[10, 30, 50].map((y) => (
        <g key={y}>
          <circle cx="20" cy={y} r="3" fill="var(--accent)" opacity="0.5" />
          <line x1="23" y1={y} x2="90" y2={y} stroke="var(--border-strong)" strokeWidth="0.8" strokeDasharray="3 2" />
          <circle cx="96" cy={y} r="3" fill="var(--good)" opacity="0.5" />
          <path d={`M90 ${y - 3} L96 ${y} L90 ${y + 3}`} stroke="var(--border-strong)" strokeWidth="0.8" fill="none" />
        </g>
      ))}
    </svg>
  )
}

function DiagramMerge() {
  return (
    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto mt-3 opacity-50">
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

export default function HowItWorksSection() {
  const score = useScore()
  return (
    <section className="px-6 py-16 md:py-20 max-w-[1000px] mx-auto">
      <motion.div
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, margin: '-60px' }}
        variants={score.revealChild}
        className="text-center mb-12"
      >
        <p className="font-mono text-micro font-medium tracking-[0.15em] uppercase text-[var(--dim)] opacity-80 mb-3">
          Architecture
        </p>
        <h2 className="text-display font-bold tracking-tight text-[var(--text)]">
          How it works
        </h2>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, margin: '-40px' }}
        variants={score.revealParent}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {STEPS.map((step) => {
          const Icon = step.icon
          const Diagram = step.diagram
          return (
            <motion.div
              key={step.num}
              variants={score.revealChild}
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
      </motion.div>
    </section>
  )
}
