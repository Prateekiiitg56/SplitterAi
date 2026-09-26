import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import FileExplorer from '../components/FileExplorer'
import ProjectTabShell from './ProjectTabShell'
import { useApp } from '../context/AppContext'
import { fmtTime, fmtTokens, range } from '../components/StrategyPanel'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { useUI } from '../context/UIContext'
import { Button } from '../components/primitives/Button'
import { AVAILABLE_MODELS } from '../data'
import type { AgentRole, Subtask } from '../types'
import { StatusBadge } from '../components/Badges'
import { Cpu, ExternalLink, Play, Loader2, Zap } from 'lucide-react'
import { API_BASE } from '../config'

const RUN_LABEL = { idle: 'Ready', planning: 'Planning…', executing: 'Running', done: 'Completed', error: 'Failed' } as const

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId?: string }>()
  const location = useLocation()

  const { currentWorkspace, subtasks, logs, runStatus, taskTitle, errorMessage, clearError, executeTask, runReport, runOutcome } = useApp()
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

  const isBusy = runStatus === 'planning' || runStatus === 'executing'

  const completedCount = subtasks.filter((st) => {
    const s = (st.status as string) || ''
    return s === 'completed' || s === 'success' || s === 'done'
  }).length

  return (
    <ProjectTabShell>
      <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-transparent select-none overflow-hidden">
        {/* Top Overview Bar */}
        <div className="ov-bar">
          <div className="lead">
            <Cpu size={15} />
            <span className="t">{taskTitle || (subtasks.length ? 'Current run' : 'No task started')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              aria-label="Model"
              value={selectedModel.id}
              onChange={(e) => {
                const next = AVAILABLE_MODELS.find((m) => m.id === e.target.value)
                if (next) setSelectedModel(next)
              }}
              className="model-select"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>

            <div className="mode-toggle">
              <button
                type="button"
                onClick={() => setMultiMode(true)}
                className={multiMode ? 'active' : ''}
              >
                Team Mode
              </button>
              <button
                type="button"
                onClick={() => setMultiMode(false)}
                className={!multiMode ? 'active' : ''}
              >
                Solo Mode
              </button>
            </div>

            <Button
              variant={runStatus === 'done' ? 'primary' : 'ghost'}
              size="sm"
              icon={<ExternalLink size={12} />}
              onClick={() => window.open(`${API_BASE}/preview`, '_blank')}
            >
              {runStatus === 'done' ? 'Run & preview (localhost)' : 'Preview'}
            </Button>
          </div>
        </div>

        {/* 4-Column Stat Summary Row */}
        <div className="stat-row">
          <div className="stat-cell">
            <div className="label">Total Tasks</div>
            <div className="value">{subtasks.length}</div>
          </div>
          <div className="stat-cell">
            <div className="label">Completed</div>
            <div className="value good">
              {completedCount} of {subtasks.length}
            </div>
          </div>
          <div className="stat-cell">
            <div className="label">Active Agents</div>
            <div className="value accent">{new Set(subtasks.map((st) => st.role)).size}</div>
          </div>
          <div className="stat-cell">
            <div className="label">Status</div>
            <div
              className={`value ${runStatus === 'done' ? 'good' : ''}`}
              style={{ fontSize: '14px', marginTop: '4px', color: runStatus === 'error' ? 'var(--bad)' : undefined }}
            >
              {RUN_LABEL[runStatus]}
            </div>
          </div>
        </div>

        {/* Estimated vs actual for the last strategy run */}
        {runReport && (
          <div className="stat-row" aria-label="Execution summary">
            <div className="stat-cell">
              <div className="label">Agents · {runReport.strategy}</div>
              <div className="value">{runReport.agents}</div>
              <div className="font-mono text-micro text-[var(--faint)] truncate" title={runReport.models_used.join(', ')}>
                {runReport.models_used.length} model{runReport.models_used.length === 1 ? '' : 's'} used
              </div>
            </div>
            <div className="stat-cell">
              <div className="label">Time</div>
              <div className="value">{fmtTime(runReport.actual.time_s)}</div>
              <div className="font-mono text-micro text-[var(--faint)]">est. {range(runReport.estimated.time_s, fmtTime)}</div>
            </div>
            <div className="stat-cell">
              <div className="label">Tokens</div>
              <div className="value">{fmtTokens(runReport.actual.tokens)}</div>
              <div className="font-mono text-micro text-[var(--faint)]">est. {range(runReport.estimated.tokens, fmtTokens)}</div>
            </div>
            <div className="stat-cell">
              <div className="label">Parallel efficiency</div>
              <div className="value">
                {runReport.parallel_efficiency === null ? '-' : `${Math.round(runReport.parallel_efficiency * 100)}%`}
              </div>
              <div className="font-mono text-micro text-[var(--faint)]">
                {runReport.failed_subtasks ? `${runReport.failed_subtasks} failed` : 'all subtasks ok'}
              </div>
            </div>
          </div>
        )}

        {/* Final synthesis + verification from the execution graph */}
        {runOutcome && (runOutcome.synthesis || runOutcome.verification) && (
          <div className="mx-5 mt-3 p-3 rounded-panel border border-[var(--border-soft)] bg-[var(--panel)] space-y-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-micro text-[var(--faint)] uppercase font-bold tracking-wider">Result</span>
              {runOutcome.verification && (
                <span
                  className="font-mono text-micro uppercase"
                  style={{
                    color: runOutcome.verification.verdict === 'pass' ? 'var(--good)'
                      : runOutcome.verification.verdict === 'fail' ? 'var(--bad)' : 'var(--faint)',
                  }}
                >
                  {runOutcome.verification.verdict === 'unknown' ? 'not verified' : `verification ${runOutcome.verification.verdict}`}
                  {runOutcome.verification.repair_rounds > 0 &&
                    ` · ${runOutcome.verification.repair_rounds} repair round${runOutcome.verification.repair_rounds === 1 ? '' : 's'}`}
                </span>
              )}
            </div>
            {runOutcome.synthesis && (
              <div className="text-meta text-[var(--text-2)] max-h-48 overflow-y-auto">
                <MarkdownRenderer content={runOutcome.synthesis} />
              </div>
            )}
            {runOutcome.verification?.verdict === 'fail' && runOutcome.verification.issues && (
              <pre className="text-micro text-[var(--bad)] whitespace-pre-wrap font-mono">{runOutcome.verification.issues}</pre>
            )}
          </div>
        )}

        {/* Execution Error Banner */}
        {errorMessage && (
          <div role="alert" className="mx-5 mt-3 p-3 rounded-panel border border-[var(--bad)] bg-[var(--bad-quiet)] text-[var(--bad)] text-meta flex items-center justify-between flex-shrink-0">
            <span>
              <strong>Execution Error:</strong> {errorMessage}
            </span>
            <button type="button" onClick={clearError} aria-label="Dismiss error" className="font-bold ml-4 hover:underline">
              ✕
            </button>
          </div>
        )}

        {/* Overview Split Grid */}
        <div className="ov-split flex-1 min-h-0">
          {/* Left Pane: Active Tasks & Terminal */}
          <div className="ov-pane flex flex-col gap-4">
            {/* Task Prompt Launcher Box */}
            <div className="p-3 border border-[var(--border-soft)] rounded-panel bg-[var(--panel)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-micro text-[var(--faint)] uppercase font-bold tracking-wider">
                  TASK GOAL
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isBusy || !(taskInput.trim() || taskTitle.trim())}
                  onClick={() => {
                    const taskToRun = taskInput.trim() || taskTitle.trim()
                    if (taskToRun) executeTask(taskToRun, currentWorkspace, selectedModel.id)
                  }}
                  icon={runStatus === 'planning' || runStatus === 'executing' ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
                >
                  {runStatus === 'planning' || runStatus === 'executing' ? 'Running…' : 'Start Project'}
                </Button>
              </div>
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && taskInput.trim() && !isBusy) {
                    executeTask(taskInput.trim(), currentWorkspace, selectedModel.id)
                  }
                }}
                aria-label="Task goal"
                placeholder="Type a task prompt here (e.g. create auth API endpoints)..."
                className="w-full h-8 px-3 rounded-control bg-[var(--bg-inset)] border border-[var(--border)] text-meta text-[var(--text)] placeholder:text-[var(--faint)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Active Subtasks Group Column */}
            <div>
              <h3>
                <Zap size={13} /> Active Steps & Running Agents
              </h3>

              {groupNumbers.length === 0 ? (
                <div className="group-col">
                  <div className="tc-instr">
                    {runStatus === 'planning'
                      ? 'The planner is breaking the task into steps…'
                      : 'No steps yet. Start a task to see its plan and agents here.'}
                  </div>
                </div>
              ) : (
                groupNumbers.map((gNum) => {
                  const groupSubtasks = groupedSubtasks[gNum]
                  return (
                    <div key={gNum} className="group-col">
                      <div className="group-label">
                        STEP {gNum} ({groupSubtasks.length} AGENTS WORKING TOGETHER)
                      </div>
                      {groupSubtasks.map((st) => (
                        <div key={st.id} className="task-card" onClick={() => setSelectedAgentRole(st.role)}>
                          <div className="tc-top">
                            <span className="tc-id">{st.id}</span>
                            <StatusBadge status={st.status || 'pending'} />
                            <span className="font-mono text-micro text-[var(--faint)] ml-auto uppercase">{st.role}</span>
                          </div>
                          <div className="tc-instr">{st.instruction}</div>
                        </div>
                      ))}
                    </div>
                  )
                })
              )}
            </div>

            {/* Live Terminal Output Box */}
            <div className="flex-1 min-h-[180px]">
              <h3 className="mb-2">
                <Cpu size={13} /> Live Output
              </h3>
              <div className="term">
                {logs.length === 0 ? (
                  <div className="ln">
                    <span className="msg">No output yet. Logs stream here while a task runs.</span>
                  </div>
                ) : (
                  logs.map((log, idx) => {
                    const roleClass = (log.role || 'coder').toLowerCase()
                    return (
                      <div key={log.id || idx} className="ln">
                        <span className="ts">{log.timestamp}</span>
                        <span className={`role ${roleClass}`}>{(log.role || 'system').toUpperCase()}</span>
                        <span className="msg">{log.message}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Pane: Workspace File Tree Explorer */}
          <div className="ov-pane flex flex-col min-h-0 p-0 border-l border-[var(--border-soft)]">
            <FileExplorer workspace={currentWorkspace} />
          </div>
        </div>
      </div>
    </ProjectTabShell>
  )
}