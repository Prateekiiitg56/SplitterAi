import { useParams, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import {
  ArrowLeft, ChevronDown, ChevronRight, Plus, Terminal, Send,
  Folder, MoreHorizontal, FileText, Shield, AlertTriangle
} from 'lucide-react'
import { mockAgents, ROLE_META, type AgentRole, type LogEntry } from '../data'
import { StatusBadge, AgentBadge } from '../components/Badges'

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
    <div className={`flex gap-2.5 px-3 py-1.5 text-[11px] leading-relaxed border-b font-mono ${
      isAlert ? 'bg-red-50 text-red-800 border-red-100' : isWarn ? 'bg-amber-50 text-amber-900 border-amber-100' : 'hover:bg-[#EFECE6]/60 text-[#1C1E17] border-[#F0EDE6]'
    }`}>
      <span className="w-[54px] flex-shrink-0 text-[#8E9084] tabular-nums select-none">{log.timestamp}</span>
      <span className="w-[56px] flex-shrink-0 text-[10px] uppercase font-bold text-[#6B6E62] select-none">{typeLabel[log.type] ?? log.type}</span>
      <span className="flex-1 min-w-0 break-words">
        {isAlert && <Shield size={11} className="inline mr-1 -mt-0.5 text-red-600" />}
        {isWarn && <AlertTriangle size={11} className="inline mr-1 -mt-0.5 text-amber-600" />}
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
  } catch { /* fallback */ }

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
    return <div className="flex-1 flex items-center justify-center text-[#8E9084] font-mono text-[13px] bg-[#FAF9F6]">Agent not found</div>
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden font-sans bg-[#FAF9F6] text-[#1C1E17]">
      {/* ── Page Header Bar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between h-12 px-6 border-b border-[#E5E2DC] bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg hover:bg-[#EFECE6] text-[#6B6E62] hover:text-[#1C1E17] cursor-pointer transition-colors"
            title="Back to Home"
          >
            <ArrowLeft size={16} />
          </button>
          <AgentBadge role={agent.role} />
          <span className="text-[#D5D2CA]">/</span>
          <StatusBadge status={agent.status} />
        </div>
        <div className="flex items-center gap-3 text-[12px] font-mono text-[#6B6E62]">
          <span>{agent.totalRuns} total runs</span>
          <span>·</span>
          <span>{agent.successRate}% success rate</span>
        </div>
      </div>

      {/* ── Three-panel / Main content + Right Agent Settings Panel ── */}
      <div className="flex flex-1 min-h-0">
        {/* Center: Agent logs and prompt input */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 p-6 space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E2DC] shadow-2xs flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E5E2DC] bg-white flex-shrink-0">
              <Terminal size={14} className="text-[#8E9084]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1C1E17]">
                Agent Execution Stream
              </span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 bg-[#F7F5F0]">
              {agent.logs.map((log) => <LogLine key={log.id} log={log} />)}
              <div ref={logEndRef} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E5E2DC] p-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setPrompt('') } }}
                placeholder={`Instruct ${meta.label} directly…`}
                className="input-ide flex-1"
              />
              <button
                onClick={() => setPrompt('')}
                disabled={!prompt.trim()}
                className="btn-primary"
                style={{ opacity: prompt.trim() ? 1 : 0.5 }}
              >
                <Send size={13} />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Agent Settings (Stacked Sub-cards) */}
        <div className="w-[320px] flex-shrink-0 flex flex-col min-h-0 border-l border-[#E5E2DC] p-5 space-y-4 overflow-y-auto bg-[#FAF9F6]">
          {/* Header row with Active toggle switch */}
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E2DC]">
            <h3 className="text-[15px] font-semibold text-[#1C1E17]">Agent Settings</h3>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-[#6B6E62]">Active</span>
              <button
                onClick={() => setIsActiveToggle(!isActiveToggle)}
                className="w-9 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-colors"
                style={{ background: isActiveToggle ? '#275838' : '#D5D2CA' }}
                aria-checked={isActiveToggle}
                role="switch"
              >
                <div
                  className="w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: isActiveToggle ? 'translateX(16px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          </div>

          {/* Sub-card 1: Model Config */}
          <div className="bg-white rounded-xl border border-[#E5E2DC] p-4 space-y-3 shadow-2xs">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setModelSectionOpen(!modelSectionOpen)}
            >
              <div className="flex items-center gap-2">
                {modelSectionOpen ? <ChevronDown size={14} className="text-[#8E9084]" /> : <ChevronRight size={14} className="text-[#8E9084]" />}
                <span className="text-[13px] font-semibold text-[#1C1E17]">LLM Model</span>
              </div>
              <Plus size={14} className="text-[#8E9084]" />
            </div>

            {modelSectionOpen && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11.5px] font-semibold text-[#6B6E62] block mb-1">Provider & Model</label>
                  <div className="input-ide flex items-center justify-between cursor-pointer">
                    <span className="font-mono text-[12px] truncate">{agent.model}</span>
                    <ChevronDown size={13} className="text-[#8E9084]" />
                  </div>
                </div>
                <div>
                  <label className="text-[11.5px] font-semibold text-[#6B6E62] block mb-1">Temperature</label>
                  <div className="input-ide flex items-center justify-between cursor-pointer">
                    <span className="font-mono text-[12px]">0.2 (Deterministic)</span>
                    <ChevronDown size={13} className="text-[#8E9084]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sub-card 2: Instructions */}
          <div className="bg-white rounded-xl border border-[#E5E2DC] p-4 shadow-2xs">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setInstructionsOpen(!instructionsOpen)}
            >
              <div className="flex items-center gap-2">
                {instructionsOpen ? <ChevronDown size={14} className="text-[#8E9084]" /> : <ChevronRight size={14} className="text-[#8E9084]" />}
                <span className="text-[13px] font-semibold text-[#1C1E17]">System Instructions</span>
              </div>
              <Plus size={14} className="text-[#8E9084]" />
            </div>
            {instructionsOpen && (
              <div className="pt-3">
                <textarea
                  rows={3}
                  defaultValue={meta.desc}
                  className="input-ide w-full text-[12px] font-mono resize-none"
                />
              </div>
            )}
          </div>

          {/* Sub-card 3: Context / File Tree */}
          <div className="bg-white rounded-xl border border-[#E5E2DC] p-4 space-y-3 shadow-2xs">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setContextOpen(!contextOpen)}
            >
              <div className="flex items-center gap-2">
                {contextOpen ? <ChevronDown size={14} className="text-[#8E9084]" /> : <ChevronRight size={14} className="text-[#8E9084]" />}
                <span className="text-[13px] font-semibold text-[#1C1E17]">Context</span>
              </div>
              <Plus size={14} className="text-[#8E9084]" />
            </div>

            {contextOpen && (
              <div className="pt-1 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E9084]">ON YOUR COMPUTER</p>
                <div className="p-2.5 rounded-lg border border-[#E0DDD5] bg-[#F7F5F0] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[12px] font-mono text-[#1C1E17]">
                    <Folder size={13} className="text-amber-600" />
                    <span>D:/projects/webapp</span>
                  </div>
                  <div className="pl-4 flex items-center gap-1.5 text-[11.5px] font-mono text-[#6B6E62]">
                    <FileText size={12} />
                    <span>factorial.py</span>
                  </div>
                  <div className="pl-4 flex items-center gap-1.5 text-[11.5px] font-mono text-[#6B6E62]">
                    <FileText size={12} />
                    <span>test_main.py</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sub-card 4: Integrations */}
          <div className="bg-white rounded-xl border border-[#E5E2DC] p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#1C1E17]">Integrations</span>
              <Plus size={14} className="text-[#8E9084]" />
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[12.5px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#41863E]" />
                  <span className="text-[#1C1E17] font-medium">Shell Sandbox</span>
                </div>
                <MoreHorizontal size={14} className="text-[#8E9084]" />
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#41863E]" />
                  <span className="text-[#1C1E17] font-medium">FastAPI Webhook</span>
                </div>
                <MoreHorizontal size={14} className="text-[#8E9084]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
