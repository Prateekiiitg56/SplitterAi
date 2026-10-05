import React, { createContext, useContext, useState } from 'react'
import { useSessions } from '../hooks/useSessions'
import { useAgentRunner } from '../hooks/useAgentRunner'
import { DEFAULT_WORKSPACE } from '../config'
import type { Subtask, LogEntry, RunStatus, SessionEntry, ConnectionStatus } from '../types'
import type { RunReport, StackId, StrategyId, Verification } from '../lib/api'

interface AppContextType {
  currentWorkspace: string
  setCurrentWorkspace: (workspace: string) => void
  /** Switch to another project (or DEFAULT_WORKSPACE for a new one), clearing the previous run. */
  openProject: (workspace: string) => void
  sessions: SessionEntry[]
  sessionsLoading: boolean
  sessionsError: string | null
  refetchSessions: () => Promise<void>
  connection: ConnectionStatus
  subtasks: Subtask[]
  logs: LogEntry[]
  events: LogEntry[]
  runStatus: RunStatus
  taskTitle: string
  errorMessage: string | null
  runId: string | null
  executeTask: (newTask: string, workspace?: string, model?: string) => Promise<StartedRun | null>
  runReport: RunReport | null
  runOutcome: { synthesis: string | null; verification: Verification | null } | null
  executeTaskWithPlan: (
    newTask: string,
    initialSubtasks: Subtask[],
    workspace?: string,
    model?: string,
    strategy?: { id: StrategyId; agents: number },
    stack?: StackId,
  ) => Promise<StartedRun | null>
  followRun: (runId: string) => void
  cancelRun: () => Promise<void>
  addEvent: (event: Partial<LogEntry>) => void
  clearError: () => void
}

type StartedRun = { runId: string; workspace: string }

const AppContext = createContext<AppContextType | undefined>(undefined)

const WORKSPACE_STORAGE_KEY = 'splitterai_current_workspace'

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentWorkspace, setCurrentWorkspaceState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY)
      return saved || DEFAULT_WORKSPACE
    } catch {
      return DEFAULT_WORKSPACE
    }
  })

  const setCurrentWorkspace = (workspace: string) => {
    setCurrentWorkspaceState(workspace)
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace)
    } catch (e) {
      console.warn('Failed to save current workspace to localStorage', e)
    }
  }

  const { sessions, loading: sessionsLoading, error: sessionsError, refetch: refetchSessions } = useSessions()

  const {
    runId,
    connection,
    subtasks,
    logs,
    events,
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
    clearError,
  } = useAgentRunner(setCurrentWorkspace)

  const openProject = (workspace: string) => {
    if (workspace === currentWorkspace) return
    if (runStatus !== 'planning' && runStatus !== 'executing') resetRun()
    setCurrentWorkspace(workspace)
  }

  return (
    <AppContext.Provider
      value={{
        currentWorkspace,
        setCurrentWorkspace,
        openProject,
        sessions,
        sessionsLoading,
        sessionsError,
        refetchSessions,
        runId,
        connection,
        subtasks,
        logs,
        events,
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
        clearError,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
