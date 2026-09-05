import React from 'react'
import { Layers } from 'lucide-react'
import type { AgentRole, AgentStatus, SubtaskStatus } from '../types'

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

export function AgentBadge({ role }: { role: AgentRole }) {
  const labels: Record<AgentRole, string> = { planner: 'Planner', coder: 'Coder', auditor: 'Auditor', tester: 'Tester', unassigned: 'Unassigned' }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-6 h-6 rounded-md bg-[var(--panel-2)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center flex-shrink-0">
        <AgentIcon role={role} size={14} />
      </span>
      <span className="text-[12.5px] font-medium text-[var(--text)]">{labels[role] ?? role}</span>
    </span>
  )
}

/* ── Standalone Iconic Status Dot Component (splitterai_redesign.html) ─────── */

export function StatusDot({ status }: { status: AgentStatus | SubtaskStatus | string }) {
  const s = (status || '').toLowerCase()
  let dotClass = 'idle'

  if (s === 'working' || s === 'running' || s === 'executing') dotClass = 'working'
  else if (s === 'completed' || s === 'success' || s === 'done') dotClass = 'done'
  else if (s === 'failed' || s === 'error') dotClass = 'failed'
  else if (s === 'paused') dotClass = 'paused'

  return <span className={`dot ${dotClass}`} />
}

export function StatusBadge({ status }: { status: AgentStatus | SubtaskStatus | string }) {
  const s = (status || '').toLowerCase()
  let statusClass = 'idle'
  let label = s

  if (s === 'working' || s === 'running' || s === 'executing') {
    statusClass = 'working'
    label = 'working'
  } else if (s === 'completed' || s === 'success' || s === 'done') {
    statusClass = 'completed'
    label = 'completed'
  } else if (s === 'failed' || s === 'error') {
    statusClass = 'failed'
    label = 'failed'
  } else if (s === 'paused') {
    statusClass = 'paused'
    label = 'paused'
  }

  return (
    <span className={`status-badge ${statusClass}`}>
      <StatusDot status={status} />
      <span>{label}</span>
    </span>
  )
}

export function StatusIcon({ status }: { status: AgentStatus | SubtaskStatus | string }) {
  return <StatusDot status={status} />
}
