import { useState, useCallback, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import PlanView from './components/PlanView'
import LogStream from './components/LogStream'
import TaskInput from './components/TaskInput'
import HomePage from './pages/HomePage'
import AgentPage from './pages/AgentPage'
import IntegrationsPage from './pages/IntegrationsPage'
import { mockAgents, mockSessions, type Subtask, type LogEntry, type RunStatus } from './data'
import { AgentWebSocket, runTask, getSessions, type LogEvent, type SubtaskResult } from './lib/api'

const initialSubtasks: Subtask[] = mockAgents.flatMap((a) => a.subtasks)
const initialLogs: LogEntry[] = mockAgents.flatMap((a) => a.logs).sort((a, b) => a.timestamp.localeCompare(b.timestamp))

function RunView() {
  const location = useLocation()
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks)
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs)
  const [runStatus, setRunStatus] = useState<RunStatus>('executing')
  const [multiMode, setMultiMode] = useState(true)
  const [logFilter, setLogFilter] = useState<string | null>(null)
  const [taskTitle, setTaskTitle] = useState(mockSessions[0]?.task ?? '')

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
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLogs((prev) => [...prev, { id: `l-${Date.now()}`, timestamp: ts, type: 'info', message: `Task: "${newTask}"` }])
    try {
      const result = await runTask({ task: newTask, workspace: 'd:/CodeForces/SplitterAi' })
      setRunStatus(result.status === 'error' ? 'error' : 'done')
      if (result.subtasks) {
        setSubtasks(result.subtasks.map((st) => ({
          id: st.id, role: st.role as any, group: st.group, instruction: st.instruction,
          status: (st.status as any) || 'success', model: st.model, output: st.output, error: st.error, steps: st.steps || 0,
        })))
      }
    } catch {
      setTimeout(() => {
        setRunStatus('executing')
        setSubtasks([
          { id: 'sub-101', role: 'coder', group: 1, instruction: `Implement: ${newTask}`, status: 'running', model: 'openrouter/nvidia/nemotron-3-super-120b-a12b:free', startedAt: ts, steps: 2 },
          { id: 'sub-102', role: 'auditor', group: 2, instruction: 'Audit for security and quality', status: 'pending', model: 'gemini/gemini-3.5-flash', steps: 0 },
          { id: 'sub-103', role: 'tester', group: 2, instruction: 'Write tests and verify', status: 'pending', model: 'xai/grok-2-beta', steps: 0 },
        ])
      }, 1200)
    }
  }, [])

  useEffect(() => {
    if (location.state?.task) {
      handleSubmitTask(location.state.task)
    }
  }, [location.state?.task, handleSubmitTask])

  const filteredLogs = logFilter ? logs.filter((l) => l.subtaskId === logFilter || !l.subtaskId) : logs

  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-[#121723]">
      <TopBar workspace="D:/projects/webapp" runStatus={runStatus} multiMode={multiMode} onToggleMulti={() => setMultiMode((p) => !p)} subtasks={subtasks} />
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#242C42]">
          <PlanView subtasks={subtasks} runStatus={runStatus} task={taskTitle} selectedSubtask={logFilter} onSelectSubtask={setLogFilter} />
        </div>
        <div className="w-[380px] flex-shrink-0 flex flex-col min-h-0">
          <LogStream logs={filteredLogs} filter={logFilter} onClearFilter={() => setLogFilter(null)} />
        </div>
      </div>
      <TaskInput onSubmit={handleSubmitTask} disabled={runStatus === 'planning'} multiMode={multiMode} />
    </div>
  )
}

function HomeWithTopBar() {
  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-[#121723]">
      <TopBar />
      <HomePage />
    </div>
  )
}

function RunWithFrame() {
  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-[#121723]">
      <RunView />
    </div>
  )
}

function AgentWithFrame() {
  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-[#121723]">
      <AgentPage />
    </div>
  )
}

function IntegrationsWithFrame() {
  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-[#121723]">
      <TopBar />
      <IntegrationsPage />
    </div>
  )
}

function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedSession, setSelectedSession] = useState('s1')
  const [sessions, setSessions] = useState(mockSessions)
  const location = useLocation()

  useEffect(() => {
    getSessions().then((data) => {
      if (data && data.length > 0) {
        setSessions(data.map((s, idx) => ({
          id: `api-s${idx}`, workspace: s.workspace, task: s.task,
          status: (s.status as any) || 'done', createdAt: s.created_at || 'Just now', subtaskCount: s.subtask_count || 1,
        })))
      }
    }).catch(() => {})
  }, [])

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-[#0C1019] p-4 overflow-hidden">
      <div className="app-frame flex flex-1 h-full w-full max-w-[1760px] bg-[#121723] rounded-2xl border border-[#242C42] shadow-2xl overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          sessions={sessions}
          selectedSession={selectedSession}
          onSelectSession={setSelectedSession}
          onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
          workspace="d:/CodeForces/SplitterAi"
          currentPath={location.pathname}
        />
        <Routes>
          <Route path="/" element={<HomeWithTopBar />} />
          <Route path="/agent/:role" element={<AgentWithFrame />} />
          <Route path="/run" element={<RunWithFrame />} />
          <Route path="/integrations" element={<IntegrationsWithFrame />} />
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
