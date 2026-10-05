/**
 * API client — WebSocket + REST connection to the agentcli backend.
 *
 * Connects to the FastAPI server for:
 * - POST /run  → execute tasks
 * - GET /sessions → recent runs for sidebar
 * - GET /agents → agent configurations
 * - GET /health → server health check
 * - WebSocket /ws → real-time log event streaming
 */

import { API_BASE, WS_URL, getSharedSecret } from '../config'
import type { QuotaInfo } from '../types'

// ── Types matching backend schemas ─────────────────────────────

export interface RunRequest {
  task: string
  workspace: string
  model?: string
  plan_file?: string
  subtasks?: Array<{
    id: string
    role: string
    group: number
    instruction: string
    status?: string
    depends_on?: string[]
    capability?: string
    size?: string
  }>
  strategy?: StrategyId
  agent_count?: number
  stack?: StackId
}

/** Web stack; 'auto' lets the backend pick from the task text (Tailwind by default). */
export type StackId = 'auto' | 'tailwind' | 'plain' | 'react'

export type StrategyId = 'cost' | 'balanced' | 'fastest' | 'quality'
export type Confidence = 'low' | 'medium' | 'high'

/** One estimated configuration. Ranges are [low, high]; point values are the uncalibrated centre. */
export interface ExecutionEstimate {
  agents: number
  time_s: [number, number]
  tokens: [number, number]
  point_time_s: number
  point_tokens: number
  confidence: Confidence
  sources: string[]
}

export interface StrategyOption extends ExecutionEstimate {
  id: StrategyId
  label: string
  repairs: number
  models: string[]
}

export interface PlanAnalysis {
  complexity: string
  subtask_count: number
  dependency_levels: number
  max_parallel: number
  max_useful_agents: number
  recommended: StrategyId
  recommended_agents: number
  reasons: string[]
  options: ExecutionEstimate[]
  strategies: StrategyOption[]
}

export interface RunReport {
  strategy: StrategyId
  agents: number
  models_used: string[]
  estimated: { time_s: [number, number]; tokens: [number, number]; confidence: Confidence }
  actual: { time_s: number; tokens: number }
  failed_subtasks: number
  parallel_efficiency: number | null
  verification: Verification | null
}

export interface Verification {
  verdict: 'pass' | 'fail' | 'unknown'
  issues: string
  repair_rounds: number
}

export interface PlanResult {
  task: string
  subtasks: SubtaskResult[]
  analysis?: PlanAnalysis
  stack?: StackId
}

export interface SubtaskResult {
  id: string
  role: string
  group: number
  instruction: string
  status: string
  model?: string
  output?: string
  error?: string
  started_at?: number
  finished_at?: number
  duration_ms?: number
  steps: number
  depends_on?: string[]
  capability?: string
  size?: string
  tokens_in?: number
  tokens_out?: number
}

export interface RunResult {
  run_id?: string
  error?: string | null
  artifact_url?: string | null
  subtasks: SubtaskResult[]
  results: Record<string, string>
  status: string
  total_duration_ms?: number
  report?: RunReport | null
  synthesis?: string | null
  verification?: Verification | null
  /** Where the run wrote its files; a new folder when the run started a new project. */
  workspace?: string | null
}

export interface LogEvent {
  id: string
  timestamp: string
  type: string
  role?: string
  subtask_id?: string
  model?: string
  message: string
  detail?: string
  run_id?: string | null
  workspace?: string | null
}

/** GET /runs/{id}: live state of an active run, or the stored record of a finished one. */
export interface RunSnapshot {
  run_id: string
  workspace: string
  task: string
  status: string
  subtasks: SubtaskResult[]
  logs: LogEvent[]
  result: RunResult | null
}

export interface SessionInfo {
  workspace: string
  task: string
  name?: string
  status: string
  subtask_count: number
  created_at: string
  updated_at?: number
}

export interface AgentConfig {
  role: string
  model_chain: string[]
  status: string
}

// ── REST Client with Timeout & Network Resilience ────────────────

/** Adds the shared secret as ?token= for URLs the browser opens directly (links, iframes, WebSocket). */
export function withToken(url: string): string {
  const secret = getSharedSecret()
  if (!secret) return url
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(secret)}`
}

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const secret = getSharedSecret()
  const headers = new Headers(options.headers)
  if (secret) headers.set('X-API-Key', secret)
  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    })
    return res
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s: ${url}`)
    }
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      throw new Error(`Backend server unreachable at ${API_BASE}. Make sure 'python backend/server.py' is running.`)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function planTask(
  task: string,
  workspace: string,
  model?: string,
  history?: Array<{ sender: 'user' | 'agent'; text: string }>,
  stack?: StackId,
): Promise<PlanResult> {
  const res = await fetchWithTimeout(`${API_BASE}/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, workspace, model, history, stack: stack === 'auto' ? undefined : stack }),
  }, 120000)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Plan generation failed: ${res.status} ${res.statusText}` }))
    throw new Error(err.detail || `Plan generation failed (${res.status})`)
  }
  return res.json()
}

/** Starts a run in the background; progress arrives over the WebSocket tagged with run_id. */
export async function startRun(request: RunRequest): Promise<{ run_id: string; workspace: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, stack: request.stack === 'auto' ? undefined : request.stack }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Run failed: ${res.status} ${res.statusText}` }))
    throw new Error(err.detail || `Run failed (${res.status})`)
  }
  return res.json()
}

export interface RunSummary {
  run_id: string
  workspace: string
  task: string
  status: string
  created_at: number
}

/** Active runs of a workspace first, then finished ones, newest first. */
export async function listRuns(workspace: string): Promise<RunSummary[]> {
  const res = await fetchWithTimeout(`${API_BASE}/runs?workspace=${encodeURIComponent(workspace)}`, {}, 10000)
  if (!res.ok) throw new Error(`Could not load runs (HTTP ${res.status})`)
  return res.json()
}

export async function classifyIntent(message: string): Promise<{ intent: 'task' | 'chat'; confidence: number }> {
  const res = await fetchWithTimeout(`${API_BASE}/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  }, 30000)
  if (!res.ok) throw await sessionError(res, 'Could not classify the message')
  return res.json()
}

export async function fetchRun(runId: string): Promise<RunSnapshot> {
  const res = await fetchWithTimeout(`${API_BASE}/runs/${encodeURIComponent(runId)}`, {}, 10000)
  if (!res.ok) throw new Error(`Could not load run (HTTP ${res.status})`)
  return res.json()
}

export async function cancelRun(runId: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/runs/${encodeURIComponent(runId)}/cancel`, { method: 'POST' }, 10000)
  if (!res.ok && res.status !== 409) throw await sessionError(res, 'Could not cancel run')
}

// Throws on failure so callers can tell "no projects" apart from "backend down".
export async function getSessions(): Promise<SessionInfo[]> {
  const res = await fetchWithTimeout(`${API_BASE}/sessions`, {}, 10000)
  if (!res.ok) throw new Error(`Could not load projects (HTTP ${res.status})`)
  return res.json()
}

export const fetchSessions = getSessions

async function sessionError(res: Response, fallback: string): Promise<Error> {
  const err = await res.json().catch(() => ({}))
  return new Error(err.detail || `${fallback} (HTTP ${res.status})`)
}

export async function renameSession(workspace: string, name: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/sessions`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace, name }),
  }, 10000)
  if (!res.ok) throw await sessionError(res, 'Could not rename project')
}

export async function deleteSession(workspace: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/sessions?workspace=${encodeURIComponent(workspace)}`, { method: 'DELETE' }, 10000)
  if (!res.ok) throw await sessionError(res, 'Could not delete project')
}

export async function fetchModels(): Promise<Array<{ id: string; label: string; provider: string }>> {
  const res = await fetchWithTimeout(`${API_BASE}/models`, {}, 10000)
  if (!res.ok) throw new Error(`Could not load models (HTTP ${res.status})`)
  return res.json()
}

export async function fetchAgents(): Promise<Array<{ role: string; model_chain: string[]; status: string }>> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/agents`, {}, 10000)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function fetchAgentDetail(role: string): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE}/agents/${role}`, {}, 10000)
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch agent '${role}'`)
  return res.json()
}

export async function fetchAgentQuotas(): Promise<QuotaInfo[]> {
  const res = await fetchWithTimeout(`${API_BASE}/agents/quota`, {}, 10000)
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch quotas`)
  return res.json()
}

/** Direct download URL; a plain link lets the browser stream the zip. */
export function workspaceExportUrl(workspace: string): string {
  return withToken(`${API_BASE}/workspaces/export?workspace=${encodeURIComponent(workspace)}`)
}

export interface ProjectEntry {
  kind: 'web' | 'file' | 'none'
  path: string | null
}

export interface ProjectInfo {
  project_id: string
  workspace: string
  entry: ProjectEntry
}

export async function fetchProjectInfo(workspace: string): Promise<ProjectInfo> {
  const res = await fetchWithTimeout(`${API_BASE}/projects/info?workspace=${encodeURIComponent(workspace)}`, {}, 10000)
  if (!res.ok) throw await sessionError(res, 'Could not load project')
  return res.json()
}

/** Preview of a project, by the project id the backend returned (works for generated and imported projects). */
export function previewUrl(projectId: string): string {
  return withToken(`${API_BASE}/preview/${encodeURIComponent(projectId)}/`)
}

export interface FileContent {
  path: string
  size: number
  binary: boolean
  truncated: boolean
  content: string
}

export async function fetchFileContent(workspace: string, path: string): Promise<FileContent> {
  const q = `workspace=${encodeURIComponent(workspace)}&path=${encodeURIComponent(path)}`
  const res = await fetchWithTimeout(`${API_BASE}/files/content?${q}`, {}, 10000)
  if (!res.ok) throw await sessionError(res, 'Could not read file')
  return res.json()
}

export async function runProjectFile(workspace: string, path: string): Promise<{ command: string; exit_code: number | null; output: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/projects/run-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace, path }),
  }, 90000)
  if (!res.ok) throw await sessionError(res, 'Could not run file')
  return res.json()
}

export async function fetchFiles(workspace: string): Promise<any[]> {
  const res = await fetchWithTimeout(`${API_BASE}/files?workspace=${encodeURIComponent(workspace)}`, {}, 10000)
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch file tree`)
  return res.json()
}

export async function uploadWorkspace(file: File): Promise<{ workspace: string; fileCount: number }> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetchWithTimeout(`${API_BASE}/workspaces/upload`, {
    method: 'POST',
    body: formData,
  }, 60000)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to upload workspace zip' }))
    throw new Error(err.detail || 'Upload workspace failed')
  }

  return res.json()
}

export async function importN8nWorkflow(json: object): Promise<PlanResult> {
  const res = await fetchWithTimeout(`${API_BASE}/workflows/import-n8n`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(json),
  }, 30000)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to import n8n workflow' }))
    throw new Error(err.detail || 'Import n8n workflow failed')
  }

  return res.json()
}

/** Streams a chat reply: onDelta gets text as it arrives; resolves with the model that answered. */
export async function streamChatMessage(
  role: string,
  message: string,
  onDelta: (text: string) => void,
  model?: string,
  history?: Array<{ sender: 'user' | 'agent'; text: string }>
): Promise<{ model?: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, message, model: model || undefined, history }),
  }, 180000)
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ detail: 'Failed to send chat message' }))
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Failed to send chat message')
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''
    for (const raw of events) {
      if (!raw.startsWith('data: ')) continue
      const event = JSON.parse(raw.slice(6))
      if (event.delta) onDelta(event.delta)
      if (event.error) {
        const tried = (event.attempts || []).map((a: any) => `${a.model}: ${a.error}`).join('; ')
        throw new Error(tried ? `${event.error} ${tried}` : event.error)
      }
      if (event.done) return { model: event.model }
    }
  }
  return {}
}

// Throws on failure so the UI can show "backend unreachable" instead of "nothing connected".
export async function fetchIntegrations(): Promise<any[]> {
  const res = await fetchWithTimeout(`${API_BASE}/integrations`, {}, 10000)
  if (!res.ok) throw new Error(`Could not load integrations (HTTP ${res.status})`)
  return res.json()
}

export interface HealthStatus {
  version: string
  uptime_s: number
  supabase_enabled: boolean
  llm_ready: boolean
  llm_keys: Record<string, boolean>
  fake_llm: boolean
  sandbox: { mode: string; available: boolean }
  auth_required: boolean
  max_concurrent_agents: number
}

/** null when the backend cannot be reached. */
export async function fetchHealth(): Promise<HealthStatus | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 5000)
    return res.ok ? res.json() : null
  } catch {
    return null
  }
}

export async function connectIntegration(payload: any): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE}/integrations/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, 15000)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to connect integration' }))
    throw new Error(err.detail || 'Connection failed')
  }
  return res.json()
}

export async function testIntegration(id: string): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE}/integrations/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }, 90000)
  if (!res.ok) throw await sessionError(res, 'Could not test the connection')
  return res.json()
}

export async function fetchGithubRepos(): Promise<Array<{ full_name: string; private: boolean; default_branch?: string }>> {
  const res = await fetchWithTimeout(`${API_BASE}/integrations/github/repos`, {}, 20000)
  if (!res.ok) throw await sessionError(res, 'Could not load repositories')
  return res.json()
}

export async function importGithubRepo(repo: string): Promise<{ workspace: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/integrations/github/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo }),
  }, 180000)
  if (!res.ok) throw await sessionError(res, 'Could not import the repository')
  return res.json()
}

export async function pushToGithub(workspace: string, branch: string, message: string, repo?: string): Promise<{ message: string; url: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/integrations/github/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace, branch, message, repo: repo || undefined }),
  }, 180000)
  if (!res.ok) throw await sessionError(res, 'Push failed')
  return res.json()
}

export async function disconnectIntegration(id: string): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE}/integrations/disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }, 10000)
  if (!res.ok) throw new Error('Failed to disconnect integration')
  return res.json()
}

export async function reconfigureIntegration(id: string, allowedRoles: string[]): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE}/integrations/reconfigure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, allowedRoles }),
  }, 10000)
  if (!res.ok) throw new Error('Failed to reconfigure integration')
  return res.json()
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 5000)
    return res.ok
  } catch {
    return false
  }
}

// ── WebSocket Client ───────────────────────────────────────────

/**
 * Every WebSocket message is also dispatched here as a CustomEvent named after its type
 * (e.g. 'sessions_changed', 'file_written', 'complete'), so any hook can react to pushes
 * without opening its own socket or polling.
 */
export const serverEvents = new EventTarget()

export type EventHandler = (event: LogEvent) => void
export type PlanHandler = (subtasks: SubtaskResult[], runId?: string) => void
export type CompleteHandler = (result: RunResult, runId?: string) => void

interface WebSocketHandlers {
  onEvent?: EventHandler
  onPlan?: PlanHandler
  onComplete?: CompleteHandler
  onConnect?: () => void
  onDisconnect?: () => void
}

export class AgentWebSocket {
  private ws: WebSocket | null = null
  private handlers: WebSocketHandlers
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = true
  private retries = 0

  constructor(handlers: WebSocketHandlers) {
    this.handlers = handlers
  }

  connect(): void {
    this.shouldReconnect = true
    try {
      const ws = new WebSocket(withToken(WS_URL))
      this.ws = ws

      ws.onopen = () => {
        this.retries = 0
        this.handlers.onConnect?.()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          serverEvents.dispatchEvent(new CustomEvent(data.type || 'message', { detail: data }))

          if (data.type === 'plan' && data.subtasks) {
            this.handlers.onPlan?.(data.subtasks, data.run_id)
          } else if (data.type === 'complete' && data.result) {
            this.handlers.onComplete?.(data.result, data.run_id)
          } else {
            // It's a LogEntry event
            this.handlers.onEvent?.(data as LogEvent)
          }
        } catch (err) {
          /* ignore parse error */
        }
      }

      ws.onclose = () => {
        this.handlers.onDisconnect?.()
        this.scheduleReconnect()
      }
    } catch (err) {
      console.warn('[agentcli] Failed to create WebSocket:', err)
      this.scheduleReconnect()
    }
  }

  /** Exponential backoff (1s .. 30s) so a downed backend isn't hammered. */
  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return
    const delay = Math.min(1000 * 2 ** this.retries, 30000)
    this.retries++
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    const ws = this.ws
    this.ws = null
    if (!ws) return
    // Detach so a late close from this socket can't flip state for a newer one.
    ws.onopen = ws.onmessage = ws.onclose = null
    if (ws.readyState === WebSocket.CONNECTING) {
      // Closing mid-handshake logs a browser warning (StrictMode remount); close once open instead.
      ws.onopen = () => ws.close()
    } else {
      ws.close()
    }
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
