import { useState } from 'react'
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Layers,
  Activity,
  ArrowRight,
} from 'lucide-react'
import type { Subtask, RunStatus } from '../types'
import { AgentBadge, AgentIcon, StatusIcon } from './Badges'

interface PlanViewProps {
  subtasks: Subtask[]
  runStatus: RunStatus
  task: string
  selectedSubtask: string | null
  onSelectSubtask: (id: string | null) => void
}

export default function PlanView({
  subtasks,
  runStatus,
  task,
  selectedSubtask,
  onSelectSubtask,
}: PlanViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([1, 2]))
  const [zoomLevel, setZoomLevel] = useState(100)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set(['sub-1']))

  const toggleGroup = (groupNum: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupNum)) next.delete(groupNum)
      else next.add(groupNum)
      return next
    })
  }

  const toggleStepDetail = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const groups = subtasks.reduce<Record<number, Subtask[]>>((acc, st) => {
    ;(acc[st.group] ??= []).push(st)
    return acc
  }, {})
  const groupNums = Object.keys(groups).map(Number).sort((a, b) => a - b)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--bg)] text-[var(--text)] font-sans select-none">

      {/* ── 1. ACTIVE TASK INSTRUCTION HEADER ─────────────────────── */}
      <div className="rounded-panel border border-[var(--border-soft)] bg-[var(--panel)] p-5 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent)]">
                ACTIVE AGENT INSTRUCTION
              </span>
              <span className="text-[var(--faint)]">·</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--good-quiet)] border border-[var(--good-quiet)] text-[var(--good)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--good)] animate-pulse" />
                {runStatus.toUpperCase()}
              </span>
            </div>
            <h1 className="text-[18px] font-bold text-[var(--text)] leading-snug tracking-tight">
              {task || 'No active task run'}
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="px-3 py-1.5 rounded-control bg-[var(--bg-inset)] border border-[var(--border)] text-right">
              <p className="text-[10px] font-mono text-[var(--faint)] uppercase">SUBTASKS</p>
              <p className="text-[13px] font-mono font-bold text-[var(--text)]">{subtasks.length} Parallel Nodes</p>
            </div>
            <div className="px-3 py-1.5 rounded-control bg-[var(--bg-inset)] border border-[var(--border)] text-right">
              <p className="text-[10px] font-mono text-[var(--faint)] uppercase">MODEL CHAIN</p>
              <p className="text-[13px] font-mono font-bold text-[var(--accent)] truncate max-w-[140px]">
                {subtasks.length > 0
                  ? Array.from(new Set(subtasks.map((s) => s.model || 'gemini-3.5-flash').filter(Boolean))).join(', ')
                  : 'gemini-3.5-flash'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. EXECUTION DAG WORKFLOW GRAPH ───────────────────────── */}
      <div className="rounded-panel border border-[var(--border-soft)] bg-[var(--panel)] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity size={18} className="text-[var(--accent)]" />
            <h2 className="text-[15px] font-bold text-[var(--text)]">Execution DAG Workflow Graph</h2>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-control bg-[var(--accent-quiet)] text-[var(--accent)] border border-[var(--accent-edge)] font-semibold">
              Parallel Execution DAG
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-mono text-[var(--dim)]">
              Group 1 (Parallel) → Group 2 (Sequential)
            </span>
          </div>
        </div>

        {/* Dark Grid Canvas Container */}
        <div
          className="relative min-h-[220px] p-6 rounded-control border border-[var(--border)] bg-[var(--bg-inset)] overflow-hidden flex flex-col justify-center transition-all shadow-inner"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'center center',
          }}
        >
          {subtasks.length > 0 ? (
            <div className="flex items-center justify-center gap-10 py-4 overflow-x-auto">

              {/* Planner Node */}
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="w-12 h-12 rounded-control bg-[var(--panel-2)] border border-[var(--accent-edge)] shadow-md flex items-center justify-center text-[var(--accent)]">
                  <Layers size={22} />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-bold text-[var(--text)]">Planner</p>
                  <p className="text-[10.5px] font-mono text-[var(--dim)]">DAG Dispatch</p>
                </div>
              </div>

              <ArrowRight size={18} className="text-[var(--faint)] flex-shrink-0" />

              {/* Group 1 Workers (Parallel) */}
              <div className="flex flex-col gap-3 flex-shrink-0">
                <span className="text-[10px] font-mono font-bold text-[var(--dim)] uppercase tracking-wider text-center">
                  GROUP 1 (PARALLEL)
                </span>
                {subtasks.filter((s) => s.group === 1).map((st) => {
                  const isSelected = selectedSubtask === st.id
                  return (
                    <button
                      key={st.id}
                      onClick={() => onSelectSubtask(isSelected ? null : st.id)}
                      className={`flex items-center gap-3 p-3 rounded-control border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent-quiet)] ring-2 ring-[var(--accent-edge)] shadow-md'
                          : 'border-[var(--border)] bg-[var(--panel)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-control bg-[var(--bg-inset)] flex items-center justify-center flex-shrink-0">
                        <AgentIcon role={st.role} className="w-4 h-4 text-[var(--accent)]" />
                      </div>
                      <div className="min-w-0 pr-2">
                        <p className="text-[12.5px] font-semibold text-[var(--text)] truncate max-w-[180px]">
                          {st.instruction}
                        </p>
                        <p className="text-[10.5px] font-mono text-[var(--dim)] capitalize">
                          {st.role} · {st.status}
                        </p>
                      </div>
                      <StatusIcon status={st.status} />
                    </button>
                  )
                })}
              </div>

              <ArrowRight size={18} className="text-[var(--faint)] flex-shrink-0" />

              {/* Group 2 Workers */}
              <div className="flex flex-col gap-3 flex-shrink-0">
                <span className="text-[10px] font-mono font-bold text-[var(--dim)] uppercase tracking-wider text-center">
                  GROUP 2 (VERIFICATION)
                </span>
                {subtasks.filter((s) => s.group === 2).map((st) => {
                  const isSelected = selectedSubtask === st.id
                  return (
                    <button
                      key={st.id}
                      onClick={() => onSelectSubtask(isSelected ? null : st.id)}
                      className={`flex items-center gap-3 p-3 rounded-control border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent-quiet)] ring-2 ring-[var(--accent-edge)] shadow-md'
                          : 'border-[var(--border)] bg-[var(--panel)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-control bg-[var(--bg-inset)] flex items-center justify-center flex-shrink-0">
                        <AgentIcon role={st.role} className="w-4 h-4 text-[var(--accent)]" />
                      </div>
                      <div className="min-w-0 pr-2">
                        <p className="text-[12.5px] font-semibold text-[var(--text)] truncate max-w-[180px]">
                          {st.instruction}
                        </p>
                        <p className="text-[10.5px] font-mono text-[var(--dim)] capitalize">
                          {st.role} · {st.status}
                        </p>
                      </div>
                      <StatusIcon status={st.status} />
                    </button>
                  )
                })}
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--faint)]">
              <Layers size={28} className="mb-2 opacity-40" />
              <p className="text-[13px] font-semibold text-[var(--text)]">No active execution graph</p>
              <p className="text-[11.5px] text-[var(--dim)]">Submit a task from the Home prompt to decompose subtasks</p>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 p-1 rounded-full bg-[var(--panel)] border border-[var(--border)] shadow-sm">
            <button
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              className="p-1 rounded-full hover:bg-[var(--panel-3)] text-[var(--dim)] hover:text-[var(--text)] cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10.5px] font-mono px-1 min-w-[34px] text-center text-[var(--text-2)]">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
              className="p-1 rounded-full hover:bg-[var(--panel-3)] text-[var(--dim)] hover:text-[var(--text)] cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. SUBTASK STEPS & WORKER CODE OUTPUT ──────────────────── */}
      <div className="rounded-panel border border-[var(--border-soft)] bg-[var(--panel)] p-5 shadow-sm space-y-4">
        <h2 className="text-[15px] font-bold text-[var(--text)]">Detailed Subtask Breakdown & Code Artifacts</h2>

        {runStatus === 'planning' && (
          <div className="flex items-center gap-3 p-4 rounded-control border border-[var(--border)] bg-[var(--bg-inset)]">
            <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
            <span className="text-[13px] font-mono text-[var(--text-2)]">
              Decomposing task into subtask graph…
            </span>
          </div>
        )}

        <div className="space-y-4">
          {groupNums.map((groupNum) => {
            const groupSubtasks = groups[groupNum]
            const isGroupExpanded = expandedGroups.has(groupNum)

            return (
              <div key={groupNum} className="border border-[var(--border)] rounded-control overflow-hidden bg-[var(--bg-inset)]">
                <button
                  onClick={() => toggleGroup(groupNum)}
                  className="flex items-center justify-between w-full px-4 py-3 bg-[var(--panel-2)] hover:bg-[var(--panel-3)] transition-colors cursor-pointer select-none"
                  aria-expanded={isGroupExpanded}
                >
                  <div className="flex items-center gap-2.5">
                    {isGroupExpanded ? <ChevronDown size={14} className="text-[var(--dim)]" /> : <ChevronRight size={14} className="text-[var(--dim)]" />}
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--text)]">
                      Group {groupNum}
                    </span>
                    <span className="text-[10.5px] font-mono px-2.5 py-0.5 rounded-full bg-[var(--bg-inset)] border border-[var(--border)] text-[var(--dim)]">
                      {groupSubtasks.length > 1 ? `${groupSubtasks.length} parallel workers` : 'sequential step'}
                    </span>
                  </div>
                </button>

                {isGroupExpanded && (
                  <div className="divide-y divide-[var(--border-soft)]">
                    {groupSubtasks.map((st) => {
                      const isDetailExpanded = expandedSteps.has(st.id)
                      return (
                        <div key={st.id} className="bg-[var(--panel)]">
                          <div
                            onClick={() => onSelectSubtask(selectedSubtask === st.id ? null : st.id)}
                            className="p-4 flex items-center justify-between hover:bg-[var(--panel-2)] cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <StatusIcon status={st.status} />
                              <AgentBadge role={st.role} />
                              <p className="text-[13.5px] text-[var(--text)] font-medium truncate flex-1">
                                {st.instruction}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                              <span className="px-2.5 py-1 rounded-control bg-[var(--bg-inset)] border border-[var(--border)] text-[11.5px] font-mono text-[var(--dim)]">
                                {st.model}
                              </span>

                              <button
                                onClick={(e) => toggleStepDetail(st.id, e)}
                                className="p-1 rounded hover:bg-[var(--panel-3)] text-[var(--dim)] hover:text-[var(--text)]"
                                title="View details"
                              >
                                {isDetailExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            </div>
                          </div>

                          {isDetailExpanded && (
                            <div className="px-5 pb-4 pt-2 border-t border-[var(--border-soft)] bg-[var(--bg-inset)] space-y-2">
                              {st.output && (
                                <pre className="p-3.5 rounded-control bg-[var(--bg-inset)] border border-[var(--border)] font-mono text-[12px] leading-relaxed text-[var(--text-2)] whitespace-pre-wrap overflow-x-auto">
                                  {st.output}
                                </pre>
                              )}
                              {st.error && (
                                <pre className="p-3.5 rounded-control bg-[var(--bad-dim)] border border-[var(--bad-quiet)] font-mono text-[12px] leading-relaxed text-[var(--bad)] whitespace-pre-wrap">
                                  {st.error}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
