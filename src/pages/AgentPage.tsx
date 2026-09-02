import { useParams, useNavigate } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, Loader2, Cpu, ChevronDown, ChevronUp, Shield, AlertTriangle,
  Terminal, Send, Activity,
} from 'lucide-react'
import { mockAgents, ROLE_META, type AgentRole, type LogEntry } from '../data'
import FileExplorer, { mockFileTree } from '../components/FileExplorer'
import QuotaBar, { mockQuotas } from '../components/QuotaBar'
import { StatusBadge, AgentBadge, StatusIcon } from '../components/Badges'

/* ── Log Line Renderer ────────────────────────────────────────── */
const typeLabel: Record<string, string> = {
  model_request: 'MODEL', model_response: 'RESP', model_fallback: 'FALLBACK',
  tool_call: 'TOOL', tool_result: 'RESULT', plan_generated: 'PLAN',
  group_start: 'GROUP', group_end: 'GROUP', subtask_start: 'START',
  subtask_end: 'END', sandbox_block: 'BLOCK', info: 'INFO', error: 'ERROR',
}

const typeStyle: Record<string, string> = {
  model_fallback: 'text-amber-400 font-bold bg-amber-950/40 px-1 rounded border border-amber-800/50',
  sandbox_block:  'text-red-400 font-bold bg-red-950/40 px-1 rounded border border-red-800/50',
  error:          'text-red-400 font-bold bg-red-950/40 px-1 rounded border border-red-800/50',
}

function LogLine({ log }: { log: LogEntry }) {
  const isAlert = log.type === 'sandbox_block' || log.type === 'error'
  const isWarn = log.type === 'model_fallback'
  return (
    <div className={`flex gap-2 px-3 py-1 text-[11px] leading-relaxed border-b border-slate-800/60 font-mono ${
      isAlert ? 'bg-red-950/30 text-red-200' : isWarn ? 'bg-amber-950/20 text-amber-200' : 'hover:bg-slate-900/60 text-slate-300'
    }`}>
      <span className="w-[56px] flex-shrink-0 text-slate-500 tabular-nums">{log.timestamp}</span>
      <span className={`w-[54px] flex-shrink-0 text-[10px] uppercase ${typeStyle[log.type] ?? 'text-slate-400'}`}>
        {typeLabel[log.type] ?? log.type}
      </span>
      <span className="flex-1 min-w-0 break-words">
        {isAlert && <Shield size={10} className="inline mr-1 -mt-0.5 text-red-400" />}
        {isWarn && <AlertTriangle size={10} className="inline mr-1 -mt-0.5 text-amber-400" />}
        {log.message}
      </span>
    </div>
  )
}

/* ── Agent Detail Page ────────────────────────────────────────── */
export default function AgentPage() {
  const { role } = useParams<{ role: string }>()
  let navigate = (path: string) => { window.location.href = path }
  try {
    const nav = useNavigate()
    if (typeof nav === 'function') navigate = nav
  } catch (e) {
    // fallback
  }
  const logEndRef = useRef<HTMLDivElement>(null)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [prompt, setPrompt] = useState('')

  const agent = mockAgents.find((a) => a.role === role)
  const meta = role ? ROLE_META[role as AgentRole] : null

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agent?.logs.length])

  if (!agent || !meta) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-[13px]">
        Agent not found
      </div>
    )
  }

  const isActive = agent.status === 'active'

  const toggleTask = (id: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSubmitPrompt = () => {
    if (!prompt.trim()) return
    setPrompt('')
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* ── Unified Page Header Bar ──────────────────────────────── */}
      <div className="flex items-center justify-between h-14 px-6 border-b border-slate-200/80 bg-white/70 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
            title="Back to Home"
          >
            <ArrowLeft size={16} />
          </button>

          <AgentBadge role={agent.role} />

          <div className="h-4 w-px bg-slate-300" />

          <StatusBadge status={agent.status} />
        </div>

        <div className="flex items-center gap-4 text-[12px] text-slate-500 font-mono">
          {agent.model && (
            <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              <Cpu size={12} className="text-slate-400" />
              <span>{agent.model}</span>
            </span>
          )}
          <span>{agent.totalRuns} runs</span>
          <span>{agent.successRate}% success rate</span>
        </div>
      </div>

      {/* ── Content Layout ───────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Main Agent Details Column */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Current Active Task Card */}
            {isActive && agent.currentTask && (
              <div className="animate-fade-in">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                  ACTIVE TASK
                </p>
                <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-200/80 bg-blue-50/40 card-depth">
                  <Loader2 size={16} className="animate-spin text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-slate-900 leading-snug">{agent.currentTask}</p>
                    {agent.subtaskId && (
                      <p className="text-[11px] text-slate-500 font-mono mt-1">
                        Subtask ID: {agent.subtaskId} · {agent.stepsCompleted} steps completed
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Role Overview */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                ROLE DESCRIPTION
              </p>
              <p className="text-[14px] text-slate-700 leading-relaxed bg-white/60 p-4 rounded-xl border border-slate-200/80">
                {meta.desc}
              </p>
            </div>

            {/* Agent Subtasks History */}
            {agent.subtasks.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 font-mono">
                  EXECUTED SUBTASKS ({agent.subtasks.length})
                </p>
                <div className="space-y-2">
                  {agent.subtasks.map((st) => {
                    const isExp = expandedTasks.has(st.id)
                    return (
                      <div key={st.id} className="rounded-xl border border-slate-200 bg-white card-depth transition-all">
                        <div
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                          onClick={() => toggleTask(st.id)}
                        >
                          <StatusIcon status={st.status} />
                          <p className="flex-1 text-[13.5px] font-medium text-slate-800 min-w-0 truncate">{st.instruction}</p>
                          {st.durationMs != null && (
                            <span className="text-[11px] font-mono text-slate-500 tabular-nums flex-shrink-0">
                              {(st.durationMs / 1000).toFixed(1)}s
                            </span>
                          )}
                          {isExp ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                        </div>
                        {isExp && (
                          <div className="px-4 pb-3.5 border-t border-slate-100 pt-3 space-y-2 text-[12px] bg-slate-50/40">
                            {st.model && <p className="font-mono text-slate-500 text-[11px]"><Cpu size={11} className="inline mr-1" />{st.model}</p>}
                            {st.output && <pre className="p-3 rounded-md bg-slate-900 text-slate-100 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap">{st.output}</pre>}
                            {st.error && <pre className="p-3 rounded-md bg-red-100 text-red-900 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap">{st.error}</pre>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Logs stream section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Terminal size={13} className="text-slate-500" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  AGENT LOG STREAM
                </p>
                <span className="text-[10px] font-mono text-slate-400 ml-1">
                  ({agent.logs.length} entries)
                </span>
              </div>
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                {agent.logs.length === 0 ? (
                  <p className="text-[11px] font-mono text-slate-500 px-4 py-6 text-center">No logs recorded for this agent</p>
                ) : (
                  agent.logs.map((log) => <LogLine key={log.id} log={log} />)
                )}
                <div ref={logEndRef} />
              </div>
            </div>

            {!isActive && agent.subtasks.length === 0 && (
              <div className="flex flex-col items-center py-12 text-slate-400 gap-2">
                <Activity size={28} strokeWidth={1.25} className="opacity-30" />
                <p className="text-[13px] font-medium" style={{ fontFamily: 'var(--font-sans)' }}>
                  {agent.lastActive ? `Last active at ${agent.lastActive}` : 'No activity recorded'}
                </p>
              </div>
            )}
          </div>

          {/* ── Command Console Instruction Input ──────────────────── */}
          <div className="p-4 border-t border-slate-200/80 bg-white/80 backdrop-blur-md flex-shrink-0">
            <div className="rounded-xl border border-slate-200 bg-white input-depth overflow-hidden flex items-center gap-3 px-4 py-3 focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/15">
              <span className="text-accent font-mono font-bold text-lg select-none leading-none -mt-0.5">
                &gt;
              </span>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitPrompt() } }}
                placeholder={`Instruct ${meta.label} directly…`}
                className="flex-1 text-[14px] text-slate-900 outline-none bg-transparent placeholder:text-slate-400"
              />
              <button
                onClick={handleSubmitPrompt}
                disabled={!prompt.trim()}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                  prompt.trim()
                    ? 'bg-accent text-white hover:bg-accent-hover shadow-xs active:scale-95'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
                title="Send instruction"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right sidebar: File explorer + API Quotas ─────────── */}
        <div className="w-[240px] flex-shrink-0 flex flex-col min-h-0 border-l border-slate-200/80 bg-white/70 backdrop-blur-md">
          <div className="flex-1 min-h-0">
            <FileExplorer files={mockFileTree} workspace="D:/projects/webapp" />
          </div>
          <QuotaBar quotas={mockQuotas} />
        </div>
      </div>
    </div>
  )
}
