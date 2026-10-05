import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ResultPane } from '../components/ResultPane'
import { GithubPushDialog } from '../components/GithubDialogs'
import { useIntegrations } from '../hooks/useIntegrations'
import ProjectTabShell from './ProjectTabShell'
import { useApp } from '../context/AppContext'
import { fmtTime, fmtTokens, range } from '../components/StrategyPanel'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { useUI } from '../context/UIContext'
import { Button } from '../components/primitives/Button'
import type { Subtask } from '../types'
import { StatusBadge, RoleBadge } from '../components/Badges'
import { Play, Loader2, Download } from 'lucide-react'
import { DEFAULT_WORKSPACE, projectIdOf } from '../config'
import { workspaceExportUrl } from '../lib/api'

const RUN_LABEL = {
  idle: 'Ready',
  planning: 'Planning',
  executing: 'Running',
  done: 'Completed',
  unverified: 'Finished, not verified',
  error: 'Failed',
  cancelled: 'Cancelled',
} as const
const DONE = new Set(['completed', 'success', 'done'])
const FAILED = new Set(['error', 'failed'])

const segState = (st: Subtask) => {
  const s = String(st.status || '')
  if (DONE.has(s)) return 'done'
  if (FAILED.has(s)) return 'error'
  return s === 'running' ? 'running' : ''
}

export default function ProjectOverviewPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const { currentWorkspace, subtasks, logs, runStatus, taskTitle, errorMessage, clearError, executeTask, executeTaskWithPlan, cancelRun, runReport, runOutcome } = useApp()
  const { multiMode, setMultiMode, models, selectedModel, setSelectedModel } = useUI()

  const [taskInput, setTaskInput] = useState('')
  const [pushOpen, setPushOpen] = useState(false)
  const { integrations } = useIntegrations()
  const githubConnected = integrations.some((i) => i.type === 'github' && i.status === 'connected')
  const termRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const passedTask = location.state?.task
    if (passedTask && passedTask !== taskTitle && runStatus === 'idle') {
      executeTask(passedTask, currentWorkspace, selectedModel.id)
    }
  }, [location.state, taskTitle, runStatus, executeTask, currentWorkspace, selectedModel.id])

  // Follow the newest log line while a run streams.
  useEffect(() => {
    const el = termRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs.length])

  const groupedSubtasks = subtasks.reduce((acc, st) => {
    const groupNum = st.group || 1
    if (!acc[groupNum]) acc[groupNum] = []
    acc[groupNum].push(st)
    return acc
  }, {} as Record<number, Subtask[]>)
  const groupNumbers = Object.keys(groupedSubtasks).map(Number).sort((a, b) => a - b)

  const isBusy = runStatus === 'planning' || runStatus === 'executing'
  const completedCount = subtasks.filter((st) => DONE.has(String(st.status || ''))).length
  const agentCount = new Set(subtasks.map((st) => st.role)).size

  const changedFiles = Array.from(new Set(logs.filter((l) => l.type === 'file_written' && l.detail).map((l) => l.detail as string)))

  // Follow-up work runs in this project's folder; on /projects/default it starts a new project.
  const run = async () => {
    const taskToRun = taskInput.trim() || taskTitle.trim()
    if (!taskToRun || isBusy) return
    setTaskInput('')
    // Solo: one coder does the whole task with one agent; Team: the planner splits it across roles.
    const started = multiMode
      ? await executeTask(taskToRun, currentWorkspace, selectedModel.id)
      : await executeTaskWithPlan(
          taskToRun,
          [{ id: 't1', role: 'coder', group: 1, instruction: taskToRun, status: 'pending', steps: 0 }],
          currentWorkspace,
          selectedModel.id,
          { id: 'balanced', agents: 1 },
        )
    if (started && currentWorkspace === DEFAULT_WORKSPACE) navigate(`/projects/${projectIdOf(started.workspace)}`)
  }

  return (
    <ProjectTabShell>
      <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-transparent overflow-hidden">
        <div className="ov-bar">
          <span className={`run-pill ${isBusy ? 'busy' : runStatus}`} role="status">
            <span className="dot" aria-hidden="true" />
            {RUN_LABEL[runStatus]}
          </span>

          <div className="tools">
            <select
              aria-label="Model"
              value={selectedModel.id}
              onChange={(e) => {
                const next = models.find((m) => m.id === e.target.value)
                if (next) setSelectedModel(next)
              }}
              className="model-select"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>

            <div className="mode-toggle" role="group" aria-label="Agent mode">
              <button type="button" aria-pressed={multiMode} onClick={() => setMultiMode(true)} className={multiMode ? 'active' : ''} title="The planner splits the task across agent roles">
                Team
              </button>
              <button type="button" aria-pressed={!multiMode} onClick={() => setMultiMode(false)} className={!multiMode ? 'active' : ''} title="One coder agent does the whole task">
                Solo
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={<Download size={12} />}
              disabled={currentWorkspace === DEFAULT_WORKSPACE || isBusy}
              title={currentWorkspace === DEFAULT_WORKSPACE ? 'Export is available once the project has its own folder' : 'Download the project as a .zip'}
              onClick={() => { window.location.href = workspaceExportUrl(currentWorkspace) }}
            >
              Export .zip
            </Button>
            {githubConnected && (
              <Button
                variant="ghost"
                size="sm"
                disabled={currentWorkspace === DEFAULT_WORKSPACE || isBusy}
                onClick={() => setPushOpen(true)}
              >
                Push to GitHub
              </Button>
            )}
          </div>
        </div>

        {errorMessage && (
          <div role="alert" className="mx-6 mt-4 px-4 py-3 rounded-[10px] border border-[var(--bad)] bg-[var(--bad-quiet)] text-[var(--bad)] text-meta flex items-center justify-between gap-4 flex-shrink-0">
            <span>
              <strong>{runStatus === 'cancelled' ? 'Run cancelled.' : 'Run failed.'}</strong> {errorMessage}
            </span>
            <button type="button" onClick={clearError} className="font-semibold hover:underline flex-shrink-0">
              Dismiss
            </button>
          </div>
        )}

        <div className="ov-split">
          <div className="ov-pane">
            <div className="ov-composer">
              <label htmlFor="ov-task">{subtasks.length ? 'Next instruction for this project' : 'What should the agents build?'}</label>
              <textarea
                id="ov-task"
                rows={2}
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    run()
                  }
                }}
                placeholder={taskTitle || 'e.g. Build a recipe site with search and a favourites list'}
              />
              <div className="foot">
                <span className="hint">
                  <kbd>Enter</kbd> to run, <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line
                </span>
                {isBusy && (
                  <Button variant="ghost" size="sm" onClick={cancelRun}>
                    Cancel
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isBusy || !(taskInput.trim() || taskTitle.trim())}
                  onClick={run}
                  icon={isBusy ? <Loader2 size={13} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                >
                  {isBusy ? 'Running' : 'Run'}
                </Button>
              </div>
            </div>

            {subtasks.length > 0 && (
              <section className="ov-progress" aria-label="Progress">
                <div className="head">
                  <span className="big">
                    {completedCount}
                    <small>/{subtasks.length}</small>
                  </span>
                  <span className="cap">steps complete</span>
                </div>
                <div className="seg-bar" aria-hidden="true">
                  {subtasks.map((st) => (
                    <span key={st.id} className={segState(st)} />
                  ))}
                </div>
                <div className="meta-row">
                  <span>
                    Agents<b>{runReport?.agents ?? agentCount}</b>
                  </span>
                  {runReport && (
                    <>
                      <span>
                        Time<b>{fmtTime(runReport.actual.time_s)}</b>
                        <span className="est">est. {range(runReport.estimated.time_s, fmtTime)}</span>
                      </span>
                      <span>
                        Tokens<b>{fmtTokens(runReport.actual.tokens)}</b>
                        <span className="est">est. {range(runReport.estimated.tokens, fmtTokens)}</span>
                      </span>
                      {runReport.parallel_efficiency !== null && (
                        <span>
                          Parallel<b>{Math.round(runReport.parallel_efficiency * 100)}%</b>
                        </span>
                      )}
                      {runReport.failed_subtasks > 0 && <span className="text-[var(--bad)]">{runReport.failed_subtasks} failed</span>}
                    </>
                  )}
                </div>
              </section>
            )}

            {runOutcome && (runOutcome.synthesis || runOutcome.verification) && (
              <section>
                <div className="ov-section-title">
                  <h3>Result</h3>
                  {runOutcome.verification && (
                    <span
                      className="aside"
                      style={{
                        color: runOutcome.verification.verdict === 'pass' ? 'var(--good)'
                          : runOutcome.verification.verdict === 'fail' ? 'var(--bad)' : undefined,
                      }}
                    >
                      {runOutcome.verification.verdict === 'unknown' ? 'not verified' : `verification ${runOutcome.verification.verdict}`}
                      {runOutcome.verification.repair_rounds > 0 &&
                        `, ${runOutcome.verification.repair_rounds} repair round${runOutcome.verification.repair_rounds === 1 ? '' : 's'}`}
                    </span>
                  )}
                </div>
                <div className="p-4 rounded-[10px] border border-[var(--border-soft)] bg-[var(--panel)] space-y-2">
                  {runOutcome.synthesis && (
                    <div className="text-meta text-[var(--text-2)] max-h-56 overflow-y-auto">
                      <MarkdownRenderer content={runOutcome.synthesis} />
                    </div>
                  )}
                  {runOutcome.artifactUrl && (
                    <a href={runOutcome.artifactUrl} target="_blank" rel="noreferrer" className="text-micro text-[var(--accent)] underline">
                      Download the project zip (Supabase Storage)
                    </a>
                  )}
                  {runOutcome.verification?.verdict === 'fail' && runOutcome.verification.issues && (
                    <pre className="text-micro text-[var(--bad)] whitespace-pre-wrap font-mono">{runOutcome.verification.issues}</pre>
                  )}
                </div>
              </section>
            )}

            <section>
              <div className="ov-section-title">
                <h3>Plan</h3>
                {groupNumbers.length > 0 && (
                  <span className="aside">
                    {groupNumbers.length} step{groupNumbers.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              {groupNumbers.length === 0 ? (
                <div className="ov-empty">
                  {runStatus === 'planning' ? (
                    <>
                      <strong>Planning</strong>The planner is splitting the task into steps.
                    </>
                  ) : (
                    <>
                      <strong>No plan yet</strong>Describe what you want above. The plan and the agents working on it show up here.
                    </>
                  )}
                </div>
              ) : (
                <ol className="plan-steps">
                  {groupNumbers.map((gNum) => {
                    const group = groupedSubtasks[gNum]
                    const complete = group.every((st) => DONE.has(String(st.status || '')))
                    const active = !complete && group.some((st) => st.status === 'running')
                    return (
                      <li key={gNum} className={`plan-step ${complete ? 'complete' : active ? 'active' : ''}`}>
                        <span className="num" aria-hidden="true">
                          {gNum}
                        </span>
                        <div className="body">
                          <div className="step-label">
                            <b>Step {gNum}</b>
                            {group.length > 1 && `, ${group.length} agents in parallel`}
                          </div>
                          {group.map((st) => (
                            <div key={st.id} className="task-row">
                              <RoleBadge role={st.role} size="sm" />
                              <div className="tr-main">
                                <div className="tr-instr">{st.instruction}</div>
                                <div className="tr-meta">
                                  {st.id}
                                  {st.model ? ` / ${st.model}` : ''}
                                </div>
                              </div>
                              <StatusBadge status={st.status || 'pending'} size="sm" />
                            </div>
                          ))}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>

            <section>
              <div className="ov-section-title">
                <h3>Live output</h3>
                <span className="aside">
                  {logs.length} line{logs.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="term" ref={termRef} role="log" aria-live="polite">
                {logs.length === 0 ? (
                  <div className="ln">
                    <span className="msg">Logs stream here while a run is in progress.</span>
                  </div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={log.id || idx} className={`ln ${log.type === 'error' ? 'error' : ''}`}>
                      <span className="ts">{log.timestamp}</span>
                      <span className={`role ${(log.role || 'system').toLowerCase()}`}>{log.role || 'system'}</span>
                      <span className="msg">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="ov-pane !p-0 !gap-0 min-h-0">
            <ResultPane workspace={currentWorkspace} runStatus={runStatus} changedFiles={changedFiles} />
          </div>
        </div>
      </div>
      <GithubPushDialog open={pushOpen} onClose={() => setPushOpen(false)} workspace={currentWorkspace} />
    </ProjectTabShell>
  )
}
