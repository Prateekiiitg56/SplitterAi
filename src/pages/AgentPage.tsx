import { useParams, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import {
  ArrowLeft, ChevronDown, ChevronRight, Plus, Terminal, Send,
  Folder, MoreHorizontal, FileText, Shield, AlertTriangle,
  Play, CheckCircle2, Clock, Users, Activity
} from 'lucide-react'
import { mockAgents, ROLE_META, type AgentRole, type LogEntry, type AgentInfo } from '../data'
import { StatusBadge, AgentBadge, AgentIcon } from '../components/Badges'

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

export default function AgentPage() {
  const { role: routeRole } = useParams<{ role: string }>()
  let navigate = (path: string) => { window.location.href = path }
  try {
    const nav = useNavigate()
    if (typeof nav === 'function') navigate = nav
  } catch { /* fallback */ }

  const [selectedRole, setSelectedRole] = useState<AgentRole>(
    (routeRole as AgentRole) || 'coder'
  )

  useEffect(() => {
    if (routeRole && (routeRole as AgentRole) !== selectedRole) {
      setSelectedRole(routeRole as AgentRole)
    }
  }, [routeRole])

  const logEndRef = useRef<HTMLDivElement>(null)
  const [isActiveToggle, setIsActiveToggle] = useState(true)
  const [modelSectionOpen, setModelSectionOpen] = useState(true)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(true)
  const [prompt, setPrompt] = useState('')

  const activeAgent = mockAgents.find((a) => a.role === selectedRole) || mockAgents[1]
  const meta = ROLE_META[selectedRole]

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeAgent?.logs.length])

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
            <Users size={16} className="text-[#9D8CFC]" />
            <h1 className="text-[15px] font-bold text-white tracking-tight">
              Multi-Agent Orchestrator
            </h1>
          </div>
          <span className="text-[#2B354F]">|</span>
          <span className="text-[12.5px] text-neutral-400 font-medium">
            4 Active Agent Workers
          </span>
        </div>

        <div className="flex items-center gap-4 text-[12px] font-mono text-neutral-400">
          <span className="flex items-center gap-1.5 text-[#30A46C] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#30A46C] animate-pulse" />
            Live Execution Parallel Pipeline
          </span>
        </div>
      </div>

      {/* ── ALL AGENTS LISTED GRID (Top Multi-Agent Row) ────────── */}
      <div className="p-6 pb-2 border-b border-white/[0.06] bg-[#0E111A]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-semibold text-neutral-300 tracking-tight flex items-center gap-2">
            <Activity size={15} className="text-[#9D8CFC]" />
            <span>All System Agents & Active Work</span>
          </h2>
          <span className="text-[11.5px] font-mono text-neutral-500">
            Click any agent to inspect logs & instruct
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {mockAgents.map((ag) => {
            const agMeta = ROLE_META[ag.role]
            const isSelected = ag.role === selectedRole
            const isRunning = ag.status === 'active'

            return (
              <div
                key={ag.role}
                onClick={() => {
                  setSelectedRole(ag.role)
                  navigate(`/agent/${ag.role}`)
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-[#6E56CF] bg-[#192031] ring-2 ring-[#6E56CF]/30 shadow-md'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.04]'
                }`}
              >
                {/* Agent Role Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-2xs"
                      style={{ backgroundColor: `${agMeta.color}33`, color: agMeta.color }}
                    >
                      <AgentIcon role={ag.role} className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-[13.5px] font-bold text-white leading-none">
                        {agMeta.label}
                      </h3>
                      <span className="text-[11px] font-mono text-neutral-400 mt-1 block">
                        {ag.model}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                      isRunning
                        ? 'bg-[#30A46C]/20 border border-[#30A46C]/40 text-[#30A46C]'
                        : 'bg-white/[0.06] border border-white/10 text-neutral-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isRunning ? 'bg-[#30A46C] animate-pulse' : 'bg-neutral-400'
                      }`}
                    />
                    {isRunning ? 'Working' : 'Idle'}
                  </span>
                </div>

                {/* Current Work Description */}
                <div className="p-2.5 rounded-lg bg-[#101218] border border-white/[0.05]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-0.5">
                    CURRENT TASK
                  </p>
                  <p className="text-[12px] text-neutral-200 line-clamp-2 leading-relaxed">
                    {ag.currentTask || agMeta.desc}
                  </p>
                </div>

                {/* Subtask Stats Pill */}
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 pt-1 border-t border-white/[0.05]">
                  <span>Runs: {ag.totalRuns}</span>
                  <span className="text-[#30A46C] font-semibold">{ag.successRate}% Success</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── SELECTED AGENT INSPECTION & TERMINAL STREAM ──────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Main Log Stream & Prompt Control */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 p-6 space-y-4">
          <div className="bg-[#141824] rounded-xl border border-white/[0.08] shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Header bar for selected agent */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#192031] flex-shrink-0">
              <div className="flex items-center gap-2">
                <Terminal size={15} className="text-[#9D8CFC]" />
                <span className="text-[13px] font-semibold text-white">
                  {meta.label} Execution Stream & Subtask Output
                </span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">
                {activeAgent.logs.length} Log Events
              </span>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-[#0C1019]">
              {activeAgent.logs.map((log) => <LogLine key={log.id} log={log} />)}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Direct Prompt Instruction Input */}
          <div className="bg-[#141824] rounded-xl border border-white/[0.08] p-3 shadow-xs">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setPrompt('') } }}
                placeholder={`Instruct ${meta.label} directly (e.g. "Optimize factorial.py logic")…`}
                className="flex-1 bg-[#101218] border border-white/10 rounded-lg px-3.5 py-2 text-[13px] text-white placeholder:text-neutral-500 outline-none focus:border-[#6E56CF] transition-colors"
              />
              <button
                onClick={() => setPrompt('')}
                disabled={!prompt.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[13px] font-semibold transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
              >
                <Send size={13} />
                <span>Instruct</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Settings Panel for Selected Agent */}
        <div className="w-[320px] flex-shrink-0 flex flex-col min-h-0 border-l border-white/[0.08] p-5 space-y-4 overflow-y-auto bg-[#0E111A]">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <h3 className="text-[14px] font-semibold text-white">Agent Parameters</h3>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-neutral-400">Active</span>
              <button
                onClick={() => setIsActiveToggle(!isActiveToggle)}
                className="w-9 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-colors"
                style={{ background: isActiveToggle ? '#30A46C' : '#2B354F' }}
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

          {/* Model Config Sub-card */}
          <div className="bg-[#141824] rounded-xl border border-white/[0.08] p-4 space-y-3 shadow-2xs">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setModelSectionOpen(!modelSectionOpen)}
            >
              <div className="flex items-center gap-2">
                {modelSectionOpen ? <ChevronDown size={14} className="text-neutral-400" /> : <ChevronRight size={14} className="text-neutral-400" />}
                <span className="text-[13px] font-semibold text-white">LLM Provider</span>
              </div>
              <Plus size={14} className="text-neutral-500" />
            </div>

            {modelSectionOpen && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11.5px] font-medium text-neutral-400 block mb-1">Model Selection</label>
                  <select
                    value={activeAgent.model}
                    onChange={(e) => {
                      activeAgent.model = e.target.value
                      setIsActiveToggle((p) => !p) // re-render
                    }}
                    className="w-full p-2.5 rounded-lg bg-[#101218] border border-white/10 text-white font-mono text-[11.5px] outline-none focus:border-[#6E56CF] cursor-pointer"
                  >
                    <option value="gemini/gemini-3.5-flash">gemini/gemini-3.5-flash</option>
                    <option value="xai/grok-2-beta">xai/grok-2-beta</option>
                    <option value="openrouter/nvidia/nemotron-3-super-120b-a12b:free">openrouter/nemotron-3-super-120b:free</option>
                    <option value="openrouter/nvidia/nemotron-3-ultra-550b-a55b:free">openrouter/nemotron-3-ultra-550b:free</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* System Prompt Instructions */}
          <div className="bg-[#141824] rounded-xl border border-white/[0.08] p-4 shadow-2xs">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setInstructionsOpen(!instructionsOpen)}
            >
              <div className="flex items-center gap-2">
                {instructionsOpen ? <ChevronDown size={14} className="text-neutral-400" /> : <ChevronRight size={14} className="text-neutral-400" />}
                <span className="text-[13px] font-semibold text-white">System Prompt</span>
              </div>
              <Plus size={14} className="text-neutral-500" />
            </div>
            {instructionsOpen && (
              <div className="pt-3">
                <textarea
                  rows={3}
                  defaultValue={meta.desc}
                  className="w-full p-2.5 rounded-lg bg-[#101218] border border-white/10 text-[12px] font-mono text-neutral-300 outline-none resize-none"
                />
              </div>
            )}
          </div>

          {/* Working Context & Files */}
          <div className="bg-[#141824] rounded-xl border border-white/[0.08] p-4 space-y-3 shadow-2xs">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setContextOpen(!contextOpen)}
            >
              <div className="flex items-center gap-2">
                {contextOpen ? <ChevronDown size={14} className="text-neutral-400" /> : <ChevronRight size={14} className="text-neutral-400" />}
                <span className="text-[13px] font-semibold text-white">Working Files</span>
              </div>
              <Plus size={14} className="text-neutral-500" />
            </div>

            {contextOpen && (
              <div className="pt-1 space-y-2">
                <div className="p-2.5 rounded-lg bg-[#101218] border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[12px] font-mono text-white">
                    <Folder size={13} className="text-amber-500" />
                    <span>D:/projects/webapp</span>
                  </div>
                  <div className="pl-4 flex items-center gap-1.5 text-[11.5px] font-mono text-neutral-400">
                    <FileText size={12} />
                    <span>factorial.py</span>
                  </div>
                  <div className="pl-4 flex items-center gap-1.5 text-[11.5px] font-mono text-neutral-400">
                    <FileText size={12} />
                    <span>fizzbuzz.py</span>
                  </div>
                  <div className="pl-4 flex items-center gap-1.5 text-[11.5px] font-mono text-neutral-400">
                    <FileText size={12} />
                    <span>fibonacci.py</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
