import { useState } from 'react'
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Cpu,
  Wrench,
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

  const toggleGroup = (groupNum: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupNum)) next.delete(groupNum)
      else next.add(groupNum)
      return next
    })
  }

  const groups = subtasks.reduce<Record<number, Subtask[]>>((acc, st) => {
    ;(acc[st.group] ??= []).push(st)
    return acc
  }, {})
  const groupNums = Object.keys(groups).map(Number).sort((a, b) => a - b)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 font-sans" style={{ background: 'var(--color-bg)' }}>
      {/* ── Workflow Diagram Card ───────────────────────────────── */}
      <div className="card">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="t-section">Workflow Graph</h2>
            <span className="text-[12px] font-mono px-2 py-0.5 rounded border" style={{ background: 'var(--color-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-text-2)' }}>
              DAG Plan
            </span>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--color-text-3)' }} />
        </div>

        {/* Inset Canvas with Dot Grid Texture */}
        <div
          className="relative min-h-[220px] p-6 rounded-lg border overflow-hidden flex flex-col justify-center"
          style={{
            background: 'var(--color-elevated)',
            borderColor: 'var(--color-border)',
            backgroundImage: 'radial-gradient(#D8D5CE 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        >
          {/* Workflow DAG Nodes */}
          {subtasks.length > 0 ? (
            <div className="flex items-center justify-center gap-12 py-4">
              {/* Planner Node */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center border shadow-xs"
                  style={{ background: '#FFFFFF', borderColor: 'var(--color-border)', color: '#3D8B5F' }}
                >
                  <Layers size={18} />
                </div>
                <div className="text-center">
                  <p className="text-[12px] font-semibold" style={{ color: 'var(--color-text-1)' }}>Planner</p>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--color-text-3)' }}>Dispatch</p>
                </div>
              </div>

              {/* Connecting Line */}
              <div className="h-0.5 w-10" style={{ background: 'var(--color-border-strong)' }} />

              {/* Worker Nodes Stack */}
              <div className="flex flex-col gap-5">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => onSelectSubtask(selectedSubtask === st.id ? null : st.id)}
                    className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all"
                    style={{
                      background: '#FFFFFF',
                      borderColor: selectedSubtask === st.id ? 'var(--color-accent)' : 'var(--color-border)',
                      boxShadow: selectedSubtask === st.id ? '0 0 0 2px rgba(61,139,95,0.15)' : 'none',
                    }}
                  >
                    <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: 'var(--color-elevated)' }}>
                      <AgentIcon role={st.role} className="w-4 h-4 text-zinc-600" />
                    </div>
                    <div className="min-w-0 pr-2">
                      <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--color-text-1)', maxWidth: 180 }}>
                        {st.instruction}
                      </p>
                      <p className="text-[10px] font-mono capitalize" style={{ color: 'var(--color-text-3)' }}>
                        Group {st.group} · {st.status}
                      </p>
                    </div>
                    <StatusIcon status={st.status} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Layers size={24} style={{ color: 'var(--color-text-3)' }} className="mb-2" />
              <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-2)' }}>No active execution graph</p>
              <p className="text-[11px]" style={{ color: 'var(--color-text-3)' }}>Submit a task to build nodes</p>
            </div>
          )}

          {/* Bottom-right Zoom Control Cluster */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 p-1 rounded-full border shadow-xs" style={{ background: '#FFFFFF', borderColor: 'var(--color-border)' }}>
            <button onClick={() => setZoomLevel((z) => Math.max(50, z - 10))} className="p-1 hover:bg-zinc-100 rounded-full cursor-pointer text-zinc-500">
              <ZoomOut size={12} />
            </button>
            <span className="text-[10px] font-mono px-1 min-w-[32px] text-center" style={{ color: 'var(--color-text-2)' }}>
              {zoomLevel}%
            </span>
            <button onClick={() => setZoomLevel((z) => Math.min(150, z + 10))} className="p-1 hover:bg-zinc-100 rounded-full cursor-pointer text-zinc-500">
              <ZoomIn size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Subtasks Execution Detail List ───────────────────────── */}
      <div className="card">
        <h2 className="t-section mb-4">Execution Steps</h2>

        {runStatus === 'planning' && (
          <div className="flex items-center gap-3 p-4 rounded-lg border mb-4" style={{ background: 'var(--color-elevated)', borderColor: 'var(--color-border)' }}>
            <Loader2 size={16} className="animate-spin text-blue-500" />
            <span className="text-[13px] font-mono" style={{ color: 'var(--color-text-2)' }}>Generating subtask execution DAG…</span>
          </div>
        )}

        <div className="space-y-4">
          {groupNums.map((groupNum) => {
            const groupSubtasks = groups[groupNum]
            const isExpanded = expandedGroups.has(groupNum)

            return (
              <div key={groupNum} className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                <div
                  onClick={() => toggleGroup(groupNum)}
                  className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none"
                  style={{ background: 'var(--color-elevated)' }}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={14} style={{ color: 'var(--color-text-3)' }} /> : <ChevronRight size={14} style={{ color: 'var(--color-text-3)' }} />}
                    <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-1)' }}>
                      Group {groupNum}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border" style={{ background: '#FFFFFF', borderColor: 'var(--color-border)', color: 'var(--color-text-2)' }}>
                      {groupSubtasks.length > 1 ? `${groupSubtasks.length} parallel` : 'sequential'}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    {groupSubtasks.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => onSelectSubtask(selectedSubtask === st.id ? null : st.id)}
                        className="p-3.5 flex items-center justify-between hover:bg-zinc-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <StatusIcon status={st.status} />
                          <AgentBadge role={st.role} />
                          <p className="text-[13px] truncate" style={{ color: 'var(--color-text-1)' }}>{st.instruction}</p>
                        </div>
                        <span className="chip-inset flex-shrink-0 ml-3">{st.model}</span>
                      </div>
                    ))}
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
