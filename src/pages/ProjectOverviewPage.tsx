import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import FileExplorer from '../components/FileExplorer'
import ProjectTabShell from './ProjectTabShell'
import { useApp } from '../context/AppContext'
import { fmtTime, fmtTokens, range } from '../components/StrategyPanel'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { useUI } from '../context/UIContext'
import { Button } from '../components/primitives/Button'
import { AVAILABLE_MODELS } from '../data'
import type { Subtask } from '../types'
import { StatusBadge, RoleBadge } from '../components/Badges'
import { ExternalLink, Play, Loader2, Download } from 'lucide-react'
import { API_BASE, DEFAULT_WORKSPACE } from '../config'
import { workspaceExportUrl } from '../lib/api'

const RUN_LABEL = { idle: 'Ready', planning: 'Planning', executing: 'Running', done: 'Completed', error: 'Failed' } as const
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

  const { currentWorkspace, subtasks, logs, runStatus, taskTitle, errorMessage, clearError, executeTask, runReport, runOutcome } = useApp()
  const { multiMode, setMultiMode, selectedModel, setSelectedModel } = useUI()

  const [taskInput, setTaskInput] = useState('')
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

  // Projects live in workspace_output/<folder>; the bare root means no project yet, so nothing to preview.
  const folder = currentWorkspace.split('\\').join('/').split('workspace_output/')[1]?.replace(/\/+$/, '')

  const run = () => {
    const taskToRun = taskInput.trim() || taskTitle.trim()
    if (taskToRun && !isBusy) executeTask(taskToRun, currentWorkspace, selectedModel.id)
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

            <div className="mode-toggle" role="group" aria-label="Agent mode">
              <button type="button" aria-pressed={multiMode} onClick={() => setMultiMode(true)} className={multiMode ? 'active' : ''}>
                Team
              </button>
              <button type="button" aria-pressed={!multiMode} onClick={() => setMultiMode(false)} className={!multiMode ? 'active' : ''}>
                Solo
              </button>
            </div>

            <Button
              variant={runStatus === 'done' ? 'primary' : 'ghost'}
              size="sm"
              icon={<ExternalLink size={12} />}
              disabled={!folder}
              title={folder ? `Open ${folder} in a new tab` : 'Preview is available once the project has its own folder'}
              onClick={() => folder && window.open(`${API_BASE}/preview/${encodeURIComponent(folder)}/`, '_blank')}
            >
              Preview
            </Button>
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
          </div>
        </div>

        {errorMessage && (
          <div role="alert" className="mx-6 mt-4 px-4 py-3 rounded-[10px] border border-[var(--bad)] bg-[var(--bad-quiet)] text-[var(--bad)] text-meta flex items-center justify-between gap-4 flex-shrink-0">
            <span>
              <strong>Run failed.</strong> {errorMessage}
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
            <FileExplorer workspace={currentWorkspace} />
          </div>
        </div>
      </div>
    </ProjectTabShell>
  )
}
