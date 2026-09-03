import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import PlanView from './components/PlanView'
import LogStream from './components/LogStream'
import Background3D from './components/Background3D'
import AgentPage from './pages/AgentPage'
import IntegrationsPage from './pages/IntegrationsPage'
import { AIAssistantInterface } from './components/ui/ai-assistant-interface'
import { AgentWebSocket, runTask, fetchSessions } from './lib/api'
import { DEFAULT_WORKSPACE } from './config'
import type { Subtask, LogEntry, RunStatus, SubtaskResult, LogEvent, SessionEntry } from './data'

function RunView() {
  const location = useLocation()
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [runStatus, setRunStatus] = useState<RunStatus>('idle')
  const [multiMode, setMultiMode] = useState(true)
  const [logFilter, setLogFilter] = useState<string | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const ws = new AgentWebSocket({
      onEvent: (event: LogEvent) => {
        setLogs((prev) => [...prev, {
          id: event.id || `ws-${Date.now()}`,
          timestamp: event.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: (event.type as any) || 'info', role: (event.role as any) || undefined,
          subtaskId: event.subtask_id, model: event.model, message: event.message, detail: event.detail,
        }])
      },
      onPlan: (incomingSubtasks: SubtaskResult[]) => {
        setRunStatus('executing')
        setSubtasks(incomingSubtasks.map((st) => ({
          id: st.id, role: st.role as any, group: st.group, instruction: st.instruction,
          status: (st.status as any) || 'pending', model: st.model, output: st.output, error: st.error, steps: st.steps || 0,
        })))
      },
      onComplete: (result) => {
        setRunStatus(result.status === 'error' ? 'error' : 'done')
        if (result.subtasks) {
          setSubtasks(result.subtasks.map((st) => ({
            id: st.id, role: st.role as any, group: st.group, instruction: st.instruction,
            status: (st.status as any) || 'success', model: st.model, output: st.output, error: st.error, steps: st.steps || 0,
          })))
        }
      },
    })
    ws.connect()
    return () => ws.disconnect()
  }, [])

  const handleSubmitTask = useCallback(async (newTask: string) => {
    setTaskTitle(newTask)
    setRunStatus('planning')
    setSubtasks([])
    setErrorMessage(null)
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLogs((prev) => [...prev, { id: `l-${Date.now()}`, timestamp: ts, type: 'info', message: `Task: "${newTask}"` }])
    
    try {
      const result = await runTask({ task: newTask, workspace: DEFAULT_WORKSPACE })
      setRunStatus(result.status === 'error' ? 'error' : 'done')
      if (result.subtasks) {
        setSubtasks(result.subtasks.map((st) => ({
          id: st.id, role: st.role as any, group: st.group, instruction: st.instruction,
          status: (st.status as any) || 'success', model: st.model, output: st.output, error: st.error, steps: st.steps || 0,
        })))
      }
    } catch (err: any) {
      setRunStatus('error')
      const errMsg = err?.message || 'Failed to connect to backend runner'
      setErrorMessage(errMsg)
      setLogs((prev) => [...prev, {
        id: `l-err-${Date.now()}`,
        timestamp: ts,
        type: 'error',
        message: `Task execution failed: ${errMsg}`,
        detail: 'Ensure backend server is running on http://localhost:8000'
      }])
    }
  }, [])

  useEffect(() => {
    if (location.state?.task) {
      handleSubmitTask(location.state.task)
    }
  }, [location.state?.task, handleSubmitTask])

  const filteredLogs = logFilter ? logs.filter((l) => l.subtaskId === logFilter || !l.subtaskId) : logs

  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-[#121723] relative z-10">
      <TopBar workspace={DEFAULT_WORKSPACE} runStatus={runStatus} multiMode={multiMode} onToggleMulti={() => setMultiMode((p) => !p)} subtasks={subtasks} />
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#242C42]">
          {errorMessage && (
            <div className="mx-6 mt-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-[13px] flex items-center justify-between">
              <span>⚠️ <strong>Execution Error:</strong> {errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white font-bold ml-4">✕</button>
            </div>
          )}
          <PlanView subtasks={subtasks} runStatus={runStatus} task={taskTitle} selectedSubtask={logFilter} onSelectSubtask={setLogFilter} />
        </div>
        <div className="w-[380px] flex-shrink-0 flex flex-col min-h-0">
          <LogStream logs={filteredLogs} filter={logFilter} onClearFilter={() => setLogFilter(null)} />
        </div>
      </div>
    </div>
  )
}

function Layout() {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedSession, setSelectedSession] = useState('s1')
  const [sessions, setSessions] = useState<SessionEntry[]>([])

  useEffect(() => {
    fetchSessions().then((data) => {
      if (data && data.length > 0) {
        setSessions(data.map((s, idx) => ({
          id: `api-s${idx}`, workspace: s.workspace, task: s.task,
          status: (s.status as any) || 'done', createdAt: s.created_at || 'Just now', subtaskCount: s.subtask_count || 1,
        })))
      }
    }).catch(() => {})
  }, [])

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-[#0C1019] p-4 overflow-hidden relative">
      <Background3D />
      <div className="app-frame flex flex-1 h-full w-full max-w-[1760px] bg-[#121723] rounded-2xl border border-[#242C42] shadow-2xl overflow-hidden relative z-10">
        <Sidebar
          collapsed={sidebarCollapsed}
          sessions={sessions}
          selectedSession={selectedSession}
          onSelectSession={setSelectedSession}
          onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
          workspace={DEFAULT_WORKSPACE}
          currentPath={location.pathname}
        />
        <Routes>
          <Route path="/" element={<AIAssistantInterface />} />
          <Route path="/agent/:role" element={<AgentPage />} />
          <Route path="/run" element={<RunView />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}
