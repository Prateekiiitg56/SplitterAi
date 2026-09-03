import { useParams, useNavigate } from 'react'
import { useState, useRef, useEffect } from 'react'
import {
  ArrowLeft, ChevronDown, ChevronRight, Plus, Terminal, Send,
  Cpu, Folder, MoreHorizontal, FileText, CheckCircle2, Sliders, Shield, AlertTriangle
} from 'lucide-react'
import { mockAgents, ROLE_META, type AgentRole, type LogEntry } from '../data'
import { StatusBadge, AgentBadge, StatusIcon } from '../components/Badges'

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
    <div className={`flex gap-2 px-3 py-1 text-[11px] leading-relaxed border-b font-mono ${
      isAlert ? 'bg-red-50 text-red-700 border-red-100' : isWarn ? 'bg-amber-50 text-amber-800 border-amber-100' : 'hover:bg-zinc-100/70 text-zinc-700 border-zinc-200/60'
    }`}>
      <span className="w-[52px] flex-shrink-0 text-zinc-400 tabular-nums">{log.timestamp}</span>
      <span className="w-[52px] flex-shrink-0 text-[10px] uppercase font-semibold text-zinc-500">{typeLabel[log.type] ?? log.type}</span>
      <span className="flex-1 min-w-0 break-words">
        {isAlert && <Shield size={10} className="inline mr-1 -mt-0.5 text-red-500" />}
        {isWarn && <AlertTriangle size={10} className="inline mr-1 -mt-0.5 text-amber-500" />}
        {log.message}
      </span>
    </div>
  )
}

export default function AgentPage() {
  const { role } = useParams<{ role: string }>()
  let navigate = (path: string) => { window.location.href = path }
  try {
    const nav = useNavigate()
    if (typeof nav === 'function') navigate = nav
  } catch (e) { /* fallback */ }

  const logEndRef = useRef<HTMLDivElement>(null)
  const [isActiveToggle, setIsActiveToggle] = useState(true)
  const [modelSectionOpen, setModelSectionOpen] = useState(true)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(true)
  const [prompt, setPrompt] = useState('')

  const agent = mockAgents.find((a) => a.role === role)
  const meta = role ? ROLE_META[role as AgentRole] : null

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agent?.logs.length])

  if (!agent || !meta) {
    return <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-[13px]" style={{ background: 'var(--color-bg)' }}>Agent not found</div>
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden font-sans" style={{ background: 'var(--color-bg)' }}>
      {/* ── Page Header Bar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between h-12 px-6 border-b flex-shrink-0" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500 cursor-pointer" title="Back to Home">
            <ArrowLeft size={16} />
          </button>
          <AgentBadge role={agent.role} />
          <span className="text-zinc-300">/</span>
          <StatusBadge status={agent.status} />
        </div>
        <div className="flex items-center gap-3 text-[12px] font-mono text-zinc-500">
          <span>{agent.totalRuns} runs</span>
          <span>·</span>
          <span>{agent.successRate}% success rate</span>
        </div>
      </div>

      {/* ── Three-panel / Main content + Right Agent Settings Panel ── */}
      <div className="flex flex-1 min-h-0">
        {/* Center: Agent logs and prompt input */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 p-6 space-y-4">
          <div className="card flex-1 flex flex-col min-h-0" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <Terminal size={14} style={{ color: 'var(--color-text-3)' }} />
              <span className="t-micro">Agent Execution Stream</span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0" style={{ background: 'var(--color-elevated)' }}>
              {agent.logs.map((log) => <LogLine key={log.id} log={log} />)}
              <div ref={logEndRef} />
            </div>
          </div>

          <div className="card p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`Instruct ${meta.label} directly…`}
                className="input-field flex-1"
              />
              <button onClick={() => setPrompt('')} disabled={!prompt.trim()} className="btn-primary">
                <Send size={13} />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Agent Settings (Stacked Sub-cards, Mirroring Reference UI) */}
        <div className="w-[320px] flex-shrink-0 flex flex-col min-h-0 border-l p-5 space-y-4 overflow-y-auto" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
          {/* Header row with Active toggle switch */}
          <div className="flex items-center justify-between pb-2">
            <h3 className="t-section">Agent Settings</h3>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium" style={{ color: 'var(--color-text-2)' }}>Active</span>
              <button
                onClick={() => setIsActiveToggle(!isActiveToggle)}
                className="w-9 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-colors"
                style={{ background: isActiveToggle ? 'var(--color-accent)' : '#D8D5CE' }}
              >
                <div
                  className="w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: isActiveToggle ? 'translateX(16px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          </div>

          {/* Sub-card 1: Model Config (Expanded) */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setModelSectionOpen(!modelSectionOpen)}>
              <div className="flex items-center gap-2">
                {modelSectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-1)' }}>LLM Model</span>
              </div>
              <Plus size={14} style={{ color: 'var(--color-text-3)' }} />
            </div>

            {modelSectionOpen && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="t-label block mb-1">Provider & Model</label>
                  <div className="input-field flex items-center justify-between cursor-pointer">
                    <span className="font-mono text-[12px] truncate">{agent.model}</span>
                    <ChevronDown size={14} style={{ color: 'var(--color-text-3)' }} />
                  </div>
                </div>
                <div>
                  <label className="t-label block mb-1">Temperature</label>
                  <div className="input-field flex items-center justify-between cursor-pointer">
                    <span className="font-mono text-[12px]">0.2 (Deterministic)</span>
                    <ChevronDown size={14} style={{ color: 'var(--color-text-3)' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sub-card 2: Instructions (Collapsed row) */}
          <div className="card p-4">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setInstructionsOpen(!instructionsOpen)}>
              <div className="flex items-center gap-2">
                {instructionsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-1)' }}>System Instructions</span>
              </div>
              <Plus size={14} style={{ color: 'var(--color-text-3)' }} />
            </div>
            {instructionsOpen && (
              <div className="pt-3">
                <textarea
                  rows={3}
                  defaultValue={meta.desc}
                  className="input-field w-full text-[12px] font-mono resize-none"
                />
              </div>
            )}
          </div>

          {/* Sub-card 3: Context / File Tree */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setContextOpen(!contextOpen)}>
              <div className="flex items-center gap-2">
                {contextOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-1)' }}>Context</span>
              </div>
              <Plus size={14} style={{ color: 'var(--color-text-3)' }} />
            </div>

            {contextOpen && (
              <div className="pt-1 space-y-2">
                <p className="t-micro">ON YOUR COMPUTER</p>
                <div className="p-2 rounded-lg border space-y-1.5" style={{ background: 'var(--color-elevated)', borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-1.5 text-[12px] font-mono" style={{ color: 'var(--color-text-1)' }}>
                    <Folder size={13} className="text-amber-600" />
                    <span>D:/projects/webapp</span>
                  </div>
                  <div className="pl-4 flex items-center gap-1.5 text-[11.5px] font-mono text-zinc-500">
                    <FileText size={12} />
                    <span>factorial.py</span>
                  </div>
                  <div className="pl-4 flex items-center gap-1.5 text-[11.5px] font-mono text-zinc-500">
                    <FileText size={12} />
                    <span>test_main.py</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sub-card 4: Integrations */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-1)' }}>Integrations</span>
              <Plus size={14} style={{ color: 'var(--color-text-3)' }} />
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[12.5px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-green)' }} />
                  <span style={{ color: 'var(--color-text-1)' }}>Shell Sandbox</span>
                </div>
                <MoreHorizontal size={14} style={{ color: 'var(--color-text-3)' }} />
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-green)' }} />
                  <span style={{ color: 'var(--color-text-1)' }}>FastAPI Webhook</span>
                </div>
                <MoreHorizontal size={14} style={{ color: 'var(--color-text-3)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
