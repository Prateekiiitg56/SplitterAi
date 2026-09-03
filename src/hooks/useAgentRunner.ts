import { useState, useEffect, useCallback } from 'react'
import { AgentWebSocket, runTask } from '../lib/api'
import { DEFAULT_WORKSPACE } from '../config'
import type { Subtask, LogEntry, RunStatus, SubtaskResult, LogEvent } from '../types'

export function useAgentRunner() {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [runStatus, setRunStatus] = useState<RunStatus>('idle')
  const [taskTitle, setTaskTitle] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const ws = new AgentWebSocket({
      onEvent: (event: LogEvent) => {
        setLogs((prev) => [
          ...prev,
          {
            id: event.id || `ws-${Date.now()}`,
            timestamp:
              event.timestamp ||
              new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: (event.type as any) || 'info',
            role: (event.role as any) || undefined,
            subtaskId: event.subtask_id,
            model: event.model,
            message: event.message,
            detail: event.detail,
          },
        ])
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
    async (newTask: string, workspace: string = DEFAULT_WORKSPACE) => {
      setTaskTitle(newTask)
      setRunStatus('planning')
      setSubtasks([])
      setErrorMessage(null)
      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      setLogs((prev) => [...prev, { id: `l-${Date.now()}`, timestamp: ts, type: 'info', message: `Task: "${newTask}"` }])

      try {
        const result = await runTask({ task: newTask, workspace })
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
      } catch (err: any) {
        setRunStatus('error')
        const errMsg = err?.message || 'Failed to connect to backend runner'
        setErrorMessage(errMsg)
        setLogs((prev) => [
          ...prev,
          {
            id: `l-err-${Date.now()}`,
            timestamp: ts,
            type: 'error',
            message: `Task execution failed: ${errMsg}`,
            detail: 'Ensure backend server is running on http://localhost:8000',
          },
        ])
      }
    },
    []
  )

  const executeTaskWithPlan = useCallback(
    async (newTask: string, initialSubtasks: Subtask[], workspace: string = DEFAULT_WORKSPACE) => {
      setTaskTitle(newTask)
      setRunStatus('executing')
      setSubtasks(initialSubtasks.map((st) => ({ ...st, status: 'working' })))
      setErrorMessage(null)
      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      setLogs((prev) => [
        ...prev,
        { id: `l-${Date.now()}`, timestamp: ts, type: 'info', message: `Launching execution for confirmed task: "${newTask}" (${initialSubtasks.length} subtasks)` },
      ])

      try {
        const result = await runTask({ task: newTask, workspace })
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
        } else {
          // Keep confirmed subtasks marked complete
          setSubtasks(initialSubtasks.map((st) => ({ ...st, status: 'completed' })))
        }
      } catch (err: any) {
        setRunStatus('error')
        const errMsg = err?.message || 'Failed to connect to backend runner'
        setErrorMessage(errMsg)
        setLogs((prev) => [
          ...prev,
          {
            id: `l-err-${Date.now()}`,
            timestamp: ts,
            type: 'error',
            message: `Task execution failed: ${errMsg}`,
            detail: 'Ensure backend server is running on http://localhost:8000',
          },
        ])
      }
    },
    []
  )

  const addEvent = useCallback((event: Partial<LogEntry>) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const newEntry: LogEntry = {
      id: event.id || `evt-${Date.now()}`,
      timestamp: event.timestamp || ts,
      type: (event.type as any) || 'info',
      role: event.role,
      subtaskId: event.subtaskId,
      model: event.model,
      message: event.message || 'System Activity Event',
      detail: event.detail,
    }
    setLogs((prev) => [...prev, newEntry])
  }, [])

  return {
    subtasks,
    logs,
    events: logs, // Canonical alias
    runStatus,
    taskTitle,
    errorMessage,
    executeTask,
    executeTaskWithPlan,
    addEvent,
    clearError: () => setErrorMessage(null),
  }
}
