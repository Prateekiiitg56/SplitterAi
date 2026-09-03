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
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-recessed)', color: 'var(--color-text-2)' }}>
        <AgentIcon role={role} className="w-3.5 h-3.5" />
      </span>
      <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-1)' }}>{labels[role] ?? role}</span>
    </span>
  )
}

export function StatusBadge({ status }: { status: SubtaskStatus | 'active' | 'idle' }) {
  if (status === 'active' || status === 'running') {
    return <span className="chip-status chip-status-active">Running</span>
  }
  if (status === 'success') {
    return (
      <span className="chip-status text-[11px] font-semibold" style={{ background: 'rgba(65,85,47,0.1)', color: 'var(--color-accent)' }}>
        Done
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="chip-status text-[11px] font-semibold" style={{ background: 'rgba(197,48,48,0.08)', color: 'var(--color-red)' }}>
        Failed
      </span>
    )
  }
  return <span className="chip-status chip-status-idle">Idle</span>
}

export function StatusIcon({ status }: { status: SubtaskStatus }) {
  switch (status) {
    case 'running': return <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
    case 'success': return <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
    case 'error': return <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-red)' }} />
    default: return <Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-3)' }} />
  }
}
