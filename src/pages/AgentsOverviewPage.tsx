import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ROLE_META, AVAILABLE_MODELS } from '../data'
import type { AgentRole, AgentStatus, ModelOption } from '../types'
import { AgentIcon, StatusBadge } from '../components/Badges'
import { Search, Plus, Bot } from 'lucide-react'
import { Modal } from '../components/primitives/Modal'
import { Button } from '../components/primitives/Button'
import { SearchField } from '../components/primitives/Field'
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
      title: 'Code Writer',
      desc: 'Writes and edits code files for your project',
      modelChain: 'gemini-3.5-flash → nemotron-3-super',
    },
    {
      role: 'auditor',
      title: 'Code Reviewer',
      desc: 'Checks code for bugs, security issues, and best practices',
      modelChain: 'gemini-3.5-flash → nemotron-3-ultra',
    },
    {
      role: 'tester',
      title: 'Test Runner',
      desc: 'Writes and runs tests to verify your code works',
      modelChain: 'gemini-3.5-flash → grok-2-beta',
    },
    {
      role: 'planner',
      title: 'Task Planner',
      desc: 'Breaks down your goal into smaller steps for other agents',
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
            Start an agent
          </Button>
        }
      />

      {/* Page Body */}
      <div className="page-body flex-1 overflow-y-auto">
        <div className="agents-page">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex-1 min-w-[220px]">
              <SearchField
                label="Search agents"
                placeholder="Search agents by name or role…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(['all', 'working', 'idle', 'failed'] as const).map((filterKey) => (
                <Button
                  key={filterKey}
                  variant={statusFilter === filterKey ? 'primary' : 'quiet'}
                  size="sm"
                  onClick={() => setStatusFilter(filterKey)}
                >
                  {filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}
                </Button>
              ))}
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
                    {agent.currentTask ? agent.currentTask : 'Waiting — ready for a task'}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/agents/${agent.role}`)
                        }}
                      >
                        Open
                      </Button>
                      <Button
                        variant="quiet"
                        size="sm"
                        onClick={(e) => handlePause(agent.role, e)}
                      >
                        {agent.status === 'paused' ? 'Resume' : 'Pause'}
                      </Button>
                      <Button
                        variant="quiet"
                        size="sm"
                        onClick={(e) => handleStop(agent.role, e)}
                      >
                        Stop
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Launch Strip Banner */}
          <div className="launch-strip">
            <div>
              <div className="lt">Want to build your own team of AI helpers?</div>
              <div className="ld">Set up different agents, assign them specific jobs, and let them work together on complex tasks.</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/projects/default/agents')}
            >
              Open builder
            </Button>
          </div>
        </div>
      </div>

      {/* Launch Agent Modal */}
      <Modal
        open={showLaunchModal}
        onClose={() => setShowLaunchModal(false)}
        title="Start an AI Agent"
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
            <label className="text-micro font-mono text-[var(--faint)] block mb-1">Choose Agent Type</label>
            <select
              value={modalRole}
              onChange={(e) => setModalRole(e.target.value as AgentRole)}
              className="w-full bg-[var(--bg-inset)] border border-[var(--border)] rounded-control px-3 py-2 text-meta text-[var(--text)] font-mono outline-none cursor-pointer"
            >
              <option value="coder">Code Writer (Writes & edits code)</option>
              <option value="auditor">Code Reviewer (Checks for bugs & security)</option>
              <option value="tester">Test Runner (Writes & runs tests)</option>
              <option value="planner">Task Planner (Plans & organizes the work)</option>
            </select>
          </div>

          <div>
            <label className="text-micro font-mono text-[var(--faint)] block mb-1">What should the agent do?</label>
            <textarea
              value={modalTask}
              onChange={(e) => setModalTask(e.target.value)}
              placeholder="e.g. Add a login form with email and password..."
              rows={3}
              className="w-full bg-[var(--bg-inset)] border border-[var(--border)] rounded-control p-2.5 text-meta text-[var(--text)] font-sans outline-none resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}