import React, { createContext, useContext, useState } from 'react'
import { useSessions } from '../hooks/useSessions'
import { useAgentRunner } from '../hooks/useAgentRunner'
import { DEFAULT_WORKSPACE } from '../config'
import type { Subtask, LogEntry, RunStatus, SessionEntry } from '../types'

interface AppContextType {
  currentWorkspace: string
  setCurrentWorkspace: (workspace: string) => void
  sessions: SessionEntry[]
  sessionsLoading: boolean
  sessionsError: string | null
  refetchSessions: () => Promise<void>
  subtasks: Subtask[]
  logs: LogEntry[]
  events: LogEntry[]
  runStatus: RunStatus
  taskTitle: string
  errorMessage: string | null
  executeTask: (newTask: string, workspace?: string, model?: string) => Promise<void>
  executeTaskWithPlan: (newTask: string, initialSubtasks: Subtask[], workspace?: string, model?: string) => Promise<void>
  addEvent: (event: Partial<LogEntry>) => void
  clearError: () => void
}

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
    subtasks,
    logs,
    events,
    runStatus,
    taskTitle,
    errorMessage,
    executeTask,
    executeTaskWithPlan,
    addEvent,
    clearError,
  } = useAgentRunner()

  return (
    <AppContext.Provider
      value={{
        currentWorkspace,
        setCurrentWorkspace,
        sessions,
        sessionsLoading,
        sessionsError,
        refetchSessions,
        subtasks,
        logs,
        events,
        runStatus,
        taskTitle,
        errorMessage,
        executeTask,
        executeTaskWithPlan,
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
