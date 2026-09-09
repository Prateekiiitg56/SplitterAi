import { useState, useMemo } from 'react'
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Layers,
  Activity,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Code2,
  X
} from 'lucide-react'
import type { Subtask, RunStatus } from '../types'
import { AgentBadge, AgentIcon, RoleBadge, StatusBadge, StatusIcon } from './Badges'
import { EmptyState } from './primitives/EmptyState'

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
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([1, 2, 3]))
  const [zoomLevel, setZoomLevel] = useState(100)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [activeDetailSubtask, setActiveDetailSubtask] = useState<Subtask | null>(null)

  const toggleGroup = (groupNum: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupNum)) next.delete(groupNum)
      else next.add(groupNum)
      return next
    })
  }

  // Organize subtasks by group
  const groups = useMemo(() => {
    return subtasks.reduce<Record<number, Subtask[]>>((acc, st) => {
      ;(acc[st.group] ??= []).push(st)
      return acc
    }, {})
  }, [subtasks])

  const groupNums = useMemo(() => {
    return Object.keys(groups).map(Number).sort((a, b) => a - b)
  }, [groups])

  // Determine if a node should be dimmed when hovering another node
  const isNodeDimmed = (nodeId: string, groupNum: number) => {
    if (!hoveredNodeId) return false
    if (hoveredNodeId === nodeId) return false
    const hoveredNode = subtasks.find((s) => s.id === hoveredNodeId)
    if (!hoveredNode) return false
    // Keep nodes in the same group or connected groups bright
    return Math.abs(hoveredNode.group - groupNum) > 1
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[var(--bg)] text-[var(--text)] font-sans select-none">
      {/* ── 1. ACTIVE TASK INSTRUCTION HEADER ─────────────────────── */}
      <div className="rounded-panel border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-micro font-mono font-bold uppercase tracking-wider text-[var(--accent)]">
                ACTIVE AGENT PLAN
              </span>
              <span className="text-[var(--faint)]">·</span>
              <StatusBadge status={runStatus} />
            </div>
            <h1 className="text-title font-bold text-[var(--text)] leading-snug tracking-tight truncate max-w-3xl">
              {task || 'No active task run'}
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 self-start md:self-auto">
            <div className="px-3 py-1.5 rounded-control bg-[var(--bg-inset)] border border-[var(--border)] text-right">
              <p className="text-micro font-mono text-[var(--faint)] uppercase">PARALLEL NODES</p>
              <p className="text-ui font-mono font-bold text-[var(--text)]">{subtasks.length} Subtasks</p>
            </div>
            <div className="px-3 py-1.5 rounded-control bg-[var(--bg-inset)] border border-[var(--border)] text-right">
              <p className="text-micro font-mono text-[var(--faint)] uppercase">LANES</p>
              <p className="text-ui font-mono font-bold text-[var(--accent)]">{groupNums.length} Groups</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. VISUAL DAG GRAPH CANVAS ───────────────────────── */}
      <div className="rounded-panel border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity size={18} className="text-[var(--accent)]" />
            <h2 className="text-strong font-bold text-[var(--text)]">Execution DAG Workflow Graph</h2>
            <span className="text-micro font-mono px-2.5 py-0.5 rounded-control bg-[var(--accent-quiet)] text-[var(--accent)] border border-[var(--accent-edge)] font-semibold">
              Parallel Execution DAG
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-micro font-mono text-[var(--dim)] hidden sm:inline">
              Hover nodes to trace dependency flow
            </span>
          </div>
        </div>

        {/* Dark Grid Canvas Container */}
        <div
          className="relative min-h-[260px] p-6 rounded-control border border-[var(--border)] bg-[var(--bg-inset)] overflow-hidden transition-all shadow-inner"
          style={{
            backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <div
            className="flex items-center justify-start md:justify-center gap-8 py-6 overflow-x-auto min-w-max"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'center left',
            }}
          >
            {/* Planner Root Dispatcher */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-12 h-12 rounded-panel bg-[var(--panel-2)] border-2 border-[var(--accent)] shadow-lg flex items-center justify-center text-[var(--accent)]">
                <Layers size={22} />
              </div>
              <div className="text-center font-mono">
                <p className="text-ui font-bold text-[var(--text)]">Planner</p>
                <p className="text-micro text-[var(--faint)]">Root Dispatcher</p>
              </div>
            </div>

            <ArrowRight size={20} className="text-[var(--border-strong)] flex-shrink-0 animate-pulse" />

            {/* Render Groups as Vertical Lanes */}
            {subtasks.length > 0 ? (
              groupNums.map((groupNum, index) => {
                const groupSubtasks = groups[groupNum] || []
                const isLastGroup = index === groupNums.length - 1

                return (
                  <div key={groupNum} className="flex items-center gap-8 flex-shrink-0">
                    <div className="flex flex-col gap-3.5 p-3 rounded-panel bg-[var(--panel-2)]/40 border border-[var(--border)] min-w-[200px]">
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 px-1">
                        <span className="text-micro font-mono font-bold text-[var(--accent)] uppercase tracking-wider">
                          Group {groupNum}
                        </span>
                        <span className="text-micro font-mono text-[var(--faint)]">
                          {groupSubtasks.length > 1 ? 'Parallel' : 'Seq'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {groupSubtasks.map((st) => {
                          const isSelected = selectedSubtask === st.id
                          const isDimmed = isNodeDimmed(st.id, groupNum)
                          const isHovered = hoveredNodeId === st.id

                          return (
                            <div
                              key={st.id}
                              onMouseEnter={() => setHoveredNodeId(st.id)}
                              onMouseLeave={() => setHoveredNodeId(null)}
                              onClick={() => {
                                onSelectSubtask(isSelected ? null : st.id)
                                setActiveDetailSubtask(st)
                              }}
                              className={`p-3 rounded-control border text-left transition-all duration-150 cursor-pointer w-[210px] ${
                                isDimmed ? 'opacity-35 scale-95' : 'opacity-100'
                              } ${
                                isSelected || isHovered
                                  ? 'border-[var(--accent)] bg-[var(--accent-quiet)] ring-2 ring-[var(--accent-edge)] shadow-lg translate-y-[-2px]'
                                  : 'border-[var(--border)] bg-[var(--panel)] hover:border-[var(--border-strong)]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1.5">
                                <RoleBadge role={st.role} size="sm" />
                                <StatusBadge status={st.status} compact />
                              </div>

                              <p className="text-meta font-semibold text-[var(--text)] line-clamp-2 leading-snug">
                                {st.instruction}
                              </p>

                              <div className="mt-2 pt-1.5 border-t border-[var(--border-soft)] flex items-center justify-between text-micro font-mono text-[var(--faint)]">
                                <span>{st.model?.split('-')[0] || 'model'}</span>
                                <span className="uppercase text-micro px-1 rounded bg-[var(--bg-inset)]">
                                  #{st.id}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {!isLastGroup && (
                      <div className="flex flex-col items-center justify-center">
                        <ArrowRight size={18} className="text-[var(--border-strong)] flex-shrink-0" />
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <EmptyState
                icon={<Layers size={28} />}
                title="No active execution graph"
                detail="Submit a task from the Home prompt to decompose subtasks."
              />
            )}
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 p-1 rounded-full bg-[var(--panel)] border border-[var(--border)] shadow-md z-10">
            <button
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              className="p-1.5 rounded-full hover:bg-[var(--panel-2)] text-[var(--dim)] hover:text-[var(--text)] cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-micro font-mono px-1 min-w-[34px] text-center text-[var(--text-2)]">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
              className="p-1.5 rounded-full hover:bg-[var(--panel-2)] text-[var(--dim)] hover:text-[var(--text)] cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. DETAILED SUBTASK BREAKDOWN & CARDS ─────────────────── */}
      <div className="rounded-panel border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm space-y-4">
        <h2 className="text-strong font-bold text-[var(--text)]">Subtask Execution Breakdown</h2>

        {runStatus === 'planning' && (
          <div className="flex items-center gap-3 p-4 rounded-control border border-[var(--border)] bg-[var(--bg-inset)]">
            <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
            <span className="text-ui font-mono text-[var(--text-2)]">
              Decomposing task prompt into parallel execution DAG…
            </span>
          </div>
        )}

        <div className="space-y-4">
          {groupNums.map((groupNum) => {
            const groupSubtasks = groups[groupNum] || []
            const isGroupExpanded = expandedGroups.has(groupNum)

            return (
              <div key={groupNum} className="border border-[var(--border)] rounded-control overflow-hidden bg-[var(--bg-inset)]">
                <button
                  onClick={() => toggleGroup(groupNum)}
                  className="flex items-center justify-between w-full px-4 py-3 bg-[var(--panel-2)] hover:bg-[var(--panel-3)] transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    {isGroupExpanded ? <ChevronDown size={14} className="text-[var(--dim)]" /> : <ChevronRight size={14} className="text-[var(--dim)]" />}
                    <span className="text-meta font-bold uppercase tracking-wider text-[var(--text)]">
                      Group {groupNum}
                    </span>
                    <span className="text-micro font-mono px-2.5 py-0.5 rounded-full bg-[var(--bg-inset)] border border-[var(--border)] text-[var(--dim)]">
                      {groupSubtasks.length > 1 ? `${groupSubtasks.length} parallel workers` : '1 worker'}
                    </span>
                  </div>
                </button>

                {isGroupExpanded && (
                  <div className="divide-y divide-[var(--border)]">
                    {groupSubtasks.map((st) => (
                      <div key={st.id} className="p-4 bg-[var(--panel)] hover:bg-[var(--panel-2)]/50 transition-colors">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <RoleBadge role={st.role} size="md" className="mt-0.5" />
                            <div>
                              <p className="text-ui text-[var(--text)] font-semibold leading-snug">
                                {st.instruction}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-micro font-mono text-[var(--dim)]">
                                <span>Model: {st.model}</span>
                                <span>·</span>
                                <span>Group {st.group}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <StatusBadge status={st.status} />
                            <button
                              onClick={() => setActiveDetailSubtask(st)}
                              className="px-2.5 py-1 rounded bg-[var(--bg-inset)] border border-[var(--border)] hover:border-[var(--accent)] text-micro font-mono text-[var(--accent)] transition-colors cursor-pointer"
                            >
                              Inspect Output
                            </button>
                          </div>
                        </div>

                        {st.output && (
                          <div className="mt-3 p-3 rounded bg-[var(--bg-inset)] border border-[var(--border)] font-mono text-micro text-[var(--text-2)] whitespace-pre-wrap max-h-36 overflow-y-auto">
                            {st.output}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 4. SUBTASK INSPECT SLIDE-OVER MODAL / OVERLAY ─────────── */}
      {activeDetailSubtask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-panel shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--panel-2)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <RoleBadge role={activeDetailSubtask.role} />
                <span className="font-bold text-sm text-[var(--text)] truncate">
                  Subtask #{activeDetailSubtask.id} Output
                </span>
              </div>
              <button
                onClick={() => setActiveDetailSubtask(null)}
                className="text-[var(--faint)] hover:text-[var(--text)] p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs">
              <div>
                <label className="text-[10px] text-[var(--faint)] uppercase tracking-wider block mb-1">Instruction</label>
                <p className="p-3 rounded bg-[var(--bg-inset)] border border-[var(--border)] text-[var(--text)] font-sans text-sm">
                  {activeDetailSubtask.instruction}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 rounded bg-[var(--bg-inset)] border border-[var(--border)]">
                  <span className="text-[var(--faint)] block text-[10px]">Status</span>
                  <StatusBadge status={activeDetailSubtask.status} className="mt-1" />
                </div>
                <div className="p-2.5 rounded bg-[var(--bg-inset)] border border-[var(--border)]">
                  <span className="text-[var(--faint)] block text-[10px]">Model</span>
                  <span className="text-[var(--accent)] font-semibold mt-1 block">{activeDetailSubtask.model}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[var(--faint)] uppercase tracking-wider block mb-1">Output Artifact</label>
                <pre className="p-4 rounded bg-[var(--bg-inset)] border border-[var(--border)] text-[var(--text-2)] whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-64">
                  {activeDetailSubtask.output || activeDetailSubtask.error || 'No output text returned.'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
