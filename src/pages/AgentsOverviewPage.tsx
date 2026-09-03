import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ROLE_META, STATUS_META, AVAILABLE_MODELS } from '../data'
import type { AgentRole, AgentStatus, ModelOption } from '../types'
import {
  Users,
  ArrowRight,
  ShieldCheck,
  Code,
  Cpu,
  TestTube,
  Play,
  Pause,
  Square,
  RefreshCw,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react'

export default function AgentsOverviewPage() {
  const navigate = useNavigate()
  const { subtasks, runStatus, taskTitle, executeTask, addEvent } = useApp()

  // Status Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Per-agent pause/stop local overrides
  const [agentOverrides, setAgentOverrides] = useState<Record<string, AgentStatus>>({})

  // Launch Agent Modal state
  const [showLaunchModal, setShowLaunchModal] = useState(false)
  const [modalRole, setModalRole] = useState<AgentRole>('coder')
  const [modalTask, setModalTask] = useState('')
  const [modalModel, setModalModel] = useState<ModelOption>(AVAILABLE_MODELS[0])

  // Define static roster templates
  const baseRoster: { role: AgentRole; title: string; desc: string; icon: any; modelChain: string }[] = [
    {
      role: 'planner',
      title: 'Planner Agent',
      desc: 'Task decomposition engine. Parses user goals into parallel subtasks.',
      icon: Cpu,
      modelChain: 'gemini-3.5-flash → grok-2-beta',
    },
    {
      role: 'coder',
      title: 'Coder Agent',
      desc: 'Primary code generation & file editing worker. Sandboxed ReAct loop.',
      icon: Code,
      modelChain: 'gemini-3.5-flash → nemotron-3-super',
    },
    {
      role: 'auditor',
      title: 'Auditor Agent',
      desc: 'Security & PEP 8 compliance scanner. Analyzes code diffs.',
      icon: ShieldCheck,
      modelChain: 'gemini-3.5-flash → nemotron-3-ultra',
    },
    {
      role: 'tester',
      title: 'Tester Agent',
      desc: 'Test execution engine. Runs pytest and verification suites.',
      icon: TestTube,
      modelChain: 'gemini-3.5-flash → grok-2-beta',
    },
  ]

  // Map real execution state to each agent
  const agents = baseRoster.map((item) => {
    // Find active subtasks for this role
    const activeSubtask = subtasks.find((s) => s.role === item.role)

    // Determine status from real state or local override
    let status: AgentStatus = agentOverrides[item.role] || 'idle'

    if (!agentOverrides[item.role]) {
      if (activeSubtask) {
        if (activeSubtask.status === 'running' || activeSubtask.status === 'working') {
          status = 'working'
        } else if (activeSubtask.status === 'success' || activeSubtask.status === 'completed') {
          status = 'completed'
        } else if (activeSubtask.status === 'error' || activeSubtask.status === 'failed') {
          status = 'failed'
        } else if (activeSubtask.status === 'pending' || activeSubtask.status === 'queued') {
          status = 'queued'
        }
      } else if (runStatus === 'planning' && item.role === 'planner') {
        status = 'working'
      } else if (runStatus === 'executing' && item.role === 'coder') {
        status = 'working'
      }
    }

    // Determine current task
    const currentTask = activeSubtask ? activeSubtask.instruction : runStatus !== 'idle' ? taskTitle : null

    // Determine progress percentage
    let progress = 0
    if (status === 'completed') progress = 100
    else if (status === 'working') progress = activeSubtask?.steps ? Math.min(90, activeSubtask.steps * 20) : 50
    else if (status === 'paused') progress = 45

    return {
      ...item,
      status,
      currentTask,
      progress,
      activeSubtask,
    }
  })

  // Filter agents by status
  const filteredAgents = agents.filter((a) => {
    if (statusFilter === 'all') return true
    return a.status.toLowerCase() === statusFilter.toLowerCase()
  })

  // Action Handlers
  const handlePause = (role: AgentRole) => {
    setAgentOverrides((prev) => ({ ...prev, [role]: 'paused' }))
    addEvent({
      type: 'agent_paused',
      role,
      message: `${ROLE_META[role]?.label || role} Agent paused by user`,
    })
  }

  const handleResume = (role: AgentRole) => {
    setAgentOverrides((prev) => ({ ...prev, [role]: 'working' }))
    addEvent({
      type: 'agent_resumed',
      role,
      message: `${ROLE_META[role]?.label || role} Agent resumed execution`,
    })
  }

  const handleStop = (role: AgentRole) => {
    setAgentOverrides((prev) => ({ ...prev, [role]: 'stopped' }))
    addEvent({
      type: 'agent_stopped',
      role,
      message: `${ROLE_META[role]?.label || role} Agent stopped execution`,
    })
  }

  const handleLaunchNewAgent = async () => {
    if (!modalTask.trim()) return
    setShowLaunchModal(false)
    addEvent({
      type: 'agent_started',
      role: modalRole,
      message: `Launched new ${ROLE_META[modalRole]?.label || modalRole} Agent task: "${modalTask.trim()}"`,
    })
    await executeTask(modalTask.trim())
    setModalTask('')
    navigate(`/projects/default`)
  }

  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-[#121723] overflow-y-auto p-8 text-white relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 select-none">
        <div>
          <h1 className="text-[24px] font-bold text-white tracking-tight flex items-center gap-3">
            <Users className="text-[#9D8CFC]" size={24} />
            <span>Agent Roster & Control Center</span>
          </h1>
          <p className="text-[13px] text-neutral-400 mt-1">
            Configure, launch, and monitor active worker agents across workspaces.
          </p>
        </div>

        <button
          onClick={() => setShowLaunchModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[13px] font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
        >
          <Plus size={15} />
          <span>Launch Agent Task</span>
        </button>
      </div>

      {/* Status Filter Bar */}
      <div className="flex items-center gap-2 mb-6 select-none overflow-x-auto pb-1">
        <Filter size={14} className="text-neutral-500 mr-1 flex-shrink-0" />
        {['all', 'working', 'idle', 'completed', 'failed', 'paused', 'stopped'].map((st) => {
          const isActive = statusFilter === st
          return (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold capitalize transition-colors cursor-pointer flex-shrink-0 ${
                isActive
                  ? 'bg-[#6E56CF] text-white'
                  : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {st}
            </button>
          )
        })}
      </div>

      {/* Agents Roster Grid */}
      {filteredAgents.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-12 text-center text-neutral-400 max-w-[600px] space-y-3 mx-auto my-8">
          <Users size={36} className="mx-auto opacity-30 text-neutral-400" />
          <h3 className="text-[16px] font-bold text-white">No Agents Match Status Filter</h3>
          <p className="text-[13px] text-neutral-400 leading-relaxed">
            There are currently no agents with status "{statusFilter}". Select "All" or launch a new agent task.
          </p>
          <button
            onClick={() => setStatusFilter('all')}
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-[13px] font-semibold cursor-pointer transition-colors"
          >
            Clear Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {filteredAgents.map((a) => {
            const meta = ROLE_META[a.role]
            const statusMeta = STATUS_META[a.status as any] || STATUS_META.pending

            return (
              <div
                key={a.role}
                className="rounded-2xl border border-white/[0.08] bg-[#141824] p-6 flex flex-col justify-between gap-5 hover:border-white/[0.16] transition-all shadow-sm group"
              >
                {/* Agent Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shadow-xs flex-shrink-0"
                      style={{ backgroundColor: `${meta.color}22` }}
                    >
                      <a.icon size={22} style={{ color: meta.color }} />
                    </div>
                    <div>
                      <h3 className="text-[17px] font-bold text-white leading-snug">{a.title}</h3>
                      <span
                        className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-full inline-block mt-0.5"
                        style={{ color: meta.color, backgroundColor: meta.bg }}
                      >
                        {meta.label} Role
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className="text-[11.5px] font-mono font-bold px-3 py-1 rounded-full flex items-center gap-1.5 capitalize border"
                    style={{ color: statusMeta.color, backgroundColor: statusMeta.bg, borderColor: `${statusMeta.color}33` }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'working' ? 'animate-pulse' : ''}`} style={{ backgroundColor: statusMeta.color }} />
                    {a.status}
                  </span>
                </div>

                {/* Description & Current Task */}
                <div className="space-y-2">
                  <p className="text-[13px] text-neutral-400 leading-relaxed">{a.desc}</p>
                  
                  {a.currentTask ? (
                    <div className="p-3 rounded-xl bg-[#101218] border border-white/10 text-[12px] space-y-1 font-mono">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-bold">ACTIVE TASK:</span>
                      <p className="text-neutral-200 truncate">{a.currentTask}</p>
                    </div>
                  ) : (
                    <p className="text-[12px] text-neutral-500 italic font-mono">No task actively assigned to worker.</p>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                    <span>Task Progress</span>
                    <span>{a.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${a.progress}%`,
                        backgroundColor: a.status === 'failed' ? '#EF4444' : a.status === 'paused' ? '#E8710A' : meta.color,
                      }}
                    />
                  </div>
                </div>

                {/* Valid Actions Bar */}
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] text-[12.5px]">
                  <button
                    onClick={() => navigate(`/agents/${a.role}`)}
                    className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer transition-colors"
                  >
                    <span>Open Workspace</span>
                    <ExternalLink size={13} />
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Working Actions: Pause, Stop */}
                    {a.status === 'working' && (
                      <>
                        <button
                          onClick={() => handlePause(a.role)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold cursor-pointer transition-colors"
                        >
                          <Pause size={12} />
                          <span>Pause</span>
                        </button>
                        <button
                          onClick={() => handleStop(a.role)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold cursor-pointer transition-colors"
                        >
                          <Square size={12} />
                          <span>Stop</span>
                        </button>
                      </>
                    )}

                    {/* Paused Actions: Resume, Stop */}
                    {a.status === 'paused' && (
                      <>
                        <button
                          onClick={() => handleResume(a.role)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold cursor-pointer transition-colors"
                        >
                          <Play size={12} />
                          <span>Resume</span>
                        </button>
                        <button
                          onClick={() => handleStop(a.role)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold cursor-pointer transition-colors"
                        >
                          <Square size={12} />
                          <span>Stop</span>
                        </button>
                      </>
                    )}

                    {/* Idle / Completed / Failed / Stopped Actions: Launch Task */}
                    {(a.status === 'idle' || a.status === 'completed' || a.status === 'failed' || a.status === 'stopped') && (
                      <button
                        onClick={() => {
                          setModalRole(a.role)
                          setShowLaunchModal(true)
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#6E56CF] hover:bg-[#5E46BF] text-white font-semibold cursor-pointer transition-colors"
                      >
                        <Play size={12} />
                        <span>Launch Task</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Configure & Launch Agent Modal */}
      {showLaunchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl border border-white/10 bg-[#141824] p-6 max-w-[480px] w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-white">Configure & Launch Agent</h3>
              <button onClick={() => setShowLaunchModal(false)} className="text-neutral-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {/* Select Agent Role */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-neutral-400">Target Agent Role</label>
              <div className="grid grid-cols-4 gap-2">
                {(['planner', 'coder', 'auditor', 'tester'] as AgentRole[]).map((r) => {
                  const isSel = modalRole === r
                  const meta = ROLE_META[r]
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setModalRole(r)}
                      className={`p-2 rounded-xl text-[12px] font-bold capitalize border transition-all cursor-pointer ${
                        isSel
                          ? 'border-[#9D8CFC] bg-[#6E56CF]/20 text-white'
                          : 'border-white/10 bg-[#101218] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Select Model */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-neutral-400">Target LLM Model</label>
              <select
                value={modalModel.id}
                onChange={(e) => {
                  const m = AVAILABLE_MODELS.find((item) => item.id === e.target.value)
                  if (m) setModalModel(m)
                }}
                className="w-full p-2.5 rounded-xl bg-[#101218] border border-white/10 text-[13px] text-white outline-none cursor-pointer"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#141824]">
                    {m.label} ({m.provider})
                  </option>
                ))}
              </select>
            </div>

            {/* Task Prompt Instruction */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-neutral-400">Task Instruction Prompt</label>
              <textarea
                value={modalTask}
                onChange={(e) => setModalTask(e.target.value)}
                placeholder="Enter task instructions for this agent..."
                rows={3}
                className="w-full p-3 rounded-xl bg-[#101218] border border-white/10 text-[13.5px] text-white outline-none focus:border-[#9D8CFC] resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowLaunchModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-[13px] font-medium text-neutral-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLaunchNewAgent}
                disabled={!modalTask.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#6E56CF] hover:bg-[#5E46BF] disabled:opacity-40 text-white text-[13px] font-semibold cursor-pointer shadow-md"
              >
                <Play size={13} />
                <span>Launch Execution</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
