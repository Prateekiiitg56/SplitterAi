import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import TerminalPanel from '../components/TerminalPanel'
import FileExplorer from '../components/FileExplorer'
import ProjectTabShell from './ProjectTabShell'
import { useApp } from '../context/AppContext'
import { useUI } from '../context/UIContext'
import { Button } from '../components/primitives/Button'
import { DEFAULT_WORKSPACE } from '../config'
import { ROLE_META, AVAILABLE_MODELS } from '../data'
import type { AgentRole, Subtask } from '../types'
import { AgentIcon, StatusBadge } from '../components/Badges'
import { Cpu, Zap, Loader2, Layers, ChevronDown, Play, ExternalLink } from 'lucide-react'

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId?: string }>()
  const location = useLocation()

  const { currentWorkspace, subtasks, logs, runStatus, taskTitle, errorMessage, clearError, executeTask } = useApp()
  const { multiMode, setMultiMode, selectedModel, setSelectedModel } = useUI()

  const [selectedAgentRole, setSelectedAgentRole] = useState<AgentRole>('coder')
  const [taskInput, setTaskInput] = useState('')

  useEffect(() => {
    const passedTask = location.state?.task
    if (passedTask && passedTask !== taskTitle && runStatus === 'idle') {
      executeTask(passedTask, currentWorkspace, selectedModel.id)
    }
  }, [location.state, taskTitle, runStatus, executeTask, currentWorkspace, selectedModel.id])

  const groupedSubtasks = subtasks.reduce((acc, st) => {
    const groupNum = st.group || 1
    if (!acc[groupNum]) acc[groupNum] = []
    acc[groupNum].push(st)
    return acc
  }, {} as Record<number, Subtask[]>)

  const groupNumbers = Object.keys(groupedSubtasks).map(Number).sort((a, b) => a - b)

  return (
    <ProjectTabShell>
      <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-[var(--bg)] relative z-10 font-sans text-[var(--text)] select-none overflow-hidden">
        
        {/* Top Bar */}
        <PageHeader
          icon={<Cpu size={15} />}
          title={taskTitle || 'Project Overview'}
          meta={currentWorkspace}
          actions={
            <>
              <div className="flex items-center gap-2">
                <span className="text-micro font-mono text-[var(--faint)]">Mode</span>
                <div className="flex items-center rounded-control border border-[var(--border)] overflow-hidden" role="group" aria-label="Execution mode">
                  <button
                    onClick={() => setMultiMode(true)}
                    aria-pressed={multiMode}
                    className={`h-7 px-3 font-medium text-[11.5px] transition-colors ${
                      multiMode ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'text-[var(--dim)] hover:bg-[var(--panel)] hover:text-[var(--text)]'
                    }`}
                  >
                    Multi-Agent
                  </button>
                  <button
                    onClick={() => setMultiMode(false)}
                    aria-pressed={!multiMode}
                    className={`h-7 px-3 font-medium text-[11.5px] transition-colors border-l border-[var(--border)] ${
                      !multiMode ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'text-[var(--dim)] hover:bg-[var(--panel)] hover:text-[var(--text)]'
                    }`}
                  >
                    Single Agent
                  </button>
                </div>
              </div>

              <label className="relative inline-flex items-center">
                <span className="sr-only">Model</span>
                <select
                  value={selectedModel.id}
                  onChange={(e) => {
                    const next = AVAILABLE_MODELS.find((m) => m.id === e.target.value)
                    if (next) setSelectedModel(next)
                  }}
                  className="appearance-none h-7 pl-2.5 pr-7 bg-[var(--bg-inset)] border border-[var(--border)] rounded-control font-medium text-[11.5px] text-[var(--text)] cursor-pointer hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:outline-none transition-[border-color]"
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  aria-hidden="true"
                  className="absolute right-1.5 pointer-events-none text-[var(--faint)]"
                />
              </label>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open('http://localhost:8000/preview', '_blank')}
                className="flex items-center gap-1 px-2.5 font-medium text-[11.5px] border border-[var(--border)] hover:border-[var(--accent-edge)]"
                title="Open generated website in a separate new browser tab"
              >
                <ExternalLink size={12} className="text-[var(--accent)]" />
                <span>Open Preview (New Tab)</span>
              </Button>
            </>
          }
        />

        {/* Execution Error Banner */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-3 rounded-[var(--radius)] border border-[var(--bad)] bg-[var(--bad-dim)] text-[var(--bad)] text-[12px] flex items-center justify-between flex-shrink-0">
            <span>⚠️ <strong>Execution Error:</strong> {errorMessage}</span>
            <button onClick={clearError} className="font-bold ml-4 hover:underline">✕</button>
          </div>
        )}

        {/* Command Center Layout Grid */}
        <div className="ov-layout grid grid-cols-[1fr_280px] grid-rows-[1fr_auto] gap-3 p-5 flex-1 min-h-0 min-w-0 overflow-hidden">
          
          {/* Main Content Area */}
          <div className="ov-main col-start-1 row-start-1 flex flex-col gap-3 min-h-0 overflow-y-auto">
            
            {/* Project Task & Start Execution Card */}
            <div className="master-task border border-[var(--border-soft)] rounded-[var(--radius)] p-4 bg-[var(--panel)] space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] text-[var(--faint)] tracking-wider uppercase font-bold mb-1">
                    PROJECT TASK
                  </div>
                  <h2 className="text-[14.5px] font-medium text-[var(--text)] leading-snug truncate">
                    {taskTitle || 'No active task submitted yet. Type your task below to start execution.'}
                  </h2>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => window.open('http://localhost:8000/preview', '_blank')}
                    className="flex items-center gap-1.5 px-3 font-medium text-[12.5px] border border-[var(--border)] hover:border-[var(--accent-edge)]"
                    title="Open generated website in a separate new browser page"
                  >
                    <ExternalLink size={13} className="text-[var(--accent)]" />
                    <span>Open Preview (New Tab)</span>
                  </Button>

                  <Button
                    variant="primary"
                    size="md"
                    disabled={runStatus === 'planning' || runStatus === 'executing'}
                    onClick={() => {
                      const taskToRun = taskInput.trim() || taskTitle.trim() || 'help me to build a simple home page'
                      executeTask(taskToRun, currentWorkspace, selectedModel.id)
                    }}
                    className="flex items-center gap-1.5 px-4 font-semibold text-[13px] shadow-sm"
                  >
                    {runStatus === 'planning' || runStatus === 'executing' ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Running Task…</span>
                      </>
                    ) : (
                      <>
                        <Play size={14} fill="currentColor" />
                        <span>Start Project</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Task Input Field */}
              {runStatus !== 'executing' && runStatus !== 'planning' && (
                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-soft)]">
                  <input
                    type="text"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && taskInput.trim()) {
                        executeTask(taskInput.trim(), currentWorkspace, selectedModel.id)
                      }
                    }}
                    placeholder="Type a task prompt here (e.g. help me to build a simple home page)..."
                    className="flex-1 h-8 px-3 rounded-[var(--r-control)] bg-[var(--bg-inset)] border border-[var(--border)] text-[12.5px] text-[var(--text)] placeholder:text-[var(--faint)] outline-none focus:border-[var(--accent)]"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!taskInput.trim()}
                    onClick={() => executeTask(taskInput.trim(), currentWorkspace, selectedModel.id)}
                  >
                    Run Task
                  </Button>
                </div>
              )}
            </div>

            {/* Parallel Agent DAG Visualizer */}
            <div className="dag-wrap flex-1 border border-[var(--border-soft)] rounded-[var(--radius)] p-4 bg-[var(--panel)] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-[var(--accent)]" />
                  <h3 className="text-[13px] font-semibold text-[var(--text)]">Agent Workflow & Progress</h3>
                </div>
                <span className="font-mono text-[11px] text-[var(--faint)]">Click an agent node to view output</span>
              </div>

              {/* Live Execution Progress Card */}
              {(runStatus === 'planning' || runStatus === 'executing') && (
                <div className="p-4 rounded-[var(--radius)] border border-[var(--accent-edge)] bg-[var(--panel-2)] shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--accent)]" />
                      </span>
                      <span className="font-semibold text-[13px] text-[var(--text)]">
                        {runStatus === 'planning' ? 'Planning & Decomposing Task…' : 'AI Agents Active in Backend'}
                      </span>
                    </div>
                    <span className="flex items-center gap-1.5 text-micro font-mono text-[var(--accent)]">
                      <Loader2 size={12} className="animate-spin" />
                      <span>Live Stream Active</span>
                    </span>
                  </div>

                  <div className="w-full bg-[var(--panel-3)] h-1.5 rounded-full overflow-hidden relative">
                    <div className="bg-[var(--accent)] h-full rounded-full animate-pulse w-3/4 transition-all duration-500" />
                  </div>

                  {logs.length > 0 && (
                    <div className="flex items-center gap-2 text-micro font-mono text-[var(--dim)] bg-[var(--bg-inset)] px-3 py-1.5 rounded border border-[var(--border-soft)] truncate">
                      <span className="text-[var(--faint)]">[{logs[logs.length - 1].timestamp}]</span>
                      <span className="text-[var(--text)] truncate">{logs[logs.length - 1].message}</span>
                    </div>
                  )}
                </div>
              )}

              {runStatus === 'planning' && groupNumbers.length === 0 ? (
                <div className="p-8 text-center text-[var(--dim)] space-y-2 border border-[var(--border-soft)] rounded bg-[var(--panel-2)]">
                  <Loader2 size={24} className="animate-spin text-[var(--accent)] mx-auto" />
                  <p className="text-[13px] font-medium text-[var(--text)]">Decomposing Master Task</p>
                  <p className="text-[11.5px] text-[var(--faint)] font-mono">SplitterAI LLM planner is constructing parallel worker DAG...</p>
                </div>
              ) : groupNumbers.length === 0 ? (
                <div className="p-8 text-center text-[var(--faint)] space-y-2 border border-[var(--border-soft)] rounded bg-[var(--panel-2)] font-mono text-[12px]">
                  <Layers size={24} className="mx-auto opacity-40 text-[var(--faint)]" />
                  <p className="text-[13px] font-medium text-[var(--dim)]">No Active Agent Visualizer Nodes</p>
                  <p className="text-[11px]">When a task is launched, parallel worker nodes will render side-by-side below.</p>
                </div>
              ) : (
                groupNumbers.map((gNum) => {
                  const groupSubtasks = groupedSubtasks[gNum]
                  return (
                    <div key={gNum} className="space-y-2">
                      <div className="dag-group-label font-mono text-[10px] text-[var(--faint)] tracking-wider uppercase font-bold">
                        GROUP {gNum} (PARALLEL EXECUTION — {groupSubtasks.length} WORKERS)
                      </div>

                      <div className="dag-row flex flex-wrap gap-3">
                        {groupSubtasks.map((st) => {
                          const meta = ROLE_META[st.role] || ROLE_META.coder
                          const isSelected = selectedAgentRole === st.role
                          const isWorking = st.status === 'running' || st.status === 'working'
                          const isDone = st.status === 'success' || st.status === 'completed'

                          return (
                            <div
                              key={st.id}
                              onClick={() => setSelectedAgentRole(st.role)}
                              className={`dag-node w-[180px] border rounded-[var(--radius)] p-3 bg-[var(--panel-2)] flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                                isSelected ? 'border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]' : 'border-[var(--border-soft)] hover:border-[var(--border)]'
                              } ${isWorking ? 'working border-[var(--accent-edge)]' : isDone ? 'completed border-[var(--good-quiet)]' : ''}`}
                            >
                              <div className="dag-node-head flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <AgentIcon role={st.role} size={13} className="text-[var(--accent)]" />
                                  <span className="dag-node-name font-medium text-[12px] text-[var(--text)]">{meta.label}</span>
                                </div>
                                <StatusBadge status={st.status || 'pending'} />
                              </div>

                              <p className="dag-node-task text-[11px] text-[var(--dim)] line-clamp-2 leading-relaxed">
                                {st.instruction}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Panel: File Explorer */}
          <div className="ov-files col-start-2 row-start-1 row-span-2 min-h-0 border border-[var(--border-soft)] rounded-[var(--radius)] bg-[var(--panel)] overflow-hidden">
            <FileExplorer workspace={currentWorkspace} />
          </div>

          {/* Bottom Panel: Terminal */}
          <div className="ov-terminal col-start-1 row-start-2 border border-[var(--border-soft)] rounded-[var(--radius)] bg-[var(--panel)] overflow-hidden">
            <TerminalPanel logs={logs} />
          </div>
        </div>
      </div>
    </ProjectTabShell>
  )
}
