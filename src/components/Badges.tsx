import type React from 'react'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
} from 'lucide-react'
import type { AgentRole, SubtaskStatus } from '../data'

/* ── Agent Icon Renderer (Monochrome, Shared) ─────────────────── */
export function AgentIcon({ role, className = "w-4 h-4 text-slate-600" }: { role: AgentRole | string; className?: string }) {
  switch (role) {
    case 'planner':
      return <Layers className={className} />
    case 'coder':
      return (
        <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="7,5 3,10 7,15" />
          <polyline points="13,5 17,10 13,15" />
        </svg>
      )
    case 'auditor':
      return (
        <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <path d="M10 2L3 6v5c0 4.4 3 7.5 7 9 4-1.5 7-4.6 7-9V6l-7-4z" />
          <polyline points="7,10 9,12 13,8" />
        </svg>
      )
    case 'tester':
      return (
        <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <path d="M8 2v5L5 14c-.5 1.5.5 4 5 4s5.5-2.5 5-4L12 7V2" />
          <line x1="6" y1="2" x2="14" y2="2" />
        </svg>
      )
    default:
      return null
  }
}

/* ── Unified Agent Badge (Icon box + Name) ───────────────────── */
export function AgentBadge({ role }: { role: AgentRole }) {
  const labels: Record<AgentRole, string> = {
    planner: 'Planner',
    coder: 'Coder',
    auditor: 'Auditor',
    tester: 'Tester',
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-6 h-6 rounded bg-slate-100/90 border border-slate-200/80 flex items-center justify-center flex-shrink-0">
        <AgentIcon role={role} className="w-3.5 h-3.5 text-slate-700" />
      </span>
      <span className="text-[13px] font-semibold text-slate-800 tracking-tight">
        {labels[role] ?? role}
      </span>
    </span>
  )
}

/* ── Unified Status Badge (Pixel-identical across pages) ─────── */
export function StatusBadge({ status }: { status: SubtaskStatus | 'active' | 'idle' }) {
  switch (status) {
    case 'active':
    case 'running':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-[11px] font-medium text-blue-700">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-dot" />
          Running
        </span>
      )
    case 'success':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-medium text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Done
        </span>
      )
    case 'error':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200/80 text-[11px] font-medium text-red-700">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Failed
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/60 text-[11px] font-medium text-slate-500">
          Idle
        </span>
      )
  }
}

/* ── Status Icon Renderer (Row gutters) ───────────────────────── */
export function StatusIcon({ status }: { status: SubtaskStatus }) {
  switch (status) {
    case 'running':
      return <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
    case 'error':
      return <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
    default:
      return <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
  }
}
