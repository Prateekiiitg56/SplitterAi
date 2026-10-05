import React from 'react'
import { Kanban, Code, ShieldCheck, Flask, Stack, PaintBrush } from '@phosphor-icons/react'
import type { AgentRole, AgentStatus, SubtaskStatus } from '../types'

export type BadgeSize = 'sm' | 'md'

export function AgentIcon({ role, size = 16, className = "" }: { role: AgentRole | string; size?: number; className?: string }) {
  switch (role) {
    case 'planner':
      return <Kanban size={size} className={className} weight="duotone" />
    case 'coder':
      return <Code size={size} className={className} weight="bold" />
    case 'auditor':
      return <ShieldCheck size={size} className={className} weight="duotone" />
    case 'tester':
      return <Flask size={size} className={className} weight="duotone" />
    case 'designer':
      return <PaintBrush size={size} className={className} weight="duotone" />
    default:
      return <Stack size={size} className={className} />
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
  } else if (s === 'paused' || s === 'waiting' || s === 'queued' || s === 'unverified' || s === 'cancelled') {
    statusClass = 'paused'
    label = s === 'queued' || s === 'unverified' || s === 'cancelled' ? s : 'waiting'
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
  const labels: Record<string, string> = {
    planner: 'Planner',
    coder: 'Coder',
    auditor: 'Auditor',
    tester: 'Tester',
    designer: 'Designer',
    unassigned: 'Unassigned'
  }
  const label = labels[r] ?? role

  const roleStyles: Record<string, string> = {
    planner: 'bg-[rgba(127,176,168,0.12)] text-[#7FB0A8] border-[rgba(127,176,168,0.28)]',
    coder: 'bg-[rgba(216,166,87,0.12)] text-[#D8A657] border-[rgba(216,166,87,0.28)]',
    auditor: 'bg-[rgba(156,194,138,0.12)] text-[#9CC28A] border-[rgba(156,194,138,0.28)]',
    tester: 'bg-[rgba(222,142,82,0.12)] text-[#DE8E52] border-[rgba(222,142,82,0.28)]',
    designer: 'bg-[rgba(214,138,150,0.12)] text-[#D68A96] border-[rgba(214,138,150,0.28)]',
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
    <span className={`inline-flex items-center rounded border font-medium ${colorClass} ${sizeClasses} ${className}`}>
      <AgentIcon role={role} size={iconSize} />
      <span className="text-micro font-semibold">{label}</span>
    </span>
  )
}

export function AgentBadge({ role }: { role: AgentRole }) {
  return <RoleBadge role={role} size="md" />
}

export function StatusIcon({ status }: { status: AgentStatus | SubtaskStatus | string }) {
  return <StatusDot status={status} />
}
