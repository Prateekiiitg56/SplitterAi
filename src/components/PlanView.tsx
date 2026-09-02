import { useState } from 'react'
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  Cpu,
  Wrench,
  Layers,
} from 'lucide-react'
import type { Subtask, RunStatus } from '../data'
import { AgentBadge, StatusIcon } from './Badges'

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
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const toggleGroup = (groupNum: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupNum)) next.delete(groupNum)
      else next.add(groupNum)
      return next
    })
  }

  const toggleCardExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Group subtasks by group number
  const groups = subtasks.reduce<Record<number, Subtask[]>>((acc, st) => {
    ;(acc[st.group] ??= []).push(st)
    return acc
  }, {})
  const groupNums = Object.keys(groups).map(Number).sort((a, b) => a - b)

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      {/* Primary Page Heading (Task Title as Main Anchor) */}
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-snug">
          {task || 'No task running'}
        </h1>
        <p className="text-[13px] text-slate-500 font-medium mt-1 flex items-center gap-2">
          <span>Multi-agent task decomposition &amp; sandbox execution</span>
          {subtasks.length > 0 && (
            <>
              <span>·</span>
              <span className="font-mono text-[11px] text-slate-400">{subtasks.length} subtasks</span>
            </>
          )}
        </p>
      </div>

      {/* Planning state */}
      {runStatus === 'planning' && (
        <div className="flex items-center gap-3 py-16 justify-center animate-fade-in bg-white/60 rounded-xl border border-slate-200/80">
          <Loader2 size={20} className="text-purple-600 animate-spin" />
          <span className="text-[14px] font-medium text-slate-600 font-sans">
            Planner is analyzing requirements and generating execution DAG…
          </span>
        </div>
      )}

      {/* Subtask Groups with Group Headers and Left Structural Rails */}
      <div className="space-y-6">
        {groupNums.map((groupNum) => {
          const groupSubtasks = groups[groupNum]
          const isParallel = groupSubtasks.length > 1
          const isGroupExpanded = expandedGroups.has(groupNum)

          return (
            <div key={groupNum} className="animate-fade-in">
              {/* Group Header with Anchored Chevron */}
              <div
                onClick={() => toggleGroup(groupNum)}
                className="flex items-center gap-2.5 px-3 py-2 bg-slate-100/80 border border-slate-200/90 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors mb-3 select-none"
              >
                <button className="text-slate-500 hover:text-slate-800 transition-colors">
                  {isGroupExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>

                <span className="text-[12px] font-bold font-mono uppercase tracking-wider text-slate-700">
                  Group {groupNum}
                </span>

                <span
                  className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full ${
                    isParallel ? 'bg-blue-100/90 text-blue-700' : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {isParallel ? `${groupSubtasks.length} parallel subtasks` : 'sequential subtask'}
                </span>

                <div className="flex-1 h-px bg-slate-200/80 ml-2" />
              </div>

              {/* Group Content with Left Rail Line connecting parallel tasks */}
              {isGroupExpanded && (
                <div className="pl-4 border-l-2 border-slate-200/80 space-y-2.5 ml-3">
                  {groupSubtasks.map((st) => {
                    const isSelected = selectedSubtask === st.id
                    const isCardExpanded = expandedCards.has(st.id)
                    const isError = st.status === 'error'
                    const isRunning = st.status === 'running'

                    return (
                      <div
                        key={st.id}
                        onClick={() => onSelectSubtask(isSelected ? null : st.id)}
                        className={`rounded-lg border transition-all cursor-pointer ${
                          isError
                            ? 'bg-red-50/60 border-red-200/90 hover:border-red-300'
                            : isSelected
                            ? 'bg-blue-50/50 border-blue-400 ring-1 ring-blue-500/20'
                            : 'bg-white border-slate-200/90 hover:border-slate-300 card-depth'
                        }`}
                      >
                        {/* Task Row — Strict 4-Column Grid Alignment */}
                        <div className="flex items-center gap-3 px-4 py-3">
                          {/* Col 1: Fixed Status Icon Gutter (16px) */}
                          <div className="w-4 flex-shrink-0 flex items-center justify-center">
                            <StatusIcon status={st.status} />
                          </div>

                          {/* Col 2: Unified Agent Badge (112px fixed) */}
                          <div className="w-28 flex-shrink-0">
                            <AgentBadge role={st.role} />
                          </div>

                          {/* Col 3: Task Instruction Text (flex-1) */}
                          <p className={`flex-1 text-[13.5px] leading-snug truncate ${
                            isError ? 'text-red-950 font-medium' : 'text-slate-800'
                          }`}>
                            {st.instruction}
                          </p>

                          {/* Col 4: Tabular Right-Aligned Duration / Timing Column (60px fixed) */}
                          <div className="w-16 flex-shrink-0 text-right flex items-center justify-end gap-1.5">
                            {st.durationMs != null ? (
                              <span className="text-[11.5px] font-mono text-slate-500 tabular-nums">
                                {(st.durationMs / 1000).toFixed(1)}s
                              </span>
                            ) : isRunning ? (
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-dot" />
                            ) : (
                              <span className="text-[11.5px] font-mono text-slate-400">—</span>
                            )}

                            <button
                              onClick={(e) => toggleCardExpand(st.id, e)}
                              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 ml-1"
                            >
                              {isCardExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Execution Details */}
                        {isCardExpanded && (
                          <div className="px-4 pb-3.5 border-t border-slate-200/60 pt-3 space-y-2 text-[12px] bg-slate-50/40">
                            {st.model && (
                              <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                                <Cpu size={12} className="text-slate-400" />
                                <span>{st.model}</span>
                              </div>
                            )}
                            {st.steps != null && (
                              <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                                <Wrench size={12} className="text-slate-400" />
                                <span>{st.steps} tool step{st.steps !== 1 ? 's' : ''} executed</span>
                              </div>
                            )}
                            {st.output && (
                              <div className="p-3 rounded-md bg-slate-900 text-slate-100 font-mono text-[11.5px] leading-relaxed">
                                {st.output}
                              </div>
                            )}
                            {st.error && (
                              <div className="p-3 rounded-md bg-red-100/80 border border-red-200 text-red-900 font-mono text-[11.5px] leading-relaxed">
                                {st.error}
                              </div>
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

      {/* Idle state */}
      {subtasks.length === 0 && runStatus === 'idle' && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3 animate-fade-in bg-white/40 rounded-xl border border-slate-200/80">
          <Layers size={36} strokeWidth={1.25} className="opacity-40" />
          <p className="text-[14px] font-medium text-slate-600 font-sans">
            Enter a task below to decompose and run multi-agent subtasks
          </p>
        </div>
      )}
    </div>
  )
}
