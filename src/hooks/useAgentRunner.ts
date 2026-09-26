import { useState, useEffect, useCallback } from 'react'
import { AgentWebSocket, runTask } from '../lib/api'
import type { RunReport, StrategyId, Verification } from '../lib/api'
import { DEFAULT_WORKSPACE } from '../config'
import type { Subtask, LogEntry, RunStatus, SubtaskResult, LogEvent, ConnectionStatus } from '../types'

/** Keep the live log bounded so a long run can't grow memory/DOM without limit. */
const MAX_LOGS = 2000
let logSeq = 0
const nextLogId = (prefix: string) => `${prefix}-${Date.now()}-${++logSeq}`
const appendLogs = (prev: LogEntry[], ...entries: LogEntry[]) => {
  const next = [...prev, ...entries]
  return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next
}

export function useAgentRunner() {
  const [connection, setConnection] = useState<ConnectionStatus>('connecting')
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [runStatus, setRunStatus] = useState<RunStatus>('idle')
  const [taskTitle, setTaskTitle] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [runReport, setRunReport] = useState<RunReport | null>(null)
  const [runOutcome, setRunOutcome] = useState<{ synthesis: string | null; verification: Verification | null } | null>(null)

  useEffect(() => {
    const ws = new AgentWebSocket({
      onConnect: () => setConnection('open'),
      onDisconnect: () => setConnection('closed'),
      onEvent: (event: LogEvent) => {
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
        setLogs((prev) =>
          appendLogs(prev, {
            // Always a local id: backend ids are not guaranteed unique and are used as React keys.
            id: nextLogId('ws'),
            timestamp:
              event.timestamp ||
              new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: (event.type as any) || 'info',
            role: (event.role as any) || undefined,
            subtaskId: event.subtask_id,
            model: event.model,
            message: event.message,
            detail: event.detail,
          })
        )
      },
      onPlan: (incomingSubtasks: SubtaskResult[]) => {
        setRunStatus('executing')
        setSubtasks(
          incomingSubtasks.map((st) => ({
            id: st.id,
            role: st.role as any,
            group: st.group,
            instruction: st.instruction,
            status: (st.status as any) || 'pending',
            model: st.model,
            output: st.output,
            error: st.error,
            steps: st.steps || 0,
          }))
        )
      },
      onComplete: (result) => {
        setRunStatus(result.status === 'error' ? 'error' : 'done')
        if (result.subtasks) {
          setSubtasks(
            result.subtasks.map((st) => ({
              id: st.id,
              role: st.role as any,
              group: st.group,
              instruction: st.instruction,
              status: (st.status as any) || 'success',
              model: st.model,
              output: st.output,
              error: st.error,
              steps: st.steps || 0,
            }))
          )
        }
      },
    })

    ws.connect()
    return () => ws.disconnect()
  }, [])

  const executeTask = useCallback(
    async (newTask: string, workspace: string = DEFAULT_WORKSPACE, model?: string) => {
      setTaskTitle(newTask)
      setRunStatus('planning')
      setSubtasks([])
      setErrorMessage(null)
      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      setLogs((prev) => appendLogs(prev, { id: nextLogId('l'), timestamp: ts, type: 'info', message: `Task: "${newTask}"` }))

      try {
        const result = await runTask({ task: newTask, workspace, model })
        setRunStatus(result.status === 'error' ? 'error' : 'done')
        setRunReport(null)
        setRunOutcome({ synthesis: result.synthesis ?? null, verification: result.verification ?? null })
        if (result.subtasks) {
          setSubtasks(
            result.subtasks.map((st) => ({
              id: st.id,
              role: st.role as any,
              group: st.group,
              instruction: st.instruction,
              status: (st.status as any) || 'success',
              model: st.model,
              output: st.output,
              error: st.error,
              steps: st.steps || 0,
            }))
          )
        }
      } catch (err: any) {
        setRunStatus('error')
        const errMsg = err?.message || 'Failed to connect to backend runner'
        setErrorMessage(errMsg)
        setLogs((prev) =>
          appendLogs(prev, {
            id: nextLogId('l-err'),
            timestamp: ts,
            type: 'error',
            message: `Task execution failed: ${errMsg}`,
          })
        )
      }
    },
    []
  )

  const executeTaskWithPlan = useCallback(
    async (
      newTask: string,
      initialSubtasks: Subtask[],
      workspace: string = DEFAULT_WORKSPACE,
      model?: string,
      strategy?: { id: StrategyId; agents: number },
    ) => {
      setTaskTitle(newTask)
      setRunReport(null)
      setRunOutcome(null)
      setRunStatus('executing')
      // Nothing runs until the backend says so; later groups wait on earlier ones.
      setSubtasks(initialSubtasks.map((st) => ({ ...st, status: 'pending' })))
      setErrorMessage(null)
      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      setLogs((prev) =>
        appendLogs(prev, { id: nextLogId('l'), timestamp: ts, type: 'info', message: `Launching execution for confirmed task: "${newTask}" (${initialSubtasks.length} subtasks)` })
      )

      try {
        const result = await runTask({
          task: newTask,
          workspace,
          model,
          subtasks: initialSubtasks.map((st) => ({
            id: st.id,
            role: st.role,
            group: st.group || 1,
            instruction: st.instruction,
            status: st.status,
            depends_on: st.dependsOn,
            capability: st.capability,
            size: st.size,
          })),
          strategy: strategy?.id,
          agent_count: strategy?.agents,
        })
        setRunReport(result.report ?? null)
        setRunOutcome({ synthesis: result.synthesis ?? null, verification: result.verification ?? null })
        setRunStatus(result.status === 'error' ? 'error' : 'done')
        if (result.subtasks && result.subtasks.length > 0) {
          setSubtasks(
            result.subtasks.map((st) => ({
              id: st.id,
              role: st.role as any,
              group: st.group,
              instruction: st.instruction,
              status: (st.status as any) || 'success',
              model: st.model,
              output: st.output,
              error: st.error,
              steps: st.steps || 0,
            }))
          )
        }
      } catch (err: any) {
        setRunStatus('error')
        const errMsg = err?.message || 'Failed to connect to backend runner'
        setErrorMessage(errMsg)
        setLogs((prev) =>
          appendLogs(prev, {
            id: nextLogId('l-err'),
            timestamp: ts,
            type: 'error',
            message: `Task execution failed: ${errMsg}`,
          })
        )
      }
    },
    []
  )

  const addEvent = useCallback((event: Partial<LogEntry>) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const newEntry: LogEntry = {
      id: event.id || nextLogId('evt'),
      timestamp: event.timestamp || ts,
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
    addEvent,
    clearError: () => setErrorMessage(null),
  }
}
