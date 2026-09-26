import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProjectTabShell from './ProjectTabShell'
import { useApp } from '../context/AppContext'
import { ROLE_META } from '../data'
import type { AgentRole, Subtask } from '../types'
import { AgentIcon } from '../components/Badges'
import { Users, Plus, Trash2, Play, Edit2, Check } from 'lucide-react'
import { Button } from '../components/primitives/Button'

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
      instruction: 'Implement authentication API endpoints and user models.',
      runsAfter: 'agent-1',
    },
  ])

  // Group calculation logic matching orchestrator dependency ordering
  const groupMap: Record<string, number> = {}
  let changed = true
  drafts.forEach((a) => { groupMap[a.id] = 1 })
  while (changed) {
    changed = false
    drafts.forEach((a) => {
      if (a.runsAfter && groupMap[a.runsAfter]) {
        const newGroup = groupMap[a.runsAfter] + 1
        if (newGroup > groupMap[a.id]) {
          groupMap[a.id] = newGroup
          changed = true
        }
      }
    })
  }

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
      <div className="flex-1 overflow-y-auto">
        <div className="agents-body">
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-4 mb-4">
            <div>
              <h2 className="text-strong font-semibold text-[var(--text)] flex items-center gap-2">
                <Users size={16} className="text-[var(--accent)]" />
                <span>Manual Agent Pipeline Builder</span>
              </h2>
              <p className="text-meta text-[var(--faint)] mt-0.5 font-mono">
                Construct custom agent execution steps with dependency chains.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Play size={13} fill="currentColor" />}
              disabled={!isFormValid}
              onClick={handleLaunchPlan}
            >
              Start execution
            </Button>
          </div>

          {/* Master Task Title Input */}
          <div className="p-3.5 border border-[var(--border-soft)] rounded-panel bg-[var(--panel)] mb-4 space-y-1.5">
            <label className="text-micro font-mono uppercase tracking-wider text-[var(--faint)] font-bold block">
              MASTER TASK TITLE
            </label>
            <input
              type="text"
              value={masterTitle}
              onChange={(e) => setMasterTitle(e.target.value)}
              aria-label="Master task title"
              placeholder="e.g. Build REST API & test suite"
              className="w-full bg-[var(--bg-inset)] border border-[var(--border)] rounded-control px-3 py-1.5 text-ui text-[var(--text)] font-medium outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Draft Agent Cards */}
          <div className="space-y-3 mb-4">
            {drafts.map((agent, index) => {
              const precedingAgents = drafts.slice(0, index)

              return (
                <div key={agent.id} className="draft-row">
                  <div>
                    <select
                      aria-label={`Role for ${agent.label}`}
                      value={agent.role}
                      onChange={(e) =>
                        setDrafts((prev) =>
                          prev.map((d) => (d.id === agent.id ? { ...d, role: e.target.value as AgentRole } : d))
                        )
                      }
                    >
                      <option value="planner">Planner</option>
                      <option value="coder">Coder</option>
                      <option value="auditor">Auditor</option>
                      <option value="tester">Tester</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      aria-label={`Instruction for ${agent.label}`}
                      value={agent.instruction}
                      onChange={(e) =>
                        setDrafts((prev) =>
                          prev.map((d) => (d.id === agent.id ? { ...d, instruction: e.target.value } : d))
                        )
                      }
                      placeholder="Specify instruction task for this agent..."
                    />

                    {precedingAgents.length > 0 && (
                      <select
                        aria-label={`Dependency for ${agent.label}`}
                        style={{ width: '130px', flexShrink: 0 }}
                        value={agent.runsAfter || ''}
                        onChange={(e) =>
                          setDrafts((prev) =>
                            prev.map((d) =>
                              d.id === agent.id ? { ...d, runsAfter: e.target.value || null } : d
                            )
                          )
                        }
                      >
                        <option value="">Runs parallel</option>
                        {precedingAgents.map((p) => (
                          <option key={p.id} value={p.id}>
                            After {p.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {editingLabelId === agent.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={tempLabelValue}
                          onChange={(e) => setTempLabelValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(agent.id)
                            if (e.key === 'Escape') setEditingLabelId(null)
                          }}
                          autoFocus
                          className="px-1.5 py-0.5 text-micro font-mono bg-[var(--bg-inset)] border border-[var(--accent)] rounded text-[var(--text)] outline-none"
                        />
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label="Save label"
                          onClick={() => handleSaveRename(agent.id)}
                        >
                          <Check size={12} className="text-[var(--good)]" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="role-pill cursor-pointer hover:border-[var(--accent)]"
                        title="Click to rename agent"
                        aria-label={`Rename ${agent.label}`}
                        onClick={() => handleStartRename(agent)}
                        style={{
                          background: 'var(--panel-2)',
                          border: '1px solid var(--border)',
                          color: ROLE_META[agent.role]?.color || 'var(--text)',
                        }}
                      >
                        <AgentIcon role={agent.role} size={12} />
                        <span>{agent.label}</span>
                        <Edit2 size={10} className="ml-1 opacity-50 hover:opacity-100" aria-hidden="true" />
                      </button>
                    )}

                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Delete agent"
                      onClick={() => handleDeleteAgent(agent.id)}
                    >
                      <Trash2 size={13} style={{ color: 'var(--bad)' }} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" icon={<Plus size={13} />} onClick={handleAddAgent}>
              Add agent node
            </Button>

            <Button
              variant="primary"
              size="md"
              icon={<Play size={13} fill="currentColor" />}
              disabled={!isFormValid}
              onClick={handleLaunchPlan}
            >
              Start execution
            </Button>
          </div>
        </div>
      </div>
    </ProjectTabShell>
  )
}