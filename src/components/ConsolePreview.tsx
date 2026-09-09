import { useState, useEffect } from 'react'
import { AgentIcon, StatusDot } from './Badges'
import type { AgentRole } from '../types'
import { cx } from '../lib/cx'

/**
 * ConsolePreview — a non-interactive, looping mockup of the SplitterAI console.
 *
 * Shows a browser-chrome frame containing a simplified version of the real
 * interface: subtask rows cycling through states and scrolling log lines.
 * Driven entirely by local state timers — no backend calls.
 */

interface DemoSubtask {
  id: string
  role: AgentRole
  label: string
  instruction: string
}

const DEMO_SUBTASKS: DemoSubtask[] = [
  { id: 'st-1', role: 'planner', label: 'Planner', instruction: 'Decompose task into DAG subtasks' },
  { id: 'st-2', role: 'coder', label: 'Coder α', instruction: 'Implement JWT auth endpoint' },
  { id: 'st-3', role: 'coder', label: 'Coder β', instruction: 'Build login form components' },
  { id: 'st-4', role: 'auditor', label: 'Auditor', instruction: 'Security & code quality scan' },
  { id: 'st-5', role: 'tester', label: 'Tester', instruction: 'Run pytest suite & verify' },
]

const DEMO_LOGS = [
  { time: '10:00:12', type: 'PLAN', msg: 'Task decomposed into 3 groups, 5 subtasks' },
  { time: '10:00:14', type: 'START', msg: 'Group 1: Planner agent started' },
  { time: '10:00:28', type: 'TOOL', msg: 'read_file("src/auth/config.ts") → 142 lines' },
  { time: '10:01:03', type: 'MODEL', msg: 'gemini-3.5-flash → 847 tokens generated' },
  { time: '10:01:15', type: 'TOOL', msg: 'write_file("src/api/login.ts") → created' },
  { time: '10:01:44', type: 'RESP', msg: 'JWT middleware implemented with RS256' },
  { time: '10:02:01', type: 'START', msg: 'Group 2: Coder α, Coder β in parallel' },
  { time: '10:02:18', type: 'TOOL', msg: 'shell("pytest tests/ -v") → 12 passed' },
  { time: '10:02:34', type: 'INFO', msg: 'All subtasks completed successfully' },
]

type SubtaskState = 'queued' | 'working' | 'completed'

const STATUS_CYCLE: SubtaskState[] = ['queued', 'working', 'completed']

export default function ConsolePreview() {
  const [phase, setPhase] = useState(0)
  const [logOffset, setLogOffset] = useState(0)

  // Cycle subtask states every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setPhase((p) => (p + 1) % (STATUS_CYCLE.length * DEMO_SUBTASKS.length))
    }, 1200)
    return () => clearInterval(timer)
  }, [])

  // Scroll logs
  useEffect(() => {
    const timer = setInterval(() => {
      setLogOffset((o) => (o + 1) % DEMO_LOGS.length)
    }, 2200)
    return () => clearInterval(timer)
  }, [])

  const getSubtaskStatus = (idx: number): SubtaskState => {
    // Each subtask transitions through the cycle with a stagger
    const staggeredPhase = Math.max(0, phase - idx * 2)
    return STATUS_CYCLE[Math.min(staggeredPhase, STATUS_CYCLE.length - 1)]
  }

  const visibleLogs = []
  for (let i = 0; i < 6; i++) {
    visibleLogs.push(DEMO_LOGS[(logOffset + i) % DEMO_LOGS.length])
  }

  return (
    <div className="w-full max-w-[800px] mx-auto">
      {/* Browser chrome frame */}
      <div
        className="rounded-float border border-[var(--border)] overflow-hidden shadow-[var(--shadow-float)]"
        style={{ backgroundColor: 'var(--panel)' }}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 h-8 px-3 border-b border-[var(--border-soft)] bg-[var(--panel-2)]">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
          </div>
          {/* URL bar */}
          <div className="flex-1 flex items-center justify-center">
            <span className="px-3 py-0.5 rounded-control bg-[var(--bg-inset)] border border-[var(--border-soft)] text-micro font-mono text-[var(--faint)] truncate max-w-[240px]">
              localhost:5173/projects/default
            </span>
          </div>
          <div className="w-[46px]" /> {/* Balance the traffic lights */}
        </div>

        {/* Console content */}
        <div className="flex min-h-[280px] max-h-[340px]">
          {/* Left: subtask list */}
          <div className="flex-1 border-r border-[var(--border-soft)] p-2.5 space-y-1">
            <div className="flex items-center gap-2 px-2 pb-1.5 border-b border-[var(--border-soft)]">
              <span className="text-meta font-medium text-[var(--text-2)]">Subtasks</span>
              <span className="font-mono text-micro text-[var(--faint)] tabular-nums">{DEMO_SUBTASKS.length}</span>
            </div>
            {DEMO_SUBTASKS.map((st, idx) => {
              const status = getSubtaskStatus(idx)
              return (
                <div
                  key={st.id}
                  className={cx(
                    'flex items-center gap-2 px-2 py-1.5 rounded-control',
                    'transition-colors duration-[var(--d-base)] ease-standard',
                    status === 'working' ? 'bg-[var(--panel-2)]' : '',
                  )}
                >
                  <StatusDot status={status} />
                  <AgentIcon role={st.role} size={12} className="text-[var(--dim)] flex-shrink-0" />
                  <span className="text-micro text-[var(--text)] truncate flex-1">{st.instruction}</span>
                  <span
                    className={cx(
                      'text-micro font-mono flex-shrink-0',
                      status === 'completed' ? 'text-[var(--good)]' :
                      status === 'working' ? 'text-[var(--accent)]' :
                      'text-[var(--faint)]',
                    )}
                  >
                    {status}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Right: log feed */}
          <div className="w-[38%] min-w-[200px] p-2.5 bg-[var(--bg-inset)] overflow-hidden">
            <div className="flex items-center gap-2 px-1 pb-1.5 border-b border-[var(--border-soft)]">
              <span className="text-meta font-medium text-[var(--text-2)]">Event log</span>
            </div>
            <div className="mt-1.5 space-y-0.5 font-mono">
              {visibleLogs.map((log, i) => (
                <div key={`${log.time}-${i}`} className="flex items-start gap-1.5 text-micro leading-relaxed">
                  <span className="text-[var(--faint)] flex-shrink-0 tabular-nums">{log.time}</span>
                  <span
                    className={cx(
                      'flex-shrink-0 font-medium',
                      log.type === 'TOOL' ? 'text-[var(--accent)]' :
                      log.type === 'MODEL' || log.type === 'RESP' ? 'text-[var(--wait)]' :
                      log.type === 'START' || log.type === 'PLAN' ? 'text-[var(--good)]' :
                      log.type === 'INFO' ? 'text-[var(--good)]' :
                      'text-[var(--dim)]',
                    )}
                  >
                    {log.type}
                  </span>
                  <span className="text-[var(--text-2)] truncate">{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
