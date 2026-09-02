import { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronRight,
  Cpu,
  Wrench,
  Layers,
} from 'lucide-react'
import type { Subtask, RunStatus } from '../data'
import { ROLE_META, STATUS_META } from '../data'

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
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
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
  const groupNums = Object.keys(groups)
    .map(Number)
    .sort((a, b) => a - b)

  const statusIconFor = (status: string) => {
    switch (status) {
      case 'running': return <Loader2 size={15} className="text-primary animate-spin" />
      case 'success': return <CheckCircle2 size={15} className="text-success" />
      case 'error':   return <XCircle size={15} className="text-urgent-red" />
      default:        return <Clock size={15} className="text-text-secondary" />
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-5">
      {/* Current task heading */}
      <div className="mb-5">
        <p
          className="text-[11px] text-text-secondary uppercase tracking-wider mb-1"
          style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}
        >
          Current Task
        </p>
        <h1
          className="text-[16px] text-text-primary leading-snug"
          style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}
        >
          {task || 'No task running'}
        </h1>

        {/* Plan summary pill */}
        {subtasks.length > 0 && (
          <div className="flex items-center gap-3 mt-3">
            <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-hover-bg text-[11px] text-text-secondary"
              style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
              <Layers size={12} />
              {groupNums.length} group{groupNums.length !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-hover-bg text-[11px] text-text-secondary"
              style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
              <Cpu size={12} />
              {subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}
            </span>
            {subtasks.some((s) => s.model) && (
              <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-hover-bg text-[11px] text-text-secondary"
                style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
                {[...new Set(subtasks.map((s) => s.model).filter(Boolean))].length} models
              </span>
            )}
          </div>
        )}
      </div>

      {/* Planning state */}
      {runStatus === 'planning' && (
        <div className="flex items-center gap-3 py-8 justify-center animate-fade-in">
          <Loader2 size={20} className="text-purple animate-spin" />
          <span className="text-[14px] text-text-secondary" style={{ fontFamily: 'var(--font-ui)' }}>
            Planner is decomposing the task…
          </span>
        </div>
      )}

      {/* Groups */}
      <div className="space-y-4 stagger">
        {groupNums.map((groupNum, gi) => {
          const groupSubtasks = groups[groupNum]
          const isParallel = groupSubtasks.length > 1
          const allDone = groupSubtasks.every((s) => s.status === 'success')
          const anyRunning = groupSubtasks.some((s) => s.status === 'running')
          const anyError = groupSubtasks.some((s) => s.status === 'error')

          return (
            <div key={groupNum} className="animate-fade-in">
              {/* Group header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`flex items-center justify-center w-5 h-5 rounded text-[10px] ${
                    allDone ? 'bg-success/10 text-success'
                    : anyRunning ? 'bg-primary/10 text-primary'
                    : anyError ? 'bg-urgent-red/10 text-urgent-red'
                    : 'bg-hover-bg text-text-secondary'
                  }`}
                  style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}
                >
                  {groupNum}
                </div>
                <span className="text-[12px] text-text-secondary" style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
                  Group {groupNum}
                </span>
                {isParallel && (
                  <span className="text-[11px] text-primary bg-primary/8 px-2 py-0.5 rounded-full" style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
                    parallel
                  </span>
                )}
                {!isParallel && (
                  <span className="text-[11px] text-text-secondary bg-hover-bg px-2 py-0.5 rounded-full" style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
                    sequential
                  </span>
                )}
                {/* Connector line */}
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Subtask cards in this group */}
              <div className={`grid gap-2 ${isParallel ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 max-w-2xl'}`}>
                {groupSubtasks.map((st) => {
                  const isExpanded = expandedCards.has(st.id)
                  const isSelected = selectedSubtask === st.id
                  const roleMeta = ROLE_META[st.role]
                  const statusMeta = STATUS_META[st.status]

                  return (
                    <div
                      key={st.id}
                      className={`rounded-lg border transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/3 ring-1 ring-primary/20'
                          : 'border-border hover:border-text-secondary/30 bg-white'
                      }`}
                      onClick={() => onSelectSubtask(isSelected ? null : st.id)}
                    >
                      {/* Card header */}
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        {statusIconFor(st.status)}

                        {/* Role badge */}
                        <span
                          className="inline-flex items-center h-5 px-2 rounded text-[11px] flex-shrink-0"
                          style={{
                            backgroundColor: roleMeta.bg,
                            color: roleMeta.color,
                            fontFamily: 'var(--font-ui)',
                            fontWeight: 500,
                          }}
                        >
                          {roleMeta.label}
                        </span>

                        <span
                          className="text-[11px] text-text-secondary truncate"
                          style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}
                        >
                          {st.id}
                        </span>

                        <div className="flex-1" />

                        {/* Duration or running indicator */}
                        {st.durationMs != null ? (
                          <span className="text-[11px] text-text-secondary tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
                            {(st.durationMs / 1000).toFixed(1)}s
                          </span>
                        ) : st.status === 'running' ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" />
                        ) : null}

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleExpand(st.id)
                          }}
                          className="flex items-center justify-center w-6 h-6 rounded hover:bg-hover-bg text-text-secondary cursor-pointer"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </div>

                      {/* Instruction */}
                      <div className="px-3 pb-2.5">
                        <p className="text-[13px] text-text-primary leading-snug" style={{ fontWeight: 400 }}>
                          {st.instruction}
                        </p>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-border animate-expand">
                          <div className="pt-2.5 space-y-1.5">
                            {st.model && (
                              <div className="flex items-center gap-2">
                                <Cpu size={12} className="text-text-secondary flex-shrink-0" />
                                <span className="text-[11px] text-text-secondary" style={{ fontFamily: 'var(--font-mono)' }}>
                                  {st.model}
                                </span>
                              </div>
                            )}
                            {st.steps != null && (
                              <div className="flex items-center gap-2">
                                <Wrench size={12} className="text-text-secondary flex-shrink-0" />
                                <span className="text-[11px] text-text-secondary">
                                  {st.steps} step{st.steps !== 1 ? 's' : ''} executed
                                </span>
                              </div>
                            )}
                            {st.output && (
                              <div className="mt-2 p-2 rounded bg-surface text-[12px] text-text-primary leading-relaxed" style={{ fontFamily: 'var(--font-mono)' }}>
                                {st.output}
                              </div>
                            )}
                            {st.error && (
                              <div className="mt-2 p-2 rounded bg-urgent-red/5 text-[12px] text-urgent-red leading-relaxed" style={{ fontFamily: 'var(--font-mono)' }}>
                                {st.error}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Group connector arrow to next group */}
              {gi < groupNums.length - 1 && (
                <div className="flex justify-center py-2">
                  <div className="flex flex-col items-center">
                    <div className="w-px h-3 bg-border" />
                    <ChevronDown size={14} className="text-text-secondary -mt-1" />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Idle state */}
      {subtasks.length === 0 && runStatus === 'idle' && (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary gap-3 animate-fade-in">
          <Cpu size={40} strokeWidth={1} className="opacity-30" />
          <p className="text-[14px]" style={{ fontFamily: 'var(--font-ui)' }}>
            Enter a task below to get started
          </p>
          <p className="text-[12px] opacity-60">
            The planner will decompose it into subtasks for parallel execution
          </p>
        </div>
      )}
    </div>
  )
}
