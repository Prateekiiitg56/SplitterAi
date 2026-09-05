import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ProjectTabShell from './ProjectTabShell'
import { useApp } from '../context/AppContext'
import { ROLE_META } from '../data'
import type { AgentRole, Subtask } from '../types'
import { AgentIcon } from '../components/Badges'
import { Users, Plus, Trash2, Play, Edit2, Check, ArrowDown } from 'lucide-react'

interface DraftAgent {
  id: string
  label: string
  isCustomLabel?: boolean
  role: AgentRole
  instruction: string
  runsAfter: string | null
}

export default function ProjectAgentsPage() {
  const navigate = useNavigate()
  const { executeTaskWithPlan, currentWorkspace } = useApp()

  const [masterTitle, setMasterTitle] = useState<string>('Custom Multi-Agent Pipeline')
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [tempLabelValue, setTempLabelValue] = useState<string>('')

  // Default draft agents
  const [drafts, setDrafts] = useState<DraftAgent[]>([
    {
      id: 'agent-1',
      label: 'Agent 1',
      role: 'planner',
      instruction: 'Break down project requirements into subtasks and assign priorities.',
      runsAfter: null,
    },
    {
      id: 'agent-2',
      label: 'Agent 2',
      role: 'coder',
      instruction: 'Write code logic and implement requested features.',
      runsAfter: 'agent-1',
    },
  ])

  // Group calculation logic matching orchestrator.py
  const groupMap: Record<string, number> = {}
  drafts.forEach((a) => {
    if (!a.runsAfter || !groupMap[a.runsAfter]) {
      groupMap[a.id] = 1
    } else {
      groupMap[a.id] = groupMap[a.runsAfter] + 1
    }
  })

  const renumberDrafts = (items: DraftAgent[]): DraftAgent[] => {
    return items.map((item, idx) => {
      if (!item.isCustomLabel) {
        return { ...item, label: `Agent ${idx + 1}` }
      }
      return item
    })
  }

  const handleAddAgent = () => {
    const nextNum = drafts.length + 1
    const newId = `agent-${Date.now()}`
    const lastAgentId = drafts.length > 0 ? drafts[drafts.length - 1].id : null

    const newDraft: DraftAgent = {
      id: newId,
      label: `Agent ${nextNum}`,
      role: 'coder',
      instruction: '',
      runsAfter: lastAgentId,
    }

    setDrafts((prev) => renumberDrafts([...prev, newDraft]))
  }

  const handleDeleteAgent = (id: string) => {
    setDrafts((prev) => {
      const filtered = prev.filter((d) => d.id !== id)

      // Reset any runsAfter references pointing to the deleted card
      const updated = filtered.map((d) => {
        if (d.runsAfter === id) {
          return { ...d, runsAfter: null }
        }
        return d
      })

      return renumberDrafts(updated)
    })
  }

  const handleStartRename = (agent: DraftAgent) => {
    setEditingLabelId(agent.id)
    setTempLabelValue(agent.label)
  }

  const handleSaveRename = (id: string) => {
    if (!tempLabelValue.trim()) {
      setEditingLabelId(null)
      return
    }
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, label: tempLabelValue.trim(), isCustomLabel: true } : d))
    )
    setEditingLabelId(null)
  }

  // Validate if all agents have instructions
  const isFormValid = drafts.length > 0 && drafts.every((d) => d.instruction.trim().length > 0)

  const handleLaunchPlan = async () => {
    if (!isFormValid) return

    const subtasks: Subtask[] = drafts.map((a, idx) => ({
      id: `t${idx + 1}`,
      role: a.role === 'unassigned' ? 'coder' : a.role,
      group: groupMap[a.id] || 1,
      instruction: a.instruction.trim(),
      status: 'pending',
      steps: 0,
    }))

    const titleToUse = masterTitle.trim() || drafts[0]?.instruction.trim().slice(0, 40) || 'Custom Agent Plan'
    await executeTaskWithPlan(titleToUse, subtasks, currentWorkspace)
    navigate('/projects/default')
  }

  return (
    <ProjectTabShell>
      <div className="flex-1 overflow-y-auto p-6 text-[var(--text)] space-y-6 max-w-[840px] mx-auto w-full select-none">
        
        {/* Header Row */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-4">
          <div>
            <h2 className="text-[18px] font-bold text-[var(--text)] tracking-tight flex items-center gap-2.5">
              <Users size={18} className="text-[var(--accent)]" />
              <span>Manual Agent Pipeline Builder</span>
            </h2>
            <p className="text-[12px] text-[var(--dim)] mt-0.5 font-mono">
              Build custom multi-agent subtasks with sequential or parallel dependency chains.
            </p>
          </div>

          <button
            onClick={handleLaunchPlan}
            disabled={!isFormValid}
            className={`btn-primary text-[12.5px] font-medium px-4 py-2 rounded-md border flex items-center gap-2 transition-all cursor-pointer ${
              !isFormValid
                ? 'opacity-50 cursor-not-allowed border-[var(--border-soft)] bg-[var(--panel-2)] text-[var(--faint)]'
                : 'border-[var(--border)] text-[var(--accent)] hover:border-[var(--accent)] shadow-md'
            }`}
          >
            <Play size={14} />
            <span>Start execution</span>
          </button>
        </div>

        {/* Master Task Title Input */}
        <div className="space-y-1.5 border border-[var(--border-soft)] rounded-[var(--radius)] p-4 bg-[var(--panel)]">
          <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--faint)] font-bold block">
            MASTER TASK TITLE
          </label>
          <input
            type="text"
            value={masterTitle}
            onChange={(e) => setMasterTitle(e.target.value)}
            placeholder="e.g. Build REST API & test suite"
            className="w-full bg-[var(--bg-inset)] border border-[var(--border)] rounded px-3 py-2 text-[13.5px] text-[var(--text)] font-medium focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Draft Agent Cards */}
        <div className="space-y-4">
          {drafts.map((agent, index) => {
            const computedGroup = groupMap[agent.id] || 1
            const precedingAgents = drafts.slice(0, index)
            const meta = ROLE_META[agent.role] || ROLE_META.coder

            return (
              <div
                key={agent.id}
                className="border border-[var(--border-soft)] rounded-[var(--radius)] bg-[var(--panel)] p-5 space-y-4 hover:border-[var(--border)] transition-colors relative shadow-sm"
              >
                {/* Card Header Row */}
                <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
                  <div className="flex items-center gap-2.5">
                    {/* Role Icon */}
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center border border-[var(--border)]"
                      style={{ backgroundColor: meta.bg }}
                    >
                      <AgentIcon role={agent.role} size={14} />
                    </div>

                    {/* Auto-numbered / Editable Label */}
                    {editingLabelId === agent.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={tempLabelValue}
                          onChange={(e) => setTempLabelValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(agent.id)
                          }}
                          className="bg-[var(--bg-inset)] border border-[var(--accent)] rounded px-2 py-0.5 text-[13px] font-bold text-[var(--text)] focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(agent.id)}
                          className="text-[var(--good)] hover:opacity-80 p-1"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-[var(--text)] tracking-tight">
                          {agent.label}
                        </span>
                        <button
                          onClick={() => handleStartRename(agent)}
                          className="text-[var(--faint)] hover:text-[var(--text)] p-0.5 cursor-pointer"
                          title="Rename agent"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Group & Controls */}
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[var(--panel-2)] border border-[var(--border-soft)] text-[var(--dim)]">
                      Group {computedGroup} {agent.runsAfter ? `(After ${drafts.find(d => d.id === agent.runsAfter)?.label || 'predecessor'})` : '(Parallel)'}
                    </span>

                    {drafts.length > 1 && (
                      <button
                        onClick={() => handleDeleteAgent(agent.id)}
                        className="text-[var(--faint)] hover:text-[var(--bad)] p-1 transition-colors cursor-pointer"
                        title="Remove agent card"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Role & Dependency Pickers */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Role Selector */}
                  <div>
                    <label className="text-[10.5px] font-mono uppercase tracking-wider text-[var(--faint)] font-bold block mb-1">
                      AGENT ROLE
                    </label>
                    <select
                      value={agent.role}
                      onChange={(e) => {
                        const newRole = e.target.value as AgentRole
                        setDrafts((prev) =>
                          prev.map((d) => (d.id === agent.id ? { ...d, role: newRole } : d))
                        )
                      }}
                      className="w-full bg-[var(--bg-inset)] border border-[var(--border)] rounded px-3 py-2 text-[12.5px] text-[var(--text)] font-medium cursor-pointer focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="planner">Planner (Auto-decomposition)</option>
                      <option value="coder">Coder (Implementation & Code)</option>
                      <option value="auditor">Auditor (Review & Security)</option>
                      <option value="tester">Tester (Unit Tests & QA)</option>
                    </select>
                  </div>

                  {/* Runs After Selector */}
                  <div>
                    <label className="text-[10.5px] font-mono uppercase tracking-wider text-[var(--faint)] font-bold block mb-1">
                      RUNS AFTER (DEPENDENCY)
                    </label>
                    <select
                      value={agent.runsAfter || ''}
                      onChange={(e) => {
                        const val = e.target.value || null
                        setDrafts((prev) =>
                          prev.map((d) => (d.id === agent.id ? { ...d, runsAfter: val } : d))
                        )
                      }}
                      className="w-full bg-[var(--bg-inset)] border border-[var(--border)] rounded px-3 py-2 text-[12.5px] text-[var(--text)] font-medium cursor-pointer focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="">— runs immediately (Group 1) —</option>
                      {precedingAgents.map((pa) => (
                        <option key={pa.id} value={pa.id}>
                          After {pa.label} ({ROLE_META[pa.role]?.label || pa.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subtask Instruction Textarea */}
                <div>
                  <label className="text-[10.5px] font-mono uppercase tracking-wider text-[var(--faint)] font-bold block mb-1">
                    SUBTASK INSTRUCTION
                  </label>
                  <textarea
                    value={agent.instruction}
                    onChange={(e) => {
                      const text = e.target.value
                      setDrafts((prev) =>
                        prev.map((d) => (d.id === agent.id ? { ...d, instruction: text } : d))
                      )
                    }}
                    rows={3}
                    placeholder="What should this agent do? (e.g. Implement JWT user authentication endpoint in backend/auth.py)"
                    className="w-full bg-[var(--bg-inset)] border border-[var(--border)] rounded p-2.5 text-[12.5px] text-[var(--text)] font-sans focus:outline-none focus:border-[var(--accent)] resize-none"
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleAddAgent}
            className="btn-secondary text-[var(--text)] font-medium text-[12.5px] px-4 py-2 rounded-md border border-[var(--border)] hover:border-[var(--accent)] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>+ Add agent</span>
          </button>

          <button
            onClick={handleLaunchPlan}
            disabled={!isFormValid}
            className={`btn-primary text-[12.5px] font-medium px-5 py-2.5 rounded-md border flex items-center gap-2 transition-all cursor-pointer ${
              !isFormValid
                ? 'opacity-50 cursor-not-allowed border-[var(--border-soft)] bg-[var(--panel-2)] text-[var(--faint)]'
                : 'border-[var(--border)] text-[var(--accent)] hover:border-[var(--accent)] shadow-md'
            }`}
          >
            <Play size={14} />
            <span>Start execution</span>
          </button>
        </div>
      </div>
    </ProjectTabShell>
  )
}
