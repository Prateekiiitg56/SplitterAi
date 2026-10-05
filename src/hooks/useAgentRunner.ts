import { useState, useEffect, useCallback, useRef } from 'react'
import { AgentWebSocket, cancelRun as cancelRunRequest, fetchRun, startRun } from '../lib/api'
import type { LogEvent, RunReport, RunRequest, RunResult, StackId, StrategyId, SubtaskResult, Verification } from '../lib/api'
import { DEFAULT_WORKSPACE } from '../config'
import type { Subtask, LogEntry, RunStatus, ConnectionStatus } from '../types'

/** Keep the live log bounded so a long run can't grow memory/DOM without limit. */
const MAX_LOGS = 2000
const ACTIVE_RUN_KEY = 'splitterai_active_run'
let logSeq = 0
const nextLogId = (prefix: string) => `${prefix}-${Date.now()}-${++logSeq}`
const appendLogs = (prev: LogEntry[], ...entries: LogEntry[]) => {
  const next = [...prev, ...entries]
  return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next
}
const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function toSubtask(st: SubtaskResult, fallbackStatus: Subtask['status'] = 'pending'): Subtask {
  return {
    id: st.id,
    role: st.role as Subtask['role'],
    group: st.group,
    instruction: st.instruction,
    status: (st.status as Subtask['status']) || fallbackStatus,
    model: st.model,
    output: st.output,
    error: st.error,
    steps: st.steps || 0,
    dependsOn: st.depends_on,
    capability: st.capability,
    size: st.size,
  }
}

function toLogEntry(event: LogEvent): LogEntry {
  return {
    // Always a local id: backend ids are not guaranteed unique and are used as React keys.
    id: nextLogId('ws'),
    timestamp: event.timestamp || now(),
    type: (event.type as LogEntry['type']) || 'info',
    role: (event.role as LogEntry['role']) || undefined,
    subtaskId: event.subtask_id,
    model: event.model,
    message: event.message,
    detail: event.detail,
  }
}

const readActiveRun = () => {
  try {
    return localStorage.getItem(ACTIVE_RUN_KEY)
  } catch {
    return null
  }
}
const writeActiveRun = (runId: string | null) => {
  try {
    if (runId) localStorage.setItem(ACTIVE_RUN_KEY, runId)
    else localStorage.removeItem(ACTIVE_RUN_KEY)
  } catch {
    /* storage unavailable: refresh just won't resume the run */
  }
}

export interface RunOptions {
  workspace?: string
  model?: string
  subtasks?: Subtask[]
  strategy?: { id: StrategyId; agents: number }
  stack?: StackId
}

/**
 * Drives one run at a time. The WebSocket is the single source of truth for progress; messages from
 * other runs are ignored. `GET /runs/{id}` resyncs after a reconnect or page refresh.
 * `onWorkspace` receives the folder the run actually uses (new projects get their own).
 */
export function useAgentRunner(onWorkspace?: (workspace: string) => void) {
  const onWorkspaceRef = useRef(onWorkspace)
  onWorkspaceRef.current = onWorkspace
  const runIdRef = useRef<string | null>(readActiveRun())
  const [runId, setRunIdState] = useState<string | null>(runIdRef.current)
  const [connection, setConnection] = useState<ConnectionStatus>('connecting')
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [runStatus, setRunStatus] = useState<RunStatus>('idle')
  const [taskTitle, setTaskTitle] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [runReport, setRunReport] = useState<RunReport | null>(null)
  const [runOutcome, setRunOutcome] = useState<{ synthesis: string | null; verification: Verification | null } | null>(null)

  const setRunId = (id: string | null) => {
    runIdRef.current = id
    setRunIdState(id)
  }

  const applyResult = useCallback((result: RunResult) => {
    setRunStatus((result.status as RunStatus) || 'done')
    if (result.subtasks?.length) setSubtasks(result.subtasks.map((st) => toSubtask(st, 'success')))
    setRunReport(result.report ?? null)
    setRunOutcome({ synthesis: result.synthesis ?? null, verification: result.verification ?? null })
    setErrorMessage(result.error ?? null)
    writeActiveRun(null)
  }, [])

  /** Replace local state with the backend's view of the run. */
  const resync = useCallback(async (id: string) => {
    try {
      const snap = await fetchRun(id)
      if (runIdRef.current !== id) return
      setTaskTitle(snap.task)
      onWorkspaceRef.current?.(snap.workspace)
      setLogs(snap.logs.slice(-MAX_LOGS).map(toLogEntry))
      setSubtasks(snap.subtasks.map((st) => toSubtask(st)))
      if (snap.result) applyResult(snap.result)
      else setRunStatus(snap.status as RunStatus)
    } catch {
      // The run is gone (server restarted before it finished): stop following it.
      if (runIdRef.current === id) {
        setRunId(null)
        writeActiveRun(null)
      }
    }
  }, [applyResult])

  useEffect(() => {
    const ws = new AgentWebSocket({
      onConnect: () => {
        setConnection('open')
        // Events sent while disconnected are lost; fetch what we missed.
        if (runIdRef.current) resync(runIdRef.current)
      },
      onDisconnect: () => setConnection('closed'),
      onEvent: (event: LogEvent) => {
        if (!event.run_id || event.run_id !== runIdRef.current) return
        // Worker events carry subtask_id: use them to reflect real per-subtask progress.
        if (event.subtask_id) {
          setSubtasks((prev) =>
            prev.map((st) => {
              if (st.id !== event.subtask_id) return st
              if (event.type === 'error') return { ...st, status: 'error' }
              if (st.status === 'pending' || st.status === 'queued') return { ...st, status: 'running' }
              return st
            })
          )
        }
        setLogs((prev) => appendLogs(prev, toLogEntry(event)))
      },
      onPlan: (incoming, id) => {
        if (!id || id !== runIdRef.current) return
        setRunStatus('executing')
        setSubtasks(incoming.map((st) => toSubtask(st)))
      },
      onComplete: (result, id) => {
        if (!id || id !== runIdRef.current) return
        applyResult(result)
      },
    })

    ws.connect()
    return () => ws.disconnect()
  }, [resync, applyResult])

  /** Forget the current run so another project's state never bleeds into the next one. */
  const resetRun = useCallback(() => {
    setRunId(null)
    writeActiveRun(null)
    setSubtasks([])
    setLogs([])
    setRunStatus('idle')
    setTaskTitle('')
    setErrorMessage(null)
    setRunReport(null)
    setRunOutcome(null)
  }, [])

  /** Start a run; resolves with its id and workspace (a new folder when starting a new project). */
  const launch = useCallback(async (task: string, opts: RunOptions = {}) => {
    const workspace = opts.workspace || DEFAULT_WORKSPACE
    const initial = opts.subtasks ?? []
    setRunId(null)
    setTaskTitle(task)
    setRunStatus(initial.length ? 'executing' : 'planning')
    // Nothing runs until the backend says so; later groups wait on earlier ones.
    setSubtasks(initial.map((st) => ({ ...st, status: 'pending' })))
    setErrorMessage(null)
    setRunReport(null)
    setRunOutcome(null)
    setLogs([{ id: nextLogId('l'), timestamp: now(), type: 'info', message: `Task: "${task}"` }])

    const request: RunRequest = {
      task,
      workspace,
      model: opts.model,
      strategy: opts.strategy?.id,
      agent_count: opts.strategy?.agents,
      stack: opts.stack,
    }
    if (initial.length) {
      request.subtasks = initial.map((st) => ({
        id: st.id,
        role: st.role,
        group: st.group || 1,
        instruction: st.instruction,
        depends_on: st.dependsOn,
        capability: st.capability,
        size: st.size,
      }))
    }
    try {
      const started = await startRun(request)
      setRunId(started.run_id)
      writeActiveRun(started.run_id)
      onWorkspaceRef.current?.(started.workspace)
      return { runId: started.run_id, workspace: started.workspace }
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to connect to backend runner'
      setRunStatus('error')
      setErrorMessage(errMsg)
      setLogs((prev) => appendLogs(prev, { id: nextLogId('l-err'), timestamp: now(), type: 'error', message: `Task execution failed: ${errMsg}` }))
      return null
    }
  }, [])

  const executeTask = useCallback(
    (task: string, workspace?: string, model?: string) => launch(task, { workspace, model }),
    [launch]
  )

  const executeTaskWithPlan = useCallback(
    (
      task: string,
      initialSubtasks: Subtask[],
      workspace?: string,
      model?: string,
      strategy?: { id: StrategyId; agents: number },
      stack?: StackId,
    ) => launch(task, { workspace, model, subtasks: initialSubtasks, strategy, stack }),
    [launch]
  )

  /** Follow an existing run (e.g. one started in another tab) instead of the current one. */
  const followRun = useCallback((id: string) => {
    setRunId(id)
    writeActiveRun(id)
    resync(id)
  }, [resync])

  const cancelRun = useCallback(async () => {
    const id = runIdRef.current
    if (!id) return
    try {
      await cancelRunRequest(id)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not cancel run')
    }
  }, [])

  const addEvent = useCallback((event: Partial<LogEntry>) => {
    const newEntry: LogEntry = {
      id: event.id || nextLogId('evt'),
      timestamp: event.timestamp || now(),
      type: (event.type as any) || 'info',
      role: event.role,
      subtaskId: event.subtaskId,
      model: event.model,
      message: event.message || 'System Activity Event',
      detail: event.detail,
    }
    setLogs((prev) => appendLogs(prev, newEntry))
  }, [])

  return {
    runId,
    connection,
    subtasks,
    logs,
    events: logs, // Canonical alias
    runStatus,
    taskTitle,
    errorMessage,
    runReport,
    runOutcome,
    executeTask,
    executeTaskWithPlan,
    followRun,
    cancelRun,
    addEvent,
    resetRun,
    clearError: () => setErrorMessage(null),
  }
}
