import { useParams, useNavigate } from 'react'
import { useState, useRef, useEffect } from 'react'
import {
  ArrowLeft, ChevronDown, ChevronRight, Plus, Terminal, Send,
  Folder, MoreHorizontal, FileText, Shield, AlertTriangle,
  Play, CheckCircle2, Clock, Users, Activity, Loader2
} from 'lucide-react'
import { ROLE_META, type AgentRole, type LogEntry, type AgentInfo } from '../data'
import { StatusBadge, AgentBadge, AgentIcon } from '../components/Badges'
import { fetchAgentDetail } from '../lib/api'
import { DEFAULT_WORKSPACE } from '../config'

const typeLabel: Record<string, string> = {
  model_request: 'MODEL', model_response: 'RESP', model_fallback: 'FALLBACK',
  tool_call: 'TOOL', tool_result: 'RESULT', plan_generated: 'PLAN',
  group_start: 'GROUP', group_end: 'GROUP', subtask_start: 'START',
  subtask_end: 'END', sandbox_block: 'BLOCK', info: 'INFO', error: 'ERROR',
}

function LogLine({ log }: { log: LogEntry }) {
  const isAlert = log.type === 'sandbox_block' || log.type === 'error'
  const isWarn = log.type === 'model_fallback'
  return (
    <div className={`flex gap-2.5 px-3.5 py-2 text-[11.5px] leading-relaxed border-b font-mono ${
      isAlert ? 'bg-red-500/10 text-red-300 border-red-500/20' : isWarn ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'hover:bg-white/[0.04] text-neutral-200 border-white/[0.05]'
    }`}>
      <span className="w-[58px] flex-shrink-0 text-neutral-500 tabular-nums select-none">{log.timestamp}</span>
      <span className="w-[60px] flex-shrink-0 text-[10px] uppercase font-bold text-neutral-400 select-none">{typeLabel[log.type] ?? log.type}</span>
      <span className="flex-1 min-w-0 break-words">
        {isAlert && <Shield size={12} className="inline mr-1 -mt-0.5 text-red-400" />}
        {isWarn && <AlertTriangle size={12} className="inline mr-1 -mt-0.5 text-amber-400" />}
        {log.message}
      </span>
    </div>
  )
}

export function AgentPage() {
  const { role: routeRole } = useParams<{ role: string }>()
  let navigate = (path: string) => { window.location.href = path }
  try {
    const nav = useNavigate()
    if (typeof nav === 'function') navigate = nav
  } catch { /* fallback */ }

  const [selectedRole, setSelectedRole] = useState<AgentRole>(
    (routeRole as AgentRole) || 'coder'
  )

  const [agentData, setAgentData] = useState<AgentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (routeRole && (routeRole as AgentRole) !== selectedRole) {
      setSelectedRole(routeRole as AgentRole)
    }
  }, [routeRole])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    fetchAgentDetail(selectedRole)
      .then((data) => {
        if (active) {
          setAgentData(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || `Failed to fetch agent details for ${selectedRole}`)
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [selectedRole])

  const logEndRef = useRef<HTMLDivElement>(null)
  const [modelSectionOpen, setModelSectionOpen] = useState(true)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(true)
  const [prompt, setPrompt] = useState('')

  const meta = ROLE_META[selectedRole]

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentData?.logs?.length])

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden font-sans bg-[#0B0C10] text-white select-none">
      {/* ── Top Bar with Return Navigation & Overview Title ──────── */}
      <div className="flex items-center justify-between h-14 px-6 border-b border-white/[0.08] bg-[#121723] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-neutral-400 hover:text-white cursor-pointer transition-colors"
            title="Back to Home"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <AgentIcon role={selectedRole} size={18} />
            <span className="text-[14px] font-bold text-white tracking-tight">{meta.label} Worker Agent</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[12px] font-mono text-neutral-400">
            Workspace: <span className="text-white font-semibold">{DEFAULT_WORKSPACE}</span>
          </span>
          <button
            onClick={() => navigate('/run')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[12.5px] font-semibold transition-colors cursor-pointer"
          >
            <Play size={13} className="fill-current" />
            <span>Launch Pipeline</span>
          </button>
        </div>
      </div>

      {/* Role Navigation Bar */}
      <div className="flex items-center gap-2 px-6 py-2.5 bg-[#0E121C] border-b border-white/[0.06] flex-shrink-0 overflow-x-auto">
        {(['planner', 'coder', 'auditor', 'tester'] as AgentRole[]).map((r) => {
          const rMeta = ROLE_META[r]
          const isSelected = selectedRole === r
          return (
            <button
              key={r}
              onClick={() => {
                setSelectedRole(r)
                navigate(`/agent/${r}`)
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#2B2358] text-white border border-[#48398C] shadow-sm'
                  : 'hover:bg-white/[0.04] text-neutral-400 hover:text-white border border-transparent'
              }`}
            >
              <AgentIcon role={r} size={15} />
              <span>{rMeta.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main Agent Details Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Column: Log Output & Interactive Task Input */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-white/[0.08] bg-[#0B0C10]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-neutral-400">
              <Loader2 size={24} className="animate-spin text-[#9D8CFC]" />
              <span className="text-[13px] font-mono">Loading agent details for {selectedRole}...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
              <AlertTriangle size={28} className="text-amber-400" />
              <p className="text-[14px] font-semibold text-white">Agent Detail Error</p>
              <p className="text-[12.5px] text-neutral-400 max-w-[400px]">{error}</p>
              <button
                onClick={() => setSelectedRole(selectedRole)}
                className="mt-2 px-4 py-1.5 rounded-lg bg-[#2B2358] hover:bg-[#382F6D] text-white text-[12px] font-semibold cursor-pointer border border-[#48398C]"
              >
                Retry Fetch
              </button>
            </div>
          ) : (
            <>
              {/* Agent Overview Stats Bar */}
              <div className="grid grid-cols-4 gap-4 p-4 border-b border-white/[0.08] bg-[#121723] flex-shrink-0">
                <div className="p-3 rounded-xl bg-[#101218] border border-white/10">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase">STATUS</p>
                  <p className="text-[13px] font-mono font-bold text-emerald-400 capitalize mt-0.5">{agentData?.status || 'idle'}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#101218] border border-white/10">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase">ACTIVE MODEL</p>
                  <p className="text-[12px] font-mono font-bold text-[#9D8CFC] truncate mt-0.5">{agentData?.model || 'gemini-3.5-flash'}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#101218] border border-white/10">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase">TOTAL RUNS</p>
                  <p className="text-[13px] font-mono font-bold text-white mt-0.5">{agentData?.totalRuns || 1}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#101218] border border-white/10">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase">SUCCESS RATE</p>
                  <p className="text-[13px] font-mono font-bold text-emerald-400 mt-0.5">{agentData?.successRate || 100}%</p>
                </div>
              </div>

              {/* Logs Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-[#141824] border-b border-white/[0.06] text-[12px] font-semibold text-neutral-300">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-[#9D8CFC]" />
                  <span>Real-Time Execution Logs</span>
                </div>
                <span className="text-[11px] font-mono text-neutral-500">{agentData?.logs?.length || 0} events</span>
              </div>

              {/* Log Stream Output */}
              <div className="flex-1 overflow-y-auto font-mono text-[12px]">
                {(!agentData?.logs || agentData.logs.length === 0) ? (
                  <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-2 select-none p-6">
                    <Activity size={24} className="opacity-40" />
                    <p className="text-[13px]">No active logs recorded for {meta.label}.</p>
                    <p className="text-[11px] text-neutral-600">Logs stream live when tasks execute.</p>
                  </div>
                ) : (
                  agentData.logs.map((log) => <LogLine key={log.id} log={log} />)
                )}
                <div ref={logEndRef} />
              </div>
            </>
          )}
        </div>

        {/* Right Column: Parameters & Model Chain Configuration */}
        <div className="w-[340px] flex-shrink-0 flex flex-col bg-[#121723] overflow-y-auto p-4 space-y-4">
          <div className="rounded-xl bg-[#101218] border border-white/10 p-4 space-y-3">
            <button
              onClick={() => setModelSectionOpen(!modelSectionOpen)}
              className="w-full flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-[#9D8CFC]" />
                <span className="text-[13px] font-semibold text-white">Model Fallback Chain</span>
              </div>
              {modelSectionOpen ? <ChevronDown size={14} className="text-neutral-400" /> : <ChevronRight size={14} className="text-neutral-400" />}
            </button>

            {modelSectionOpen && (
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Fallback order for {meta.label} when primary API limits occur:
                </p>
                <div className="space-y-1.5 font-mono text-[11.5px]">
                  {(agentData?.modelChain || ['gemini/gemini-3.5-flash', 'xai/grok-2-beta']).map((m, idx) => (
                    <div key={m} className="p-2 rounded-lg bg-[#141824] border border-white/10 flex items-center justify-between text-neutral-300">
                      <span>{idx + 1}. {m}</span>
                      <span className="text-[9.5px] uppercase font-bold text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-500/20">Active</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-[#101218] border border-white/10 p-4 space-y-3">
            <button
              onClick={() => setContextOpen(!contextOpen)}
              className="w-full flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Folder size={14} className="text-amber-500" />
                <span className="text-[13px] font-semibold text-white">Workspace Files</span>
              </div>
              {contextOpen ? <ChevronDown size={14} className="text-neutral-400" /> : <ChevronRight size={14} className="text-neutral-400" />}
            </button>

            {contextOpen && (
              <div className="space-y-1.5 font-mono text-[11.5px] pt-1">
                <div className="p-2 rounded-lg bg-[#141824] border border-white/10 text-neutral-300 truncate">
                  {DEFAULT_WORKSPACE}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AgentPage
