import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2, XCircle, Cpu, ArrowRight, Activity } from 'lucide-react'
import { mockAgents, ROLE_META, type AgentInfo } from '../data'

function AgentCard({ agent }: { agent: AgentInfo }) {
  const navigate = useNavigate()
  const meta = ROLE_META[agent.role]
  const isActive = agent.status === 'active'
  const isError = agent.status === 'error'

  return (
    <button
      onClick={() => navigate(`/agent/${agent.role}`)}
      className={`group relative flex flex-col rounded-xl border text-left transition-all duration-150 cursor-pointer ${
        isActive
          ? 'border-l-[3px] hover:bg-hover-bg/50'
          : 'border-border hover:bg-hover-bg/40'
      }`}
      style={{ borderLeftColor: isActive ? meta.color : undefined }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        {/* Status dot */}
        <div className="relative flex-shrink-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[13px]"
            style={{ backgroundColor: meta.bg, color: meta.color, fontFamily: 'var(--font-ui)', fontWeight: 500 }}
          >
            {meta.label.charAt(0)}
          </div>
          {isActive && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white animate-pulse-dot"
              style={{ backgroundColor: meta.color }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-text-primary" style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
              {meta.label}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              isActive ? 'text-white' : isError ? 'bg-urgent-red/10 text-urgent-red' : 'bg-hover-bg text-text-secondary'
            }`} style={{ backgroundColor: isActive ? meta.color : undefined, fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
              {isActive ? 'Active' : isError ? 'Error' : 'Idle'}
            </span>
          </div>
          <p className="text-[11px] text-text-secondary mt-0.5 truncate">
            {meta.desc}
          </p>
        </div>

        <ArrowRight size={14} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>

      {/* Current task (if active) */}
      {isActive && agent.currentTask && (
        <div className="px-4 pb-3">
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-surface">
            <Loader2 size={13} className="animate-spin flex-shrink-0 mt-0.5" style={{ color: meta.color }} />
            <p className="text-[12px] text-text-primary leading-snug" style={{ fontWeight: 400 }}>
              {agent.currentTask}
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border/60 mt-auto">
        {agent.model && (
          <div className="flex items-center gap-1 text-[10px] text-text-secondary min-w-0">
            <Cpu size={10} className="flex-shrink-0" />
            <span className="truncate" style={{ fontFamily: 'var(--font-mono)' }}>{agent.model}</span>
          </div>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-[10px] text-text-secondary flex-shrink-0" style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
          <span>{agent.totalRuns} runs</span>
          <span>{agent.successRate}%</span>
        </div>
      </div>
    </button>
  )
}

export default function HomePage() {
  const activeCount = mockAgents.filter((a) => a.status === 'active').length

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[18px] text-text-primary" style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
          Agents
        </h1>
        <div className="flex items-center gap-2 mt-1.5">
          {activeCount > 0 ? (
            <span className="flex items-center gap-1.5 text-[12px] text-success" style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
              <Activity size={12} />
              {activeCount} active
            </span>
          ) : (
            <span className="text-[12px] text-text-secondary" style={{ fontFamily: 'var(--font-ui)' }}>
              All idle
            </span>
          )}
          <span className="text-[12px] text-text-secondary">·</span>
          <span className="text-[12px] text-text-secondary">{mockAgents.length} total</span>
        </div>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
        {mockAgents.map((agent) => (
          <AgentCard key={agent.role} agent={agent} />
        ))}
      </div>
    </div>
  )
}
