/* ── Re-export canonical domain types from types/ ───────────────── */

export type {
  AgentRole,
  SubtaskStatus,
  RunStatus,
  AgentStatus,
  Subtask,
  LogEntry,
  Event,
  Project,
  SessionEntry,
  Task,
  Agent,
  AgentInfo,
  FileNode,
  File,
  QuotaInfo,
  ExecutionMode,
  ModelOption,
  SubtaskResult,
  LogEvent,
} from './types'

import type { AgentRole, SubtaskStatus, ModelOption } from './types'

/* ── Static Role Metadata ────────────────────────────────────────── */

export const ROLE_META: Record<AgentRole, { label: string; color: string; bg: string; desc: string }> = {
  planner:    { label: 'Planner',    color: '#7C3AED', bg: '#7C3AED14', desc: 'Decomposes tasks into subtasks and assigns them to workers' },
  coder:      { label: 'Coder',      color: '#1A73E8', bg: '#1A73E814', desc: 'Writes, edits, and runs code using sandboxed tools' },
  auditor:    { label: 'Auditor',    color: '#E8710A', bg: '#E8710A14', desc: 'Reviews code for bugs, security issues, and quality' },
  tester:     { label: 'Tester',     color: '#0E9F6E', bg: '#0E9F6E14', desc: 'Writes and runs tests, verifies correctness' },
  designer:   { label: 'Designer',   color: '#DB2777', bg: '#DB277714', desc: 'Owns the look and feel: design tokens, layout, states and DESIGN.md' },
  unassigned: { label: 'Unassigned', color: '#888888', bg: '#88888814', desc: 'Unassigned node. Select a role before launching.' },
}

export const STATUS_META: Record<SubtaskStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',   color: '#5F6368', bg: '#5F636814' },
  running:   { label: 'Working',   color: '#1A73E8', bg: '#1A73E814' },
  success:   { label: 'Completed', color: '#0E9F6E', bg: '#0E9F6E14' },
  error:     { label: 'Failed',    color: '#D93025', bg: '#D9302514' },
  queued:    { label: 'Queued',    color: '#E8710A', bg: '#E8710A14' },
  working:   { label: 'Working',   color: '#1A73E8', bg: '#1A73E814' },
  completed: { label: 'Completed', color: '#0E9F6E', bg: '#0E9F6E14' },
  failed:    { label: 'Failed',    color: '#D93025', bg: '#D9302514' },
  stopped:   { label: 'Stopped',   color: '#7C3AED', bg: '#7C3AED14' },
}

/** No pinned model: the backend picks the best chain per role. The real list comes from GET /models. */
export const AUTO_MODEL: ModelOption = { id: '', label: 'Auto (best per role)', provider: '' }
