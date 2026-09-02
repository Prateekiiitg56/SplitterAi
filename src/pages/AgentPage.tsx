import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Clock,
  Cpu, ChevronDown, ChevronUp, Shield, AlertTriangle,
  Terminal, Send, Activity,
} from 'lucide-react'
import { mockAgents, ROLE_META, type AgentRole, type LogEntry } from '../data'
import FileExplorer, { mockFileTree } from '../components/FileExplorer'
import QuotaBar, { mockQuotas } from '../components/QuotaBar'

/* ── Log line ─────────────────────────────────────────────────── */
const typeLabel: Record<string, string> = {
  model_request: 'MODEL', model_response: 'RESP', model_fallback: 'FALLBACK',
  tool_call: 'TOOL', tool_result: 'RESULT', plan_generated: 'PLAN',
  group_start: 'GROUP', group_end: 'GROUP', subtask_start: 'START',
  subtask_end: 'END', sandbox_block: 'BLOCK', info: 'INFO', error: 'ERROR',
}
const typeColor: Record<string, string> = {
  model_request: 'text-primary', model_response: 'text-primary',
  model_fallback: 'text-warning', tool_call: 'text-purple',
  tool_result: 'text-success', plan_generated: 'text-primary',
  group_start: 'text-text-secondary', group_end: 'text-text-secondary',
  subtask_start: 'text-success', subtask_end: 'text-success',
  sandbox_block: 'text-urgent-red', info: 'text-text-secondary', error: 'text-urgent-red',
}

function LogLine({ log }: { log: LogEntry }) {
  const isAlert = log.type === 'sandbox_block' || log.type === 'error'
  const isWarn = log.type === 'model_fallback'
  return (
    <div className={`flex gap-0 px-3 py-[5px] text-[11px] leading-tight border-b border-border/40 ${
      isAlert ? 'bg-urgent-red/[0.03]' : isWarn ? 'bg-warning/[0.03]' : 'hover:bg-hover-bg/30'
    }`} style={{ fontFamily: 'var(--font-mono)' }}>
      <span className="w-[58px] flex-shrink-0 text-text-secondary tabular-nums">{log.timestamp}</span>
      <span className={`w-[56px] flex-shrink-0 text-[10px] ${typeColor[log.type] ?? 'text-text-secondary'}`}
        style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
        {typeLabel[log.type] ?? log.type}
      </span>
      <span className={`flex-1 min-w-0 break-words ${isAlert ? 'text-urgent-red' : 'text-text-primary'}`}>
        {isAlert && <Shield size={10} className="inline mr-0.5 -mt-px" />}
        {isWarn && <AlertTriangle size={10} className="inline mr-0.5 -mt-px" />}
        {log.message}
      </span>
    </div>
  )
}

/* ── Agent Page ────────────────────────────────────────────────── */
export default function AgentPage() {
  const { role } = useParams<{ role: string }>()
  const navigate = useNavigate()
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
      <div className="flex-1 flex items-center justify-center text-text-secondary text-[13px]">
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
    // In real app → send prompt to this agent
    setPrompt('')
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Loader2 size={13} className="text-primary animate-spin flex-shrink-0" />
      case 'success': return <CheckCircle2 size={13} className="text-success flex-shrink-0" />
      case 'error':   return <XCircle size={13} className="text-urgent-red flex-shrink-0" />
      default:        return <Clock size={13} className="text-text-secondary flex-shrink-0" />
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 h-11 px-4 border-b border-border flex-shrink-0">
        <button onClick={() => navigate('/')}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover-bg text-text-secondary cursor-pointer">
          <ArrowLeft size={15} />
        </button>

        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px]"
          style={{ backgroundColor: meta.bg, color: meta.color, fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
          {meta.label.charAt(0)}
        </div>

        <span className="text-[14px] text-text-primary" style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
          {meta.label}
        </span>

        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
          isActive ? 'text-white' : agent.status === 'error' ? 'bg-urgent-red/10 text-urgent-red' : 'bg-hover-bg text-text-secondary'
        }`} style={{ backgroundColor: isActive ? meta.color : undefined, fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
          {isActive ? 'Active' : agent.status === 'error' ? 'Error' : 'Idle'}
        </span>

        <div className="flex-1" />

        <div className="flex items-center gap-3 text-[11px] text-text-secondary" style={{ fontFamily: 'var(--font-ui)' }}>
          {agent.model && (
            <span className="flex items-center gap-1">
              <Cpu size={11} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>{agent.model}</span>
            </span>
          )}
          <span>{agent.totalRuns} runs</span>
          <span>{agent.successRate}%</span>
        </div>
      </div>

      {/* ── Main 3-column layout ───────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left col: agent content + logs */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Current task */}
            {isActive && agent.currentTask && (
              <div className="animate-fade-in">
                <p className="text-[10px] text-text-secondary uppercase tracking-wide mb-1"
                  style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
                  Working on
                </p>
                <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-surface">
                  <Loader2 size={13} className="animate-spin flex-shrink-0 mt-0.5" style={{ color: meta.color }} />
                  <div className="min-w-0">
                    <p className="text-[12px] text-text-primary leading-snug">{agent.currentTask}</p>
                    {agent.subtaskId && (
                      <p className="text-[10px] text-text-secondary mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                        {agent.stepsCompleted} steps
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Subtasks */}
            {agent.subtasks.length > 0 && (
              <div>
                <p className="text-[10px] text-text-secondary uppercase tracking-wide mb-1.5"
                  style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
                  Tasks ({agent.subtasks.length})
                </p>
                <div className="space-y-1">
                  {agent.subtasks.map((st) => {
                    const isExp = expandedTasks.has(st.id)
                    return (
                      <div key={st.id} className="rounded-lg border border-border hover:bg-hover-bg/30 transition-colors">
                        <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={() => toggleTask(st.id)}>
                          {statusIcon(st.status)}
                          <p className="flex-1 text-[12px] text-text-primary min-w-0 truncate">{st.instruction}</p>
                          {st.durationMs != null && (
                            <span className="text-[10px] text-text-secondary tabular-nums flex-shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>
                              {(st.durationMs / 1000).toFixed(1)}s
                            </span>
                          )}
                          {st.status === 'running' && !st.durationMs && (
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-dot" style={{ backgroundColor: meta.color }} />
                          )}
                          {isExp ? <ChevronUp size={11} className="text-text-secondary" /> : <ChevronDown size={11} className="text-text-secondary" />}
                        </div>
                        {isExp && (
                          <div className="px-3 pb-2 border-t border-border/50 pt-2 space-y-1 text-[11px] text-text-secondary">
                            {st.model && <p style={{ fontFamily: 'var(--font-mono)' }}><Cpu size={10} className="inline mr-1" />{st.model}</p>}
                            {st.steps != null && <p>{st.steps} steps</p>}
                            {st.output && <p className="p-2 rounded bg-surface text-text-primary" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{st.output}</p>}
                            {st.error && <p className="p-2 rounded bg-urgent-red/5 text-urgent-red" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{st.error}</p>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Logs section */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Terminal size={12} className="text-text-secondary" />
                <p className="text-[10px] text-text-secondary uppercase tracking-wide"
                  style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
                  Logs
                </p>
                <span className="text-[9px] text-text-secondary tabular-nums ml-1" style={{ fontFamily: 'var(--font-mono)' }}>
                  {agent.logs.length}
                </span>
              </div>
              <div className="rounded-lg border border-border overflow-hidden bg-surface">
                {agent.logs.length === 0 ? (
                  <p className="text-[11px] text-text-secondary px-3 py-4 text-center">No logs yet</p>
                ) : (
                  agent.logs.map((log) => <LogLine key={log.id} log={log} />)
                )}
                <div ref={logEndRef} />
              </div>
            </div>

            {/* Idle state */}
            {!isActive && agent.subtasks.length === 0 && (
              <div className="flex flex-col items-center py-10 text-text-secondary gap-1.5">
                <Activity size={24} strokeWidth={1} className="opacity-25" />
                <p className="text-[12px]" style={{ fontFamily: 'var(--font-ui)' }}>
                  {agent.lastActive ? `Last active ${agent.lastActive}` : 'No activity yet'}
                </p>
              </div>
            )}
          </div>

          {/* ── Prompt input ─────────────────────────────────────── */}
          <div className="flex items-center gap-2 h-12 px-4 border-t border-slate-200/80 flex-shrink-0 bg-white/70 backdrop-blur-md">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitPrompt() } }}
              placeholder={`Instruct the ${meta.label}…`}
              className="flex-1 h-8 px-3 rounded-lg bg-search-bg text-[13px] text-text-primary placeholder:text-text-secondary/50 outline-none focus:ring-1 focus:ring-primary/30"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <button
              onClick={handleSubmitPrompt}
              disabled={!prompt.trim()}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-primary text-white cursor-pointer hover:opacity-90 active:scale-95 disabled:opacity-30"
              title="Send"
            >
              <Send size={13} />
            </button>
          </div>
        </div>

        {/* ── Right sidebar: File explorer + Quota ─────────────── */}
        <div className="w-[240px] flex-shrink-0 flex flex-col min-h-0 border-l border-slate-200/80 bg-white/70 backdrop-blur-md">
          {/* File tree */}
          <div className="flex-1 min-h-0">
            <FileExplorer files={mockFileTree} workspace="D:/projects/webapp" />
          </div>

          {/* API quota at bottom */}
          <QuotaBar quotas={mockQuotas} />
        </div>
      </div>
    </div>
  )
}
