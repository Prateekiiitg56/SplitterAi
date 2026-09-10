import React from 'react'
import { Layers } from 'lucide-react'
import type { AgentRole, AgentStatus, SubtaskStatus } from '../types'

export type BadgeSize = 'sm' | 'md'

export function AgentIcon({ role, size = 16, className = "" }: { role: AgentRole | string; size?: number; className?: string }) {
  switch (role) {
    case 'planner':
      return (
        <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="2.4" /><circle cx="5" cy="19" r="2.4" /><circle cx="19" cy="19" r="2.4" /><path d="M12 7.4V12M12 12L6.3 17M12 12l5.7 5" />
        </svg>
      )
    case 'coder':
      return (
        <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
      )
    case 'auditor':
      return (
        <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
        </svg>
      )
    case 'tester':
      return (
        <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v5L5 14c-.5 1.5.5 4 5 4s5.5-2.5 5-4L12 7V2" /><line x1="6" y1="2" x2="14" y2="2" />
        </svg>
      )
    default:
      return <Layers size={size} className={className} />
  }
}



const STATUS_LABELS: Record<string, string> = {
  working: 'running',
  done: 'completed',
  failed: 'failed',
  paused: 'waiting',
  idle: 'idle',
}

export function StatusDot({ status, announce = true }: { status: AgentStatus | SubtaskStatus | string; announce?: boolean }) {
  const s = (status || '').toLowerCase()
  let dotClass = 'idle'

  if (s === 'working' || s === 'running' || s === 'executing') dotClass = 'working'
  else if (s === 'completed' || s === 'success' || s === 'done' || s === 'complete') dotClass = 'done'
  else if (s === 'failed' || s === 'error') dotClass = 'failed'
  else if (s === 'paused' || s === 'waiting' || s === 'queued') dotClass = 'paused'

  if (!announce) return <span className={`dot ${dotClass}`} aria-hidden="true" />

  return (
    <span className="inline-flex" role="img" aria-label={`Status: ${STATUS_LABELS[dotClass]}`}>
      <span className={`dot ${dotClass}`} aria-hidden="true" />
    </span>
  )
}

export interface StatusBadgeProps {
  status: AgentStatus | SubtaskStatus | string
  compact?: boolean
  size?: BadgeSize
  className?: string
}

export function StatusBadge({ status, compact = false, size = 'md', className = '' }: StatusBadgeProps) {
  const s = (status || '').toLowerCase()
  let statusClass = 'idle'
  let label = s

  if (s === 'working' || s === 'running' || s === 'executing') {
    statusClass = 'working'
    label = 'running'
  } else if (s === 'completed' || s === 'success' || s === 'done' || s === 'complete') {
    statusClass = 'completed'
    label = 'completed'
  } else if (s === 'failed' || s === 'error') {
    statusClass = 'failed'
    label = 'failed'
  } else if (s === 'paused' || s === 'waiting' || s === 'queued') {
    statusClass = 'paused'
    label = s === 'queued' ? 'queued' : 'waiting'
  }

  const isRunning = statusClass === 'working'
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-micro gap-1' : 'px-2 py-1 text-meta gap-1.5'

  if (compact) {
    return (
      <span className={`inline-flex items-center justify-center relative ${className}`} title={`Status: ${label}`}>
        <StatusDot status={status} announce={false} />
        {isRunning && <span className="absolute inset-0 rounded-full animate-ping bg-[var(--accent)] opacity-40 pointer-events-none" />}
        <span className="sr-only">Status: {label}</span>
      </span>
    )
  }

  return (
    <span className={`status-badge ${statusClass} ${sizeClasses} ${className}`}>
      <span className="relative flex items-center justify-center">
        <StatusDot status={status} announce={false} />
        {isRunning && <span className="absolute inset-0 rounded-full animate-ping bg-[var(--accent)] opacity-40 pointer-events-none" />}
      </span>
      <span className="font-mono uppercase tracking-wider text-micro">{label}</span>
      <span className="sr-only">Status: {label}</span>
    </span>
  )
}

export interface RoleBadgeProps {
  role: AgentRole | string
  compact?: boolean
  size?: BadgeSize
  className?: string
}

export function RoleBadge({ role, compact = false, size = 'md', className = '' }: RoleBadgeProps) {
  const r = (role || '').toLowerCase() as AgentRole
  const tags: Record<string, string> = {
    planner: 'PL',
    coder: 'CO',
    auditor: 'AU',
    tester: 'TE',
    unassigned: 'UA'
  }
  const labels: Record<string, string> = {
    planner: 'Planner',
    coder: 'Coder',
    auditor: 'Auditor',
    tester: 'Tester',
    unassigned: 'Unassigned'
  }
  const tag = tags[r] ?? r.slice(0, 2).toUpperCase()
  const label = labels[r] ?? role

  const roleStyles: Record<string, string> = {
    planner: 'bg-[rgba(56,189,248,0.12)] text-[#38bdf8] border-[rgba(56,189,248,0.25)]',
    coder: 'bg-[rgba(59,130,246,0.12)] text-[#60a5fa] border-[rgba(59,130,246,0.25)]',
    auditor: 'bg-[rgba(245,158,11,0.12)] text-[#fbbf24] border-[rgba(245,158,11,0.25)]',
    tester: 'bg-[rgba(168,85,247,0.12)] text-[#c084fc] border-[rgba(168,85,247,0.25)]',
  }
  const colorClass = roleStyles[r] ?? 'bg-[var(--panel-2)] text-[var(--text)] border-[var(--border)]'
  const iconSize = size === 'sm' ? 12 : 14
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-micro gap-1' : 'px-2 py-1 text-meta gap-1.5'

  if (compact) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded border ${colorClass} p-1 ${className}`}
        title={`Role: ${label}`}
      >
        <AgentIcon role={role} size={iconSize} />
        <span className="sr-only">Role: {label}</span>
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center rounded border font-mono font-medium ${colorClass} ${sizeClasses} ${className}`}>
      <AgentIcon role={role} size={iconSize} />
      <span className="text-micro uppercase tracking-wider font-semibold">{tag}</span>
      <span className="sr-only">Role: {label}</span>
    </span>
  )
}

export function AgentBadge({ role }: { role: AgentRole }) {
  return <RoleBadge role={role} size="md" />
}

export function StatusIcon({ status }: { status: AgentStatus | SubtaskStatus | string }) {
  return <StatusDot status={status} />
}
