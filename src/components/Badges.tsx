import { Loader2, CheckCircle2, XCircle, Clock, Layers, Pause, Play, Square, AlertTriangle } from 'lucide-react'
import type { AgentRole, AgentStatus, SubtaskStatus } from '../types'

export function AgentIcon({ role, size = 16, className = "" }: { role: AgentRole | string; size?: number; className?: string }) {
  switch (role) {
    case 'planner': return <Layers size={size} className={className} />
    case 'coder': return (
      <svg width={size} height={size} className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="7,5 3,10 7,15" /><polyline points="13,5 17,10 13,15" />
      </svg>
    )
    case 'auditor': return (
      <svg width={size} height={size} className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <path d="M10 2L3 6v5c0 4.4 3 7.5 7 9 4-1.5 7-4.6 7-9V6l-7-4z" /><polyline points="7,10 9,12 13,8" />
      </svg>
    )
    case 'tester': return (
      <svg width={size} height={size} className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <path d="M8 2v5L5 14c-.5 1.5.5 4 5 4s5.5-2.5 5-4L12 7V2" /><line x1="6" y1="2" x2="14" y2="2" />
      </svg>
    )
    default: return <Layers size={size} className={className} />
  }
}

export function AgentBadge({ role }: { role: AgentRole }) {
  const labels: Record<AgentRole, string> = { planner: 'Planner', coder: 'Coder', auditor: 'Auditor', tester: 'Tester' }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-6 h-6 rounded-lg bg-white/10 text-white flex items-center justify-center flex-shrink-0">
        <AgentIcon role={role} size={14} />
      </span>
      <span className="text-[13px] font-semibold text-white">{labels[role] ?? role}</span>
    </span>
  )
}

/* ── Canonical Status Indicator Component ─────────────────────── */

export interface StatusConfig {
  label: string
  color: string
  bg: string
  border: string
  icon: any
}

export const CANONICAL_STATUS_META: Record<AgentStatus | SubtaskStatus | string, StatusConfig> = {
  idle: { label: 'Idle', color: '#94A3B8', bg: '#94A3B815', border: '#94A3B833', icon: Clock },
  queued: { label: 'Queued', color: '#F59E0B', bg: '#F59E0B15', border: '#F59E0B33', icon: Clock },
  working: { label: 'Working', color: '#3B82F6', bg: '#3B82F615', border: '#3B82F633', icon: Loader2 },
  running: { label: 'Working', color: '#3B82F6', bg: '#3B82F615', border: '#3B82F633', icon: Loader2 },
  paused: { label: 'Paused', color: '#F97316', bg: '#F9731615', border: '#F9731633', icon: Pause },
  completed: { label: 'Completed', color: '#10B981', bg: '#10B98115', border: '#10B98133', icon: CheckCircle2 },
  success: { label: 'Completed', color: '#10B981', bg: '#10B98115', border: '#10B98133', icon: CheckCircle2 },
  done: { label: 'Completed', color: '#10B981', bg: '#10B98115', border: '#10B98133', icon: CheckCircle2 },
  failed: { label: 'Failed', color: '#EF4444', bg: '#EF444415', border: '#EF444433', icon: XCircle },
  error: { label: 'Failed', color: '#EF4444', bg: '#EF444415', border: '#EF444433', icon: XCircle },
  stopped: { label: 'Stopped', color: '#8B5CF6', bg: '#8B5CF615', border: '#8B5CF633', icon: Square },
  pending: { label: 'Pending', color: '#64748B', bg: '#64748B15', border: '#64748B33', icon: Clock },
}

export function StatusBadge({ status }: { status: AgentStatus | SubtaskStatus | string }) {
  const config = CANONICAL_STATUS_META[status.toLowerCase()] || CANONICAL_STATUS_META.idle
  const Icon = config.icon

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border select-none"
      style={{ color: config.color, backgroundColor: config.bg, borderColor: config.border }}
    >
      <Icon size={12} className={status === 'working' || status === 'running' ? 'animate-spin' : ''} />
      <span>{config.label}</span>
    </span>
  )
}

export function StatusIcon({ status }: { status: AgentStatus | SubtaskStatus | string }) {
  const config = CANONICAL_STATUS_META[status.toLowerCase()] || CANONICAL_STATUS_META.idle
  const Icon = config.icon
  return <Icon size={14} className={`flex-shrink-0 ${status === 'working' || status === 'running' ? 'animate-spin' : ''}`} style={{ color: config.color }} />
}
