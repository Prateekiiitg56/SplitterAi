import type React from 'react'
import { Loader2, CheckCircle2, XCircle, Clock, Layers } from 'lucide-react'
import type { AgentRole, SubtaskStatus } from '../data'

export function AgentIcon({ role, className = "w-3.5 h-3.5" }: { role: AgentRole | string; className?: string }) {
  switch (role) {
    case 'planner': return <Layers className={className} />
    case 'coder': return (
      <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="7,5 3,10 7,15" /><polyline points="13,5 17,10 13,15" />
      </svg>
    )
    case 'auditor': return (
      <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <path d="M10 2L3 6v5c0 4.4 3 7.5 7 9 4-1.5 7-4.6 7-9V6l-7-4z" /><polyline points="7,10 9,12 13,8" />
      </svg>
    )
    case 'tester': return (
      <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <path d="M8 2v5L5 14c-.5 1.5.5 4 5 4s5.5-2.5 5-4L12 7V2" /><line x1="6" y1="2" x2="14" y2="2" />
      </svg>
    )
    default: return null
  }
}

export function AgentBadge({ role }: { role: AgentRole }) {
  const labels: Record<AgentRole, string> = { planner: 'Planner', coder: 'Coder', auditor: 'Auditor', tester: 'Tester' }
  const tints: Record<AgentRole, { bg: string; color: string }> = {
    planner: { bg: 'rgba(61,139,95,0.08)', color: '#3D8B5F' },
    coder: { bg: 'rgba(37,99,235,0.08)', color: '#2563EB' },
    auditor: { bg: 'rgba(217,119,6,0.08)', color: '#D97706' },
    tester: { bg: 'rgba(139,92,246,0.08)', color: '#8B5CF6' },
  }
  const tint = tints[role]
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tint.bg, color: tint.color }}>
        <AgentIcon role={role} className="w-3.5 h-3.5" />
      </span>
      <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-1)' }}>{labels[role] ?? role}</span>
    </span>
  )
}

export function StatusBadge({ status }: { status: SubtaskStatus | 'active' | 'idle' }) {
  const configs: Record<string, { bg: string; border: string; dot: string; text: string; label: string }> = {
    active:  { bg: 'rgba(37,99,235,0.06)', border: 'rgba(37,99,235,0.15)', dot: '#2563EB', text: '#2563EB', label: 'Running' },
    running: { bg: 'rgba(37,99,235,0.06)', border: 'rgba(37,99,235,0.15)', dot: '#2563EB', text: '#2563EB', label: 'Running' },
    success: { bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.15)', dot: '#22C55E', text: '#16A34A', label: 'Done' },
    error:   { bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.15)', dot: '#DC2626', text: '#DC2626', label: 'Failed' },
  }
  const cfg = configs[status] || { bg: 'var(--color-elevated)', border: 'var(--color-border)', dot: 'var(--color-text-3)', text: 'var(--color-text-3)', label: 'Idle' }
  const isAnimated = status === 'active' || status === 'running'
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border" style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.text }}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isAnimated ? 'animate-pulse-dot' : ''}`} style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

export function StatusIcon({ status }: { status: SubtaskStatus }) {
  switch (status) {
    case 'running': return <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: '#2563EB' }} />
    case 'success': return <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#22C55E' }} />
    case 'error': return <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#DC2626' }} />
    default: return <Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-3)' }} />
  }
}
