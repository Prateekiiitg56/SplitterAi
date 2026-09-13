import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ROLE_META, AVAILABLE_MODELS } from '../data'
import type { AgentRole, AgentStatus, ModelOption } from '../types'
import { AgentIcon, StatusBadge } from '../components/Badges'
import { Search, Plus, Bot } from 'lucide-react'
import { Modal } from '../components/primitives/Modal'
import { Button } from '../components/primitives/Button'
import { PageHeader } from '../components/PageHeader'

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

  const getProgressColor = (status: AgentStatus) => {
    if (status === 'completed') return 'var(--good)'
    if (status === 'working') return 'var(--accent)'
    if (status === 'failed') return 'var(--bad)'
    return 'var(--border-soft)'
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-transparent text-[var(--text)] font-sans select-none overflow-hidden relative z-10">
      <PageHeader
        icon={<Bot size={16} />}
        title="Agents"
        meta="/ roster"
        actions={
          <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowLaunchModal(true)}>
            Launch agent
          </Button>
        }
      />

      {/* Page Body */}
      <div className="page-body flex-1 overflow-y-auto">
        <div className="agents-page">
          {/* Toolbar */}
          <div className="toolbar">
            <div className="field" style={{ flex: 1 }}>
              <Search size={13} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search agents…"
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`chip ${statusFilter === 'all' ? 'active' : ''}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('working')}
                className={`chip ${statusFilter === 'working' ? 'active' : ''}`}
              >
                Working
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('idle')}
                className={`chip ${statusFilter === 'idle' ? 'active' : ''}`}
              >
                Idle
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('failed')}
                className={`chip ${statusFilter === 'failed' ? 'active' : ''}`}
              >
                Failed
              </button>
            </div>

            <span className="count-pill">{filteredAgents.length} agents</span>
          </div>

          {/* Roster Grid */}
          <div className="roster">
            {filteredAgents.map((agent) => {
              const meta = ROLE_META[agent.role] || ROLE_META.coder

              return (
                <div
                  key={agent.role}
                  className="agent-card"
                  onClick={() => navigate(`/agents/${agent.role}`)}
                >
                  <div className="ac-top">
                    <div className="ac-glyph" style={{ color: meta.color }}>
                      <AgentIcon role={agent.role} size={17} />
                    </div>
                    <div>
                      <div className="ac-name">{agent.title}</div>
                      <div className="ac-desc">{agent.desc}</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <StatusBadge status={agent.status} />
                    </div>
                  </div>

                  <div className="ac-task">
                    {agent.currentTask ? agent.currentTask : 'Idle — ready for task assignment'}
                  </div>

                  <div className="ac-progress-track">
                    <div
                      className="ac-progress-fill"
                      style={{
                        width: `${agent.progress}%`,
                        backgroundColor: getProgressColor(agent.status),
                      }}
                    />
                  </div>

                  <div className="ac-foot">
                    <span className="ac-model">{agent.modelChain}</span>
                    <div className="ac-actions">
                      <button
                        type="button"
                        className="btn btn-ghost sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/agents/${agent.role}`)
                        }}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        className="btn btn-quiet sm"
                        onClick={(e) => handlePause(agent.role, e)}
                      >
                        {agent.status === 'paused' ? 'Resume' : 'Pause'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-quiet sm"
                        onClick={(e) => handleStop(agent.role, e)}
                      >
                        Stop
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Launch Strip Banner */}
          <div className="launch-strip">
            <div>
              <div className="lt">Need a custom worker team?</div>
              <div className="ld">Configure roles, task priorities and dependency chains for complex multi-agent runs.</div>
            </div>
            <button
              type="button"
              className="btn btn-ghost sm"
              onClick={() => navigate('/projects/default/agents')}
            >
              Open builder
            </button>
          </div>
        </div>
      </div>

      {/* Launch Agent Modal */}
      <Modal
        open={showLaunchModal}
        onClose={() => setShowLaunchModal(false)}
        title="Launch Worker Agent"
        width={420}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setShowLaunchModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleLaunchSubmit} disabled={!modalTask.trim()}>
              Launch
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-micro font-mono text-[var(--faint)] block mb-1">Target Agent Role</label>
            <select
              value={modalRole}
              onChange={(e) => setModalRole(e.target.value as AgentRole)}
              className="w-full bg-[var(--bg-inset)] border border-[var(--border)] rounded-control px-3 py-2 text-meta text-[var(--text)] font-mono outline-none cursor-pointer"
            >
              <option value="coder">Coder Agent (Code Generation)</option>
              <option value="auditor">Auditor Agent (Security & Review)</option>
              <option value="tester">Tester Agent (Unit Test Suite)</option>
              <option value="planner">Planner Agent (Architecture DAG)</option>
            </select>
          </div>

          <div>
            <label className="text-micro font-mono text-[var(--faint)] block mb-1">Instruction Task</label>
            <textarea
              value={modalTask}
              onChange={(e) => setModalTask(e.target.value)}
              placeholder="e.g. Implement authentication module with unit tests..."
              rows={3}
              className="w-full bg-[var(--bg-inset)] border border-[var(--border)] rounded-control p-2.5 text-meta text-[var(--text)] font-sans outline-none resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}