/**
 * Canonical Types & Entity Definitions for SplitterAI.
 *
 * Single source of truth for all domain entities, UI state, and API contracts.
 */

/* ── Domain Role & Status Enums ────────────────────────────────── */

export type AgentRole = 'planner' | 'coder' | 'auditor' | 'tester'
export type SubtaskStatus = 'pending' | 'running' | 'success' | 'error' | 'queued' | 'working' | 'completed' | 'failed' | 'stopped'
export type RunStatus = 'idle' | 'planning' | 'executing' | 'done' | 'error'
export type AgentStatus = 'idle' | 'queued' | 'working' | 'paused' | 'completed' | 'failed' | 'stopped'

/* ── Core Domain Entities ───────────────────────────────────────── */

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
  type:
    | 'model_request'
    | 'model_response'
    | 'model_fallback'
    | 'tool_call'
    | 'tool_result'
    | 'plan_generated'
    | 'group_start'
    | 'group_end'
    | 'subtask_start'
    | 'subtask_end'
    | 'sandbox_block'
    | 'info'
    | 'error'
    | 'shell'
    | 'agent_started'
    | 'agent_completed'
    | 'agent_failed'
    | 'agent_paused'
    | 'agent_resumed'
    | 'agent_stopped'
    | 'task_assigned'
    | 'file_created'
    | 'file_modified'
    | 'file_deleted'
    | 'command_executed'
    | 'test_started'
    | 'test_completed'
  role?: AgentRole
  subtaskId?: string
  model?: string
  message: string
  detail?: string
}

export type Event = LogEntry

export interface Project {
  id: string
  workspace: string
  task: string
  status: RunStatus
  createdAt: string
  subtaskCount: number
  color?: string
  progress?: number
  tags?: string[]
}

export type SessionEntry = Project

export interface Task {
  taskTitle: string
  workspace: string
  runStatus: RunStatus
  subtasks: Subtask[]
  logs: LogEntry[]
}

export interface Agent {
  role: AgentRole
  status: AgentStatus
  currentTask?: string
  model?: string
  modelChain?: string[]
  subtaskId?: string
  stepsCompleted: number
  totalRuns: number
  successRate: number
  lastActive?: string
  logs: LogEntry[]
  subtasks: Subtask[]
}

export type AgentInfo = Agent

export interface FileNode {
  name: string
  path?: string
  type: 'file' | 'dir' | 'folder'
  children?: FileNode[]
  size?: number | string
  modifiedBy?: string
}

export type File = FileNode

/* ── Re-exported API Types ───────────────────────────────────────── */
export type { SubtaskResult, LogEvent } from '../lib/api'


export interface QuotaInfo {
  provider: string
  modelKey: string
  requestsUsed: number
  requestsLimit: number
  usedPercentage: number
  resetTime?: string
  status: string
}

export interface MCPServer {
  id: string
  name: string
  transport: 'stdio' | 'sse'
  status: 'active' | 'lazy' | 'disconnected'
  description: string
  toolsCount: number
  category: string
}

export interface ExecutionMode {
  id: string
  label: string
  desc: string
  icon?: any
}

export interface ModelOption {
  id: string
  label: string
  provider: string
}

/* ── Integration Entity ─────────────────────────────────────────── */

export type IntegrationType = 'mcp' | 'github' | 'oauth_generic'
export type IntegrationStatus = 'not_connected' | 'connecting' | 'connected' | 'error'

export interface IntegrationConfig {
  repo?: string
  org?: string
  url?: string
  description?: string
  transport?: 'sse' | 'stdio' | 'http'
}

export interface Integration {
  id: string
  type: IntegrationType
  name: string
  status: IntegrationStatus
  connectedAt?: string | null
  config?: IntegrationConfig
  scopes?: string[]
  allowedRoles?: AgentRole[]
  lastError?: string | null
}
