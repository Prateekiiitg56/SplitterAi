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
  Code2,
  FileCode,
  Terminal,
  Activity,
  ArrowRight,
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
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0B0C10] text-white font-sans select-none">
      
      {/* ── 1. ACTIVE TASK INSTRUCTION HEADER ─────────────────────── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141824] p-5 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#9D8CFC]">
                ACTIVE AGENT INSTRUCTION
              </span>
              <span className="text-neutral-600">·</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#30A46C]/20 border border-[#30A46C]/40 text-[#30A46C]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30A46C] animate-pulse" />
                {runStatus.toUpperCase()}
              </span>
            </div>
            <h1 className="text-[18px] font-bold text-white leading-snug tracking-tight">
              {task || 'Create fizzbuzz, fibonacci, and factorial scripts'}
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-[#101218] border border-white/10 text-right">
              <p className="text-[10px] font-mono text-neutral-500 uppercase">SUBTASKS</p>
              <p className="text-[13px] font-mono font-bold text-white">{subtasks.length} Parallel Nodes</p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#101218] border border-white/10 text-right">
              <p className="text-[10px] font-mono text-neutral-500 uppercase">MODEL CHAIN</p>
              <p className="text-[13px] font-mono font-bold text-[#9D8CFC]">groq + gemini</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. EXECUTION DAG WORKFLOW GRAPH ───────────────────────── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141824] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity size={18} className="text-[#9D8CFC]" />
            <h2 className="text-[15px] font-bold text-white">Execution DAG Workflow Graph</h2>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-[#6E56CF]/20 text-[#9D8CFC] border border-[#6E56CF]/30 font-semibold">
              Parallel Execution DAG
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-mono text-neutral-400">
              Group 1 (Parallel) → Group 2 (Sequential)
            </span>
          </div>
        </div>

        {/* Dark Grid Canvas Container */}
        <div
          className="relative min-h-[220px] p-6 rounded-xl border border-white/10 bg-[#0C1019] overflow-hidden flex flex-col justify-center transition-all shadow-inner"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'center center',
          }}
        >
          {subtasks.length > 0 ? (
            <div className="flex items-center justify-center gap-10 py-4 overflow-x-auto">
              
              {/* Planner Node */}
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-[#192031] border border-[#6E56CF] shadow-md flex items-center justify-center text-[#9D8CFC]">
                  <Layers size={22} />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-bold text-white">Planner</p>
                  <p className="text-[10.5px] font-mono text-neutral-400">DAG Dispatch</p>
                </div>
              </div>

              <ArrowRight size={18} className="text-neutral-600 flex-shrink-0" />

              {/* Group 1 Workers (Parallel) */}
              <div className="flex flex-col gap-3 flex-shrink-0">
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider text-center">
                  GROUP 1 (PARALLEL)
                </span>
                {subtasks.filter((s) => s.group === 1).map((st) => {
                  const isSelected = selectedSubtask === st.id
                  return (
                    <button
                      key={st.id}
                      onClick={() => onSelectSubtask(isSelected ? null : st.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#6E56CF] bg-[#192031] ring-2 ring-[#6E56CF]/40 shadow-md'
                          : 'border-white/10 bg-[#141824] hover:border-white/20'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#0C1019] flex items-center justify-center flex-shrink-0">
                        <AgentIcon role={st.role} className="w-4 h-4 text-[#9D8CFC]" />
                      </div>
                      <div className="min-w-0 pr-2">
                        <p className="text-[12.5px] font-semibold text-white truncate max-w-[180px]">
                          {st.instruction}
                        </p>
                        <p className="text-[10.5px] font-mono text-neutral-400 capitalize">
                          {st.role} · {st.status}
                        </p>
                      </div>
                      <StatusIcon status={st.status} />
                    </button>
                  )
                })}
              </div>

              <ArrowRight size={18} className="text-neutral-600 flex-shrink-0" />

              {/* Group 2 Workers */}
              <div className="flex flex-col gap-3 flex-shrink-0">
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider text-center">
                  GROUP 2 (VERIFICATION)
                </span>
                {subtasks.filter((s) => s.group === 2).map((st) => {
                  const isSelected = selectedSubtask === st.id
                  return (
                    <button
                      key={st.id}
                      onClick={() => onSelectSubtask(isSelected ? null : st.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#6E56CF] bg-[#192031] ring-2 ring-[#6E56CF]/40 shadow-md'
                          : 'border-white/10 bg-[#141824] hover:border-white/20'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#0C1019] flex items-center justify-center flex-shrink-0">
                        <AgentIcon role={st.role} className="w-4 h-4 text-[#9D8CFC]" />
                      </div>
                      <div className="min-w-0 pr-2">
                        <p className="text-[12.5px] font-semibold text-white truncate max-w-[180px]">
                          {st.instruction}
                        </p>
                        <p className="text-[10.5px] font-mono text-neutral-400 capitalize">
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
            <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-500">
              <Layers size={28} className="mb-2 opacity-40" />
              <p className="text-[13px] font-semibold text-white">No active execution graph</p>
              <p className="text-[11.5px] text-neutral-400">Submit a task from the Home prompt to decompose subtasks</p>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 p-1 rounded-full bg-[#141824] border border-white/10 shadow-sm">
            <button
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10.5px] font-mono px-1 min-w-[34px] text-center text-neutral-300">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
              className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. SUBTASK STEPS & WORKER CODE OUTPUT ──────────────────── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141824] p-5 shadow-sm space-y-4">
        <h2 className="text-[15px] font-bold text-white">Detailed Subtask Breakdown & Code Artifacts</h2>

        {runStatus === 'planning' && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-[#101218]">
            <Loader2 size={16} className="animate-spin text-[#9D8CFC]" />
            <span className="text-[13px] font-mono text-neutral-300">
              Decomposing task into subtask graph…
            </span>
          </div>
        )}

        <div className="space-y-4">
          {groupNums.map((groupNum) => {
            const groupSubtasks = groups[groupNum]
            const isGroupExpanded = expandedGroups.has(groupNum)

            return (
              <div key={groupNum} className="border border-white/10 rounded-xl overflow-hidden bg-[#101218]">
                <button
                  onClick={() => toggleGroup(groupNum)}
                  className="flex items-center justify-between w-full px-4 py-3 bg-[#192031] hover:bg-[#222B40] transition-colors cursor-pointer select-none"
                  aria-expanded={isGroupExpanded}
                >
                  <div className="flex items-center gap-2.5">
                    {isGroupExpanded ? <ChevronDown size={14} className="text-neutral-400" /> : <ChevronRight size={14} className="text-neutral-400" />}
                    <span className="text-[12px] font-bold uppercase tracking-wider text-white">
                      Group {groupNum}
                    </span>
                    <span className="text-[10.5px] font-mono px-2.5 py-0.5 rounded-full bg-[#101218] border border-white/10 text-neutral-400">
                      {groupSubtasks.length > 1 ? `${groupSubtasks.length} parallel workers` : 'sequential step'}
                    </span>
                  </div>
                </button>

                {isGroupExpanded && (
                  <div className="divide-y divide-white/[0.06]">
                    {groupSubtasks.map((st) => {
                      const isDetailExpanded = expandedSteps.has(st.id)
                      return (
                        <div key={st.id} className="bg-[#141824]">
                          <div
                            onClick={() => onSelectSubtask(selectedSubtask === st.id ? null : st.id)}
                            className="p-4 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <StatusIcon status={st.status} />
                              <AgentBadge role={st.role} />
                              <p className="text-[13.5px] text-white font-medium truncate flex-1">
                                {st.instruction}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                              <span className="px-2.5 py-1 rounded-md bg-[#101218] border border-white/10 text-[11.5px] font-mono text-neutral-400">
                                {st.model}
                              </span>

                              <button
                                onClick={(e) => toggleStepDetail(st.id, e)}
                                className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white"
                                title="View details"
                              >
                                {isDetailExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            </div>
                          </div>

                          {isDetailExpanded && (
                            <div className="px-5 pb-4 pt-2 border-t border-white/[0.06] bg-[#0C1019] space-y-2">
                              {st.output && (
                                <pre className="p-3.5 rounded-xl bg-[#101218] border border-white/10 font-mono text-[12px] leading-relaxed text-neutral-200 whitespace-pre-wrap overflow-x-auto">
                                  {st.output}
                                </pre>
                              )}
                              {st.error && (
                                <pre className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 font-mono text-[12px] leading-relaxed text-red-300 whitespace-pre-wrap">
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
