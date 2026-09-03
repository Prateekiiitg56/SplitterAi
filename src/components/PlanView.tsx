import { useState } from 'react'
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Layers,
  Cpu,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import type { Subtask, RunStatus } from '../data'
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
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

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
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF9F6] text-[#1C1E17] font-sans">
      {/* ── Task Header Card ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E5E2DC] p-5 shadow-2xs">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E9084] block mb-1">
              Active Plan Task
            </span>
            <h1 className="text-[18px] font-bold text-[#1C1E17] leading-snug tracking-tight">
              {task || 'No active task instruction'}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="px-3 py-1 rounded-full bg-[#EFECE6] border border-[#E0DDD5] text-[12px] font-mono text-[#6B6E62]">
              {subtasks.length} Subtask{subtasks.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ── Workflow Diagram Canvas Card ────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E5E2DC] p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-[#1C1E17]">Execution DAG Graph</h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F4F2EC] text-[#6B6E62] border border-[#E0DDD5]">
              Parallel Pipeline
            </span>
          </div>
          <ChevronRight size={16} className="text-[#8E9084]" />
        </div>

        {/* Inset Canvas Container with Dot Grid Texture */}
        <div
          className="relative min-h-[220px] p-6 rounded-lg border border-[#E0DDD5] bg-[#F7F5F0] overflow-hidden flex flex-col justify-center transition-all"
          style={{
            backgroundImage: 'radial-gradient(#C5C2BA 1px, transparent 1px)',
            backgroundSize: '18px 18px',
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'center center',
          }}
        >
          {subtasks.length > 0 ? (
            <div className="flex items-center justify-center gap-12 py-4">
              {/* Planner Node */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-xl bg-white border border-[#E0DDD5] shadow-2xs flex items-center justify-center text-[#275838]">
                  <Layers size={20} />
                </div>
                <div className="text-center">
                  <p className="text-[12.5px] font-semibold text-[#1C1E17]">Planner</p>
                  <p className="text-[10.5px] font-mono text-[#8E9084]">Dispatch</p>
                </div>
              </div>

              {/* Connecting Line */}
              <div className="h-0.5 w-12 bg-[#C5C2BA]" />

              {/* Parallel Worker Nodes Stack */}
              <div className="flex flex-col gap-4">
                {subtasks.map((st) => {
                  const isSelected = selectedSubtask === st.id
                  return (
                    <button
                      key={st.id}
                      onClick={() => onSelectSubtask(isSelected ? null : st.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border bg-white shadow-2xs text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#275838] ring-2 ring-[#275838]/20'
                          : 'border-[#E0DDD5] hover:border-[#C5C2BA]'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#F4F2EC] flex items-center justify-center flex-shrink-0">
                        <AgentIcon role={st.role} className="w-4 h-4 text-[#6B6E62]" />
                      </div>
                      <div className="min-w-0 pr-2">
                        <p className="text-[12.5px] font-semibold text-[#1C1E17] truncate max-w-[200px]">
                          {st.instruction}
                        </p>
                        <p className="text-[10.5px] font-mono text-[#8E9084] capitalize">
                          Group {st.group} · {st.status}
                        </p>
                      </div>
                      <StatusIcon status={st.status} />
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[#8E9084]">
              <Layers size={28} className="mb-2 opacity-50" />
              <p className="text-[13px] font-medium text-[#6B6E62]">No active execution graph</p>
              <p className="text-[11px]">Submit a task to build parallel agent subtasks</p>
            </div>
          )}

          {/* Zoom Controls Cluster */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 p-1 rounded-full bg-white border border-[#E0DDD5] shadow-2xs">
            <button
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              className="p-1 rounded-full hover:bg-[#F4F2EC] text-[#6B6E62] cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10.5px] font-mono px-1 min-w-[34px] text-center text-[#6B6E62]">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
              className="p-1 rounded-full hover:bg-[#F4F2EC] text-[#6B6E62] cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Subtasks Execution Detail List Card ─────────────────── */}
      <div className="bg-white rounded-xl border border-[#E5E2DC] p-5 shadow-2xs">
        <h2 className="text-[15px] font-semibold text-[#1C1E17] mb-4">Execution Steps Detail</h2>

        {runStatus === 'planning' && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-[#E0DDD5] bg-[#F7F5F0] mb-4">
            <Loader2 size={16} className="animate-spin text-[#2563EB]" />
            <span className="text-[13px] font-mono text-[#6B6E62]">
              Decomposing task into subtask graph…
            </span>
          </div>
        )}

        <div className="space-y-4">
          {groupNums.map((groupNum) => {
            const groupSubtasks = groups[groupNum]
            const isGroupExpanded = expandedGroups.has(groupNum)

            return (
              <div key={groupNum} className="border border-[#E0DDD5] rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleGroup(groupNum)}
                  className="flex items-center justify-between w-full px-4 py-3 bg-[#F7F5F0] hover:bg-[#F0EDE6] transition-colors cursor-pointer select-none"
                  aria-expanded={isGroupExpanded}
                >
                  <div className="flex items-center gap-2">
                    {isGroupExpanded ? <ChevronDown size={14} className="text-[#8E9084]" /> : <ChevronRight size={14} className="text-[#8E9084]" />}
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#1C1E17]">
                      Group {groupNum}
                    </span>
                    <span className="text-[10.5px] font-mono px-2.5 py-0.5 rounded-full bg-white border border-[#E0DDD5] text-[#6B6E62]">
                      {groupSubtasks.length > 1 ? `${groupSubtasks.length} parallel` : 'sequential'}
                    </span>
                  </div>
                </button>

                {isGroupExpanded && (
                  <div className="divide-y divide-[#F0EDE6]">
                    {groupSubtasks.map((st) => {
                      const isDetailExpanded = expandedSteps.has(st.id)
                      return (
                        <div key={st.id} className="bg-white">
                          <div
                            onClick={() => onSelectSubtask(selectedSubtask === st.id ? null : st.id)}
                            className="p-4 flex items-center justify-between hover:bg-[#F9F8F5] cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <StatusIcon status={st.status} />
                              <AgentBadge role={st.role} />
                              <p className="text-[13px] text-[#1C1E17] font-medium truncate flex-1">
                                {st.instruction}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                              <span className="px-2.5 py-1 rounded-md bg-[#F4F2EC] border border-[#E0DDD5] text-[11.5px] font-mono text-[#6B6E62]">
                                {st.model}
                              </span>

                              <button
                                onClick={(e) => toggleStepDetail(st.id, e)}
                                className="p-1 rounded hover:bg-[#EFECE6] text-[#8E9084] hover:text-[#1C1E17]"
                                title="View details"
                              >
                                {isDetailExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            </div>
                          </div>

                          {isDetailExpanded && (
                            <div className="px-5 pb-4 pt-2 border-t border-[#F0EDE6] bg-[#FAF9F6] space-y-2">
                              {st.output && (
                                <pre className="p-3 rounded-lg bg-white border border-[#E0DDD5] font-mono text-[12px] leading-relaxed text-[#1C1E17] whitespace-pre-wrap">
                                  {st.output}
                                </pre>
                              )}
                              {st.error && (
                                <pre className="p-3 rounded-lg bg-red-50 border border-red-200 font-mono text-[12px] leading-relaxed text-red-800 whitespace-pre-wrap">
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
