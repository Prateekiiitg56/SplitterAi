/* ── Domain types ─────────────────────────────────────────────── */

export type AgentRole = 'planner' | 'coder' | 'auditor' | 'tester'
export type SubtaskStatus = 'pending' | 'running' | 'success' | 'error'
export type RunStatus = 'idle' | 'planning' | 'executing' | 'done' | 'error'
export type AgentStatus = 'active' | 'idle' | 'error'

export interface Subtask {
  id: string
  role: AgentRole
  group: number
  instruction: string
  status: SubtaskStatus
  model?: string
  output?: string
  error?: string
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  steps?: number
}

export interface LogEntry {
  id: string
  timestamp: string
  type: 'model_request' | 'model_response' | 'model_fallback' | 'tool_call' | 'tool_result' | 'plan_generated' | 'group_start' | 'group_end' | 'subtask_start' | 'subtask_end' | 'sandbox_block' | 'info' | 'error'
  role?: AgentRole
  subtaskId?: string
  model?: string
  message: string
  detail?: string
}

export interface AgentInfo {
  role: AgentRole
  status: AgentStatus
  currentTask?: string
  model?: string
  subtaskId?: string
  stepsCompleted: number
  totalRuns: number
  successRate: number
  lastActive?: string
  logs: LogEntry[]
  subtasks: Subtask[]
}

export interface SessionEntry {
  id: string
  workspace: string
  task: string
  status: RunStatus
  createdAt: string
  subtaskCount: number
}

/* ── Role metadata ────────────────────────────────────────────── */

export const ROLE_META: Record<AgentRole, { label: string; color: string; bg: string; desc: string }> = {
  planner: { label: 'Planner', color: '#7C3AED', bg: '#7C3AED14', desc: 'Decomposes tasks into subtasks and assigns them to workers' },
  coder:   { label: 'Coder',   color: '#1A73E8', bg: '#1A73E814', desc: 'Writes, edits, and runs code using sandboxed tools' },
  auditor: { label: 'Auditor', color: '#E8710A', bg: '#E8710A14', desc: 'Reviews code for bugs, security issues, and quality' },
  tester:  { label: 'Tester',  color: '#0E9F6E', bg: '#0E9F6E14', desc: 'Writes and runs tests, verifies correctness' },
}

export const STATUS_META: Record<SubtaskStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#5F6368', bg: '#5F636814' },
  running: { label: 'Running', color: '#1A73E8', bg: '#1A73E814' },
  success: { label: 'Done',    color: '#0E9F6E', bg: '#0E9F6E14' },
  error:   { label: 'Failed',  color: '#D93025', bg: '#D9302514' },
}

/* ── Active Real Models ───────────────────────────────────────── */

export const AVAILABLE_MODELS = [
  { id: 'gemini/gemini-3.5-flash', label: 'Google Gemini 3.5 Flash', provider: 'Google AI' },
  { id: 'xai/grok-2-beta', label: 'xAI Grok-2 Beta', provider: 'xAI' },
  { id: 'openrouter/nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron-3 Super 120B (Free)', provider: 'OpenRouter' },
  { id: 'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron-3 Ultra 550B (Free)', provider: 'OpenRouter' },
]
