import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ROLE_META, AVAILABLE_MODELS } from '../data'
import type { AgentRole, AgentStatus, ModelOption } from '../types'
import { AgentIcon, StatusBadge } from '../components/Badges'
import { Search, Plus } from 'lucide-react'
import { Modal } from '../components/primitives/Modal'
import { Button } from '../components/primitives/Button'
import { TextAreaField, SelectField } from '../components/primitives/Field'

export default function AgentsOverviewPage() {
  const navigate = useNavigate()
  const { subtasks, runStatus, taskTitle, executeTask, addEvent } = useApp()

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [agentOverrides, setAgentOverrides] = useState<Record<string, AgentStatus>>({})

  const [showLaunchModal, setShowLaunchModal] = useState(false)
  const [modalRole, setModalRole] = useState<AgentRole>('coder')
  const [modalTask, setModalTask] = useState('')
  const [modalModel, setModalModel] = useState<ModelOption>(AVAILABLE_MODELS[0])

  const baseRoster: { role: AgentRole; title: string; desc: string; modelChain: string }[] = [
    {
      role: 'coder',
      title: 'Coder — Alpha',
      desc: 'Primary code generation & file editing worker',
      modelChain: 'gemini-3.5-flash → nemotron-3-super',
    },
    {
      role: 'auditor',
      title: 'Auditor — Beta',
      desc: 'Security & PEP 8 compliance scanner',
      modelChain: 'gemini-3.5-flash → nemotron-3-ultra',
    },
    {
      role: 'tester',
      title: 'Tester — Gamma',
      desc: 'Test execution engine & pytest suite verifier',
      modelChain: 'gemini-3.5-flash → grok-2-beta',
    },
    {
      role: 'planner',
      title: 'Planner — Delta',
      desc: 'Task decomposition & DAG architecture generator',
      modelChain: 'gemini-3.5-flash → grok-2-beta',
    },
  ]

  const agents = baseRoster.map((item) => {
    const activeSubtask = subtasks.find((s) => s.role === item.role)
    let status: AgentStatus = agentOverrides[item.role] || 'idle'

    if (!agentOverrides[item.role]) {
      if (activeSubtask) {
        if (activeSubtask.status === 'running' || activeSubtask.status === 'working') {
          status = 'working'
        } else if (activeSubtask.status === 'success' || activeSubtask.status === 'completed') {
          status = 'completed'
        } else if (activeSubtask.status === 'error' || activeSubtask.status === 'failed') {
          status = 'failed'
        }
      } else if (runStatus === 'planning' && item.role === 'planner') {
        status = 'working'
      } else if (runStatus === 'executing' && item.role === 'coder') {
        status = 'working'
      }
    }

    const currentTask = activeSubtask ? activeSubtask.instruction : runStatus !== 'idle' ? taskTitle : null
    const progress = status === 'completed' ? 100 : status === 'working' ? 75 : 0

    return {
      ...item,
      status,
      currentTask,
      progress,
    }
  })

  const filteredAgents = agents.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.desc.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'working'
        ? a.status === 'working'
        : statusFilter === 'idle'
        ? a.status === 'idle'
        : statusFilter === 'failed'
        ? a.status === 'failed'
        : true

    return matchesSearch && matchesStatus
  })

  const handlePause = (role: AgentRole, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = agentOverrides[role] === 'paused' ? 'working' : 'paused'
    setAgentOverrides({ ...agentOverrides, [role]: next })
    addEvent({ role, message: `Agent ${role} execution ${next}` })
  }

  const handleStop = (role: AgentRole, e: React.MouseEvent) => {
    e.stopPropagation()
    setAgentOverrides({ ...agentOverrides, [role]: 'idle' })
    addEvent({ role, message: `Agent ${role} execution stopped` })
  }

  const handleLaunchSubmit = async () => {
    if (!modalTask.trim()) return
    setShowLaunchModal(false)
    await executeTask(modalTask.trim())
    setModalTask('')
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-[var(--bg)] text-[var(--text)] font-sans select-none overflow-hidden relative z-10">
      
      {/* Topbar */}
      <div className="topbar h-[48px] border-b border-[var(--border-soft)] flex items-center justify-between px-5 bg-[var(--bg)] flex-shrink-0">
        <div className="topbar-left flex items-center gap-2.5">
          <span className="topbar-title font-semibold text-[14px]">Agents</span>
        </div>

        <div className="topbar-right">
          <button
            onClick={() => setShowLaunchModal(true)}
            className="btn-primary text-[var(--accent)] font-medium text-[12px] px-3 py-1.5 rounded-md border border-[var(--border)] flex items-center gap-1.5 hover:border-[var(--accent)] transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>Launch agent</span>
          </button>
        </div>
      </div>

      {/* Page Body */}
      <div className="page-body flex-1 overflow-y-auto p-6">
        
        {/* Search & Filter Row */}
        <div className="search-row flex items-center gap-2.5 mb-4">
          <div className="search-box flex-1 max-w-[300px] flex items-center gap-2 border border-[var(--border-soft)] rounded-md px-2.5 py-1.5 bg-[var(--panel)] text-[var(--faint)]">
            <Search size={13} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search agents…"
              className="bg-transparent border-none outline-none text-[var(--text)] text-[12px] w-full placeholder:text-[var(--faint)] font-sans"
            />
          </div>

          <button
            onClick={() => setStatusFilter('all')}
            className={`chip-filter border text-[11.5px] px-2.5 py-1.5 rounded-md font-mono transition-colors cursor-pointer ${statusFilter === 'all' ? 'border-[var(--border)] text-[var(--text)]' : 'border-[var(--border-soft)] text-[var(--faint)]'}`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('working')}
            className={`chip-filter border text-[11.5px] px-2.5 py-1.5 rounded-md font-mono transition-colors cursor-pointer ${statusFilter === 'working' ? 'border-[var(--border)] text-[var(--text)]' : 'border-[var(--border-soft)] text-[var(--faint)]'}`}
          >
            Working
          </button>
          <button
            onClick={() => setStatusFilter('idle')}
            className={`chip-filter border text-[11.5px] px-2.5 py-1.5 rounded-md font-mono transition-colors cursor-pointer ${statusFilter === 'idle' ? 'border-[var(--border)] text-[var(--text)]' : 'border-[var(--border-soft)] text-[var(--faint)]'}`}
          >
            Idle
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`chip-filter border text-[11.5px] px-2.5 py-1.5 rounded-md font-mono transition-colors cursor-pointer ${statusFilter === 'failed' ? 'border-[var(--border)] text-[var(--text)]' : 'border-[var(--border-soft)] text-[var(--faint)]'}`}
          >
            Failed
          </button>
        </div>

        {/* Agent Grid */}
        <div className="agent-grid grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {filteredAgents.map((agent) => {
            const meta = ROLE_META[agent.role]

            return (
              <div
                key={agent.role}
                onClick={() => navigate(`/agents/${agent.role}`)}
                className="agent-card border border-[var(--border-soft)] rounded-[var(--radius)] p-3.5 bg-[var(--panel)] flex flex-col gap-3 hover:border-[var(--border-strong)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.28)] cursor-pointer transition-all"
              >
                {/* Agent Card Top */}
                <div className="agent-card-top flex items-center justify-between">
                  <div className="agent-id flex items-center gap-2.5">
                    <div
                      className="agent-avatar w-7 h-7 rounded-md border border-[var(--border)] flex items-center justify-center flex-shrink-0"
                      style={{ color: meta.color }}
                    >
                      <AgentIcon role={agent.role} size={14} />
                    </div>

                    <div>
                      <div className="agent-name font-medium text-[12.5px] text-[var(--text)]">{agent.title}</div>
                      <div className="agent-role text-[11px] font-mono text-[var(--faint)]">{agent.desc}</div>
                    </div>
                  </div>

                  <StatusBadge status={agent.status} />
                </div>

                {/* Agent Task */}
                <div className="agent-task text-[12px] text-[var(--dim)] line-clamp-2">
                  Current task: <b className="text-[var(--text)] font-medium">{agent.currentTask || 'Idle — ready for task assignment'}</b>
                </div>

                {/* Progress Track */}
                <div className="progress-track h-[3px] rounded-full bg-[var(--border-soft)] overflow-hidden">
                  <div
                    className="progress-fill h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${agent.progress}%`,
                      backgroundColor: agent.status === 'completed' ? 'var(--good)' : agent.status === 'working' ? 'var(--accent)' : 'var(--faint)',
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="agent-card-actions flex gap-3 text-[11.5px] text-[var(--faint)] pt-1 border-t border-[var(--border-soft)]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/agents/${agent.role}`)
                    }}
                    className="hover:text-[var(--text)] transition-colors cursor-pointer"
                  >
                    Open
                  </button>
                  <button
                    onClick={(e) => handlePause(agent.role, e)}
                    className="hover:text-[var(--text)] transition-colors cursor-pointer"
                  >
                    {agent.status === 'paused' ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={(e) => handleStop(agent.role, e)}
                    className="hover:text-[var(--bad)] transition-colors cursor-pointer"
                  >
                    Stop
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Launch Agent Modal */}
      {showLaunchModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius)] p-5 max-w-[420px] w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2">
              <h3 className="text-[14.5px] font-semibold text-[var(--text)] flex items-center gap-2">
                <Plus size={15} className="text-[var(--accent)]" />
                Launch Worker Agent
              </h3>
              <button onClick={() => setShowLaunchModal(false)} className="text-[var(--faint)] hover:text-[var(--text)] cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11.5px] font-mono text-[var(--faint)] block mb-1">Target Agent Role</label>
                <select
                  value={modalRole}
                  onChange={(e) => setModalRole(e.target.value as AgentRole)}
                  className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-[12.5px] text-[var(--text)] font-mono outline-none cursor-pointer"
                >
                  <option value="coder">Coder Agent (Code Generation)</option>
                  <option value="auditor">Auditor Agent (Security & Review)</option>
                  <option value="tester">Tester Agent (Unit Test Suite)</option>
                  <option value="planner">Planner Agent (Architecture DAG)</option>
                </select>
              </div>

              <div>
                <label className="text-[11.5px] font-mono text-[var(--faint)] block mb-1">Instruction Task</label>
                <textarea
                  value={modalTask}
                  onChange={(e) => setModalTask(e.target.value)}
                  placeholder="e.g. Implement authentication module with unit tests..."
                  rows={3}
                  className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded p-2.5 text-[12.5px] text-[var(--text)] font-sans outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-soft)]">
              <button
                onClick={() => setShowLaunchModal(false)}
                className="px-3 py-1.5 rounded border border-[var(--border)] text-[12px] text-[var(--dim)] hover:text-[var(--text)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLaunchSubmit}
                disabled={!modalTask.trim()}
                className="px-4 py-1.5 rounded bg-[var(--accent)] text-[var(--bg)] font-semibold text-[12px] cursor-pointer disabled:opacity-50"
              >
                Launch Agent Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
