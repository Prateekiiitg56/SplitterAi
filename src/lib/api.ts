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

import { API_BASE, WS_URL } from '../config'

// ── Types matching backend schemas ─────────────────────────────

export interface RunRequest {
  task: string
  workspace: string
  plan_file?: string
  subtasks?: Array<{
    id: string
    role: string
    group: number
    instruction: string
    status?: string
  }>
}

export interface PlanResult {
  task: string
  subtasks: SubtaskResult[]
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
}

export interface RunResult {
  subtasks: SubtaskResult[]
  results: Record<string, string>
  status: string
  total_duration_ms?: number
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
}

export interface SessionInfo {
  workspace: string
  task: string
  status: string
  subtask_count: number
  created_at: string
}

export interface AgentConfig {
  role: string
  model_chain: string[]
  status: string
}

// ── REST Client with Timeout & Network Resilience ────────────────

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      ...options,
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

export async function planTask(task: string, workspace: string): Promise<PlanResult> {
  const res = await fetchWithTimeout(`${API_BASE}/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, workspace }),
  }, 45000)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Plan generation failed: ${res.status} ${res.statusText}` }))
    throw new Error(err.detail || `Plan generation failed (${res.status})`)
  }
  return res.json()
}

export async function runTask(request: RunRequest): Promise<RunResult> {
  const res = await fetchWithTimeout(`${API_BASE}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  }, 60000)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Run failed: ${res.status} ${res.statusText}` }))
    throw new Error(err.detail || `Run failed (${res.status})`)
  }
  return res.json()
}

export async function getSessions(): Promise<SessionInfo[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/sessions`, {}, 10000)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export const fetchSessions = getSessions

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

export async function fetchAgentQuotas(): Promise<any[]> {
  const res = await fetchWithTimeout(`${API_BASE}/agents/quota`, {}, 10000)
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch quotas`)
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

export async function sendChatMessage(
  role: string,
  message: string,
  model?: string,
  history?: Array<{ sender: 'user' | 'agent'; text: string }>
): Promise<{ reply: string; role: string; timestamp: string; model?: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, message, model, history }),
  }, 60000)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to send chat message' }))
    throw new Error(err.detail || 'Failed to send chat message')
  }
  return res.json()
}

export async function fetchIntegrations(): Promise<any[]> {
  const res = await fetchWithTimeout(`${API_BASE}/integrations`, {}, 10000)
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch integrations`)
  return res.json()
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

export type EventHandler = (event: LogEvent) => void
export type PlanHandler = (subtasks: SubtaskResult[]) => void
export type CompleteHandler = (result: RunResult) => void

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

  constructor(handlers: WebSocketHandlers) {
    this.handlers = handlers
  }

  connect(): void {
    try {
      this.ws = new WebSocket(WS_URL)

      this.ws.onopen = () => {
        this.handlers.onConnect?.()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'plan' && data.subtasks) {
            this.handlers.onPlan?.(data.subtasks)
          } else if (data.type === 'complete' && data.result) {
            this.handlers.onComplete?.(data.result)
          } else {
            // It's a LogEntry event
            this.handlers.onEvent?.(data as LogEvent)
          }
        } catch (err) {
          /* ignore parse error */
        }
      }

      this.ws.onclose = () => {
        this.handlers.onDisconnect?.()
        if (this.shouldReconnect) {
          this.reconnectTimer = setTimeout(() => this.connect(), 3000)
        }
      }

      this.ws.onerror = (err) => {
        console.warn('[agentcli] WebSocket error:', err)
      }
    } catch (err) {
      console.warn('[agentcli] Failed to create WebSocket:', err)
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.connect(), 3000)
      }
    }
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    this.ws?.close()
    this.ws = null
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
