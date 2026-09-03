import React, { createContext, useContext } from 'react'
import { useSessions } from '../hooks/useSessions'
import { useAgentRunner } from '../hooks/useAgentRunner'
import type { Subtask, LogEntry, RunStatus, SessionEntry } from '../types'

interface AppContextType {
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
  executeTask: (newTask: string, workspace?: string) => Promise<void>
  executeTaskWithPlan: (newTask: string, initialSubtasks: Subtask[], workspace?: string) => Promise<void>
  addEvent: (event: Partial<LogEntry>) => void
  clearError: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
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
