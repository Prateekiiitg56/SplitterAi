import { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
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

  const toggleExpand = (id: string, e: React.MouseEvent) => {
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

  const statusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Loader2 size={14} className="text-primary animate-spin flex-shrink-0" />
      case 'success': return <CheckCircle2 size={14} className="text-success flex-shrink-0" />
      case 'error':   return <XCircle size={14} className="text-urgent-red flex-shrink-0" />
      default:        return <Clock size={14} className="text-text-secondary flex-shrink-0" />
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Task heading */}
      <div className="mb-6">
        <p className="text-[11px] text-text-secondary uppercase tracking-wide mb-1.5"
          style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
          Task
        </p>
        <p className="text-[15px] text-text-primary leading-relaxed"
          style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
          {task || 'No task running'}
        </p>
      </div>

      {/* Planning state */}
      {runStatus === 'planning' && (
        <div className="flex items-center gap-2.5 py-12 justify-center animate-fade-in">
          <Loader2 size={18} className="text-purple animate-spin" />
          <span className="text-[13px] text-text-secondary" style={{ fontFamily: 'var(--font-ui)' }}>
            Planning…
          </span>
        </div>
      )}

      {/* Groups */}
      {groupNums.map((groupNum, gi) => {
        const groupSubtasks = groups[groupNum]
        const isParallel = groupSubtasks.length > 1

        return (
          <div key={groupNum} className="mb-5 animate-fade-in">
            {/* Group label */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-text-secondary"
                style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
                Group {groupNum}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                isParallel ? 'bg-primary/8 text-primary' : 'bg-hover-bg text-text-secondary'
              }`} style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
                {isParallel ? `${groupSubtasks.length} parallel` : 'sequential'}
              </span>
              <div className="flex-1 h-px bg-border ml-1" />
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {groupSubtasks.map((st) => {
                const isExpanded = expandedCards.has(st.id)
                const isSelected = selectedSubtask === st.id
                const role = ROLE_META[st.role]

                return (
                  <div
                    key={st.id}
                    onClick={() => onSelectSubtask(isSelected ? null : st.id)}
                    className={`rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-primary/40 bg-primary/[0.02]'
                        : 'border-border hover:border-border hover:bg-hover-bg/40'
                    }`}
                  >
                    {/* Row 1: status, role, instruction, duration */}
                    <div className="flex items-start gap-2.5 px-3.5 py-3">
                      <div className="mt-0.5">{statusIcon(st.status)}</div>

                      <span className="text-[11px] px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          backgroundColor: role.bg,
                          color: role.color,
                          fontFamily: 'var(--font-ui)',
                          fontWeight: 500,
                        }}>
                        {role.label}
                      </span>

                      <p className="flex-1 text-[13px] text-text-primary leading-snug min-w-0"
                        style={{ fontWeight: 400 }}>
                        {st.instruction}
                      </p>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {st.durationMs != null && (
                          <span className="text-[11px] text-text-secondary tabular-nums"
                            style={{ fontFamily: 'var(--font-mono)' }}>
                            {(st.durationMs / 1000).toFixed(1)}s
                          </span>
                        )}
                        {st.status === 'running' && !st.durationMs && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" />
                        )}
                        <button
                          onClick={(e) => toggleExpand(st.id, e)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-hover-bg text-text-secondary"
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-3.5 pb-3 border-t border-border/60 pt-2.5 space-y-1">
                        {st.model && (
                          <div className="flex items-center gap-1.5">
                            <Cpu size={11} className="text-text-secondary" />
                            <span className="text-[11px] text-text-secondary" style={{ fontFamily: 'var(--font-mono)' }}>
                              {st.model}
                            </span>
                          </div>
                        )}
                        {st.steps != null && (
                          <p className="text-[11px] text-text-secondary">
                            {st.steps} tool step{st.steps !== 1 ? 's' : ''}
                          </p>
                        )}
                        {st.output && (
                          <p className="text-[12px] text-text-primary mt-1.5 p-2 rounded bg-surface leading-relaxed"
                            style={{ fontFamily: 'var(--font-mono)' }}>
                            {st.output}
                          </p>
                        )}
                        {st.error && (
                          <p className="text-[12px] text-urgent-red mt-1.5 p-2 rounded bg-urgent-red/5 leading-relaxed"
                            style={{ fontFamily: 'var(--font-mono)' }}>
                            {st.error}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Arrow to next group */}
            {gi < groupNums.length - 1 && (
              <div className="flex justify-center py-1.5">
                <ChevronDown size={14} className="text-border" />
              </div>
            )}
          </div>
        )
      })}

      {/* Empty state */}
      {subtasks.length === 0 && runStatus === 'idle' && (
        <div className="flex flex-col items-center justify-center py-24 text-text-secondary gap-2 animate-fade-in">
          <Layers size={32} strokeWidth={1} className="opacity-25" />
          <p className="text-[13px]" style={{ fontFamily: 'var(--font-ui)' }}>
            Enter a task below to start
          </p>
        </div>
      )}
    </div>
  )
}
