import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import TerminalPanel from '../components/TerminalPanel'
import FileExplorer from '../components/FileExplorer'
import ProjectTabShell from './ProjectTabShell'
import { useApp } from '../context/AppContext'
import { useUI } from '../context/UIContext'
import { useWorkspaceFiles } from '../hooks/useWorkspaceFiles'
import { DEFAULT_WORKSPACE } from '../config'
import { ROLE_META } from '../data'
import type { AgentRole, Subtask } from '../types'
import { AgentIcon, StatusBadge } from '../components/Badges'
import { Cpu, Zap, Loader2, Layers } from 'lucide-react'

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId?: string }>()
  const location = useLocation()
  const navigate = useNavigate()

  const { subtasks, logs, runStatus, taskTitle, errorMessage, clearError, executeTask } = useApp()
  const { multiMode, setMultiMode } = useUI()
  const { fileTree: workspaceFiles } = useWorkspaceFiles()

  const [selectedAgentRole, setSelectedAgentRole] = useState<AgentRole>('coder')

  useEffect(() => {
    const passedTask = location.state?.task
    if (passedTask && passedTask !== taskTitle && runStatus === 'idle') {
      executeTask(passedTask)
    }
  }, [location.state, taskTitle, runStatus, executeTask])

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
        <TopBar
          workspace="SplitterAI Workspace"
          runStatus={runStatus}
          multiMode={multiMode}
          onToggleMulti={() => setMultiMode((p) => !p)}
          subtasks={subtasks}
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
          <div className="ov-main grid-row-[1/2] grid-col-[1/2] flex flex-col gap-3 min-h-0 overflow-y-auto">
            
            {/* Master Task Instruction Card */}
            <div className="master-task border border-[var(--border-soft)] rounded-[var(--radius)] p-4 flex items-center justify-between gap-4 bg-[var(--panel)]">
              <div className="master-task-left min-w-0">
                <div className="master-task-label font-mono text-[10px] text-[var(--faint)] tracking-wider uppercase font-bold mb-1">
                  MASTER TASK INSTRUCTION
                </div>
                <h2 className="master-task-text text-[14.5px] font-medium text-[var(--text)] leading-snug truncate">
                  {taskTitle || 'Submit a prompt on Home or click "Start Project" to launch master task execution.'}
                </h2>
              </div>

              <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[var(--panel-2)] border border-[var(--border)] text-[var(--dim)] flex-shrink-0">
                {subtasks.length > 0 ? `${subtasks.length} Subtasks Decomposed` : 'Awaiting Task'}
              </span>
            </div>

            {/* Parallel Agent DAG Visualizer */}
            <div className="dag-wrap flex-1 border border-[var(--border-soft)] rounded-[var(--radius)] p-4 bg-[var(--panel)] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-[var(--accent)]" />
                  <h3 className="text-[13px] font-semibold text-[var(--text)]">Parallel Multi-Agent Execution DAG</h3>
                </div>
                <span className="font-mono text-[11px] text-[var(--faint)]">Click a node to inspect details</span>
              </div>

              {runStatus === 'planning' ? (
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
                              } ${isWorking ? 'working border-[#1B3550]' : isDone ? 'completed border-[#12352F]' : ''}`}
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
          <div className="ov-files grid-row-[1/3] grid-col-[2/3] min-h-0 border border-[var(--border-soft)] rounded-[var(--radius)] bg-[var(--panel)] overflow-hidden">
            <FileExplorer workspace={DEFAULT_WORKSPACE} />
          </div>

          {/* Bottom Panel: Terminal */}
          <div className="ov-terminal grid-row-[2/3] grid-col-[1/2] border border-[var(--border-soft)] rounded-[var(--radius)] bg-[var(--panel)] overflow-hidden">
            <TerminalPanel />
          </div>
        </div>
      </div>
    </ProjectTabShell>
  )
}
