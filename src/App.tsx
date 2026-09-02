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
  const [workspace] = useState('D:/projects/webapp')
  const [logFilter, setLogFilter] = useState<string | null>(null)

  const currentTask = mockSessions.find((s) => s.id === selectedSession)?.task ?? ''

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
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      <Sidebar
        collapsed={sidebarCollapsed}
        sessions={mockSessions}
        selectedSession={selectedSession}
        onSelectSession={setSelectedSession}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
        workspace={workspace}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <TopBar
          workspace={workspace}
          runStatus={runStatus}
          multiMode={multiMode}
          onToggleMulti={() => setMultiMode((p) => !p)}
          subtasks={subtasks}
        />

        <div className="flex flex-1 min-h-0">
          {/* Plan — takes remaining space */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border">
            <PlanView
              subtasks={subtasks}
              runStatus={runStatus}
              task={currentTask}
              selectedSubtask={logFilter}
              onSelectSubtask={setLogFilter}
            />
          </div>

          {/* Logs — fixed 380px */}
          <div className="w-[380px] flex-shrink-0 flex flex-col min-h-0 bg-surface">
            <LogStream logs={filteredLogs} filter={logFilter} onClearFilter={() => setLogFilter(null)} />
          </div>
        </div>

        <TaskInput onSubmit={handleSubmitTask} disabled={runStatus === 'planning' || runStatus === 'executing'} multiMode={multiMode} />
      </div>
    </div>
  )
}
