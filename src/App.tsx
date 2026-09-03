import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import PlanView from './components/PlanView'
import LogStream from './components/LogStream'
import TaskInput from './components/TaskInput'
import HomePage from './pages/HomePage'
import AgentPage from './pages/AgentPage'
import { mockAgents, mockSessions, type Subtask, type LogEntry, type RunStatus } from './data'

// Aggregate subtasks and logs from all agents for the run view
const allSubtasks: Subtask[] = mockAgents.flatMap((a) => a.subtasks)
const allLogs: LogEntry[] = mockAgents
  .flatMap((a) => a.logs)
  .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

function RunView() {
  const [subtasks, setSubtasks] = useState<Subtask[]>(allSubtasks)
  const [logs, setLogs] = useState<LogEntry[]>(allLogs)
  const [runStatus, setRunStatus] = useState<RunStatus>('executing')
  const [multiMode, setMultiMode] = useState(true)
  const [logFilter, setLogFilter] = useState<string | null>(null)

  const currentTask = mockSessions[0]?.task ?? ''

  const handleSubmitTask = useCallback((task: string) => {
    setRunStatus('planning')
    setSubtasks([])
    setLogs([{
      id: `l-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'info',
      message: `Task: "${task}"`,
    }])
    setTimeout(() => {
      setRunStatus('executing')
      setSubtasks([{
        id: 'new-1', role: 'coder', group: 1, instruction: task,
        status: 'running', model: 'gemini/gemini-2.5-flash',
        startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        steps: 0,
      }])
    }, 1500)
  }, [])

  const filteredLogs = logFilter
    ? logs.filter((l) => l.subtaskId === logFilter || !l.subtaskId)
    : logs

  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0">
      <TopBar
        workspace="D:/projects/webapp"
        runStatus={runStatus}
        multiMode={multiMode}
        onToggleMulti={() => setMultiMode((p) => !p)}
        subtasks={subtasks}
      />
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          <PlanView subtasks={subtasks} runStatus={runStatus} task={currentTask} selectedSubtask={logFilter} onSelectSubtask={setLogFilter} />
        </div>
        <div className="w-[380px] flex-shrink-0 flex flex-col min-h-0 bg-surface">
          <LogStream logs={filteredLogs} filter={logFilter} onClearFilter={() => setLogFilter(null)} />
        </div>
      </div>
      <TaskInput onSubmit={handleSubmitTask} disabled={runStatus === 'planning' || runStatus === 'executing'} multiMode={multiMode} />
    </div>
  )
}

function HomeWithTopBar() {
  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0">
      <TopBar />
      <HomePage />
    </div>
  )
}

function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedSession, setSelectedSession] = useState('s1')
  const location = useLocation()

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#FBE9D0' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        sessions={mockSessions}
        selectedSession={selectedSession}
        onSelectSession={setSelectedSession}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
        workspace="D:/projects/webapp"
        currentPath={location.pathname}
      />
      <Routes>
        <Route path="/" element={<HomeWithTopBar />} />
        <Route path="/agent/:role" element={<AgentPage />} />
        <Route path="/run" element={<RunView />} />
      </Routes>
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
