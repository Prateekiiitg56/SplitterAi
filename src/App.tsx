import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import PlanView from './components/PlanView'
import LogStream from './components/LogStream'
import TaskInput from './components/TaskInput'
import { mockSubtasks, mockLogs, mockSessions, type Subtask, type LogEntry, type RunStatus } from './data'

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedSession, setSelectedSession] = useState('s1')
  const [subtasks, setSubtasks] = useState<Subtask[]>(mockSubtasks)
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs)
  const [runStatus, setRunStatus] = useState<RunStatus>('executing')
  const [multiMode, setMultiMode] = useState(true)
  const [workspace, setWorkspace] = useState('D:/projects/webapp')
  const [logFilter, setLogFilter] = useState<string | null>(null) // subtask ID filter

  const currentTask = mockSessions.find((s) => s.id === selectedSession)?.task ?? ''

  const handleSubmitTask = useCallback((task: string) => {
    // In real app → POST to /run or invoke orchestrator
    setRunStatus('planning')
    setSubtasks([])
    setLogs([
      {
        id: `l-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'info',
        message: `New task submitted: "${task}"`,
      },
    ])
    // Simulate planning phase
    setTimeout(() => {
      setRunStatus('executing')
      setSubtasks([
        {
          id: 'new-1',
          role: 'coder',
          group: 1,
          instruction: task,
          status: 'running',
          model: 'gemini/gemini-2.5-flash',
          startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          steps: 0,
        },
      ])
    }, 1500)
  }, [])

  const handleSelectSubtask = useCallback((subtaskId: string | null) => {
    setLogFilter(subtaskId)
  }, [])

  const filteredLogs = logFilter
    ? logs.filter((l) => l.subtaskId === logFilter || l.type === 'group_start' || l.type === 'group_end' || l.type === 'info' || l.type === 'plan_generated')
    : logs

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      {/* Sidebar — sessions & config */}
      <Sidebar
        collapsed={sidebarCollapsed}
        sessions={mockSessions}
        selectedSession={selectedSession}
        onSelectSession={setSelectedSession}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
        workspace={workspace}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar — workspace path, run status, settings */}
        <TopBar
          workspace={workspace}
          runStatus={runStatus}
          multiMode={multiMode}
          onToggleMulti={() => setMultiMode((p) => !p)}
          subtasks={subtasks}
        />

        {/* Main split: Plan view (left) + Log stream (right) */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Plan visualization — subtask groups & cards */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border">
            <PlanView
              subtasks={subtasks}
              runStatus={runStatus}
              task={currentTask}
              selectedSubtask={logFilter}
              onSelectSubtask={handleSelectSubtask}
            />
          </div>

          {/* Real-time log stream */}
          <div className="w-[420px] flex-shrink-0 flex flex-col min-h-0 bg-surface">
            <LogStream
              logs={filteredLogs}
              filter={logFilter}
              onClearFilter={() => setLogFilter(null)}
            />
          </div>
        </div>

        {/* Task input bar — fixed at bottom */}
        <TaskInput
          onSubmit={handleSubmitTask}
          disabled={runStatus === 'planning' || runStatus === 'executing'}
          multiMode={multiMode}
        />
      </div>
    </div>
  )
}
