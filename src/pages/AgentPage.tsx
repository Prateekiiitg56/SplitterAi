import { useParams, useNavigate } from 'react'
import { useState, useRef, useEffect } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Terminal,
  Folder,
  FileText,
  Shield,
  AlertTriangle,
  Play,
  Pause,
  Square,
  Activity,
  Loader2,
  Cpu,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { ROLE_META } from '../data'
import type { AgentRole, LogEntry, AgentStatus } from '../types'
import { AgentIcon } from '../components/Badges'
import { useAgentDetail } from '../hooks/useAgentDetail'
import { useWorkspaceFiles } from '../hooks/useWorkspaceFiles'
import { useUI } from '../context/UIContext'
import { useApp } from '../context/AppContext'
import { DEFAULT_WORKSPACE } from '../config'

const typeLabel: Record<string, string> = {
  model_request: 'MODEL',
  model_response: 'RESP',
  model_fallback: 'FALLBACK',
  tool_call: 'TOOL',
  tool_result: 'RESULT',
  plan_generated: 'PLAN',
  group_start: 'GROUP',
  group_end: 'GROUP',
  subtask_start: 'START',
  subtask_end: 'END',
  sandbox_block: 'BLOCK',
  info: 'INFO',
  error: 'ERROR',
}

function LogLine({ log }: { log: LogEntry }) {
  const isAlert = log.type === 'sandbox_block' || log.type === 'error'
  const isWarn = log.type === 'model_fallback'
  return (
    <div
      className={`flex gap-2.5 px-3.5 py-2 text-[11.5px] leading-relaxed border-b font-mono ${
        isAlert
          ? 'bg-red-500/10 text-red-300 border-red-500/20'
          : isWarn
          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
          : 'hover:bg-white/[0.04] text-neutral-200 border-white/[0.05]'
      }`}
    >
      <span className="w-[58px] flex-shrink-0 text-neutral-500 tabular-nums select-none">{log.timestamp}</span>
      <span className="w-[60px] flex-shrink-0 text-[10px] uppercase font-bold text-neutral-400 select-none">
        {typeLabel[log.type] ?? log.type}
      </span>
      <span className="flex-1 min-w-0 break-words">
        {isAlert && <Shield size={12} className="inline mr-1 -mt-0.5 text-red-400" />}
        {isWarn && <AlertTriangle size={12} className="inline mr-1 -mt-0.5 text-amber-400" />}
        {log.message}
      </span>
    </div>
  )
}

export function AgentPage() {
  const { agentId, role: routeRole } = useParams<{ agentId?: string; role?: string }>()
  const effectiveRole = (agentId || routeRole || 'coder') as AgentRole

  const navigate = useNavigate()
  const { selectedRole, setSelectedRole } = useUI()
  const { logs: globalLogs, subtasks, runStatus, taskTitle, executeTask } = useApp()

  useEffect(() => {
    if (effectiveRole && effectiveRole !== selectedRole) {
      setSelectedRole(effectiveRole)
    }
  }, [effectiveRole, selectedRole, setSelectedRole])

  const { agentData, loading, error } = useAgentDetail(selectedRole)
  const { fileTree: workspaceFiles } = useWorkspaceFiles(DEFAULT_WORKSPACE)

  const logEndRef = useRef<HTMLDivElement>(null)
  const [modelSectionOpen, setModelSectionOpen] = useState(true)
  const [contextOpen, setContextOpen] = useState(true)
  const [localStatusOverride, setLocalStatusOverride] = useState<AgentStatus | null>(null)

  const meta = ROLE_META[selectedRole] || ROLE_META.coder

  // 1. Real State Filtering for Activity Log Stream
  const agentLogs = (globalLogs && globalLogs.length > 0)
    ? globalLogs.filter((l) => !l.role || l.role === selectedRole)
    : (agentData?.logs || [])

  // 2. Active Subtask & Real Work State
  const activeSubtask = subtasks.find((s) => s.role === selectedRole)

  // 3. Derived Agent Status
  let agentStatus: AgentStatus = localStatusOverride || 'idle'
  if (!localStatusOverride) {
    if (activeSubtask) {
      if (activeSubtask.status === 'running' || activeSubtask.status === 'working') agentStatus = 'working'
      else if (activeSubtask.status === 'success' || activeSubtask.status === 'completed') agentStatus = 'completed'
      else if (activeSubtask.status === 'error' || activeSubtask.status === 'failed') agentStatus = 'failed'
    } else if (runStatus === 'planning' && selectedRole === 'planner') {
      agentStatus = 'working'
    } else if (runStatus === 'executing' && selectedRole === 'coder') {
      agentStatus = 'working'
    }
  }

  // 4. Progress calculation
  let progress = 0
  if (agentStatus === 'completed') progress = 100
  else if (agentStatus === 'working') progress = activeSubtask?.steps ? Math.min(90, activeSubtask.steps * 20) : 55
  else if (agentStatus === 'paused') progress = 45

  // 5. Terminal Process Output Filter
  const terminalLogs = agentLogs.filter((l) => l.type === 'tool_result' || l.type === 'tool_call')

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentLogs.length])

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden font-sans bg-[#0B0C10] text-white select-none relative z-10">
      
      {/* ── 1. SECTION 1: HEADER & CONTROLS ───────────────────────── */}
      <div className="px-6 py-4 border-b border-white/[0.08] bg-[#121723] flex-shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/agents')}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white cursor-pointer transition-colors border border-white/10"
            title="Back to Agent Management"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs" style={{ backgroundColor: `${meta.color}22` }}>
            <AgentIcon role={selectedRole} size={20} />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[18px] font-bold text-white tracking-tight">{meta.label} Worker Agent</h1>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full capitalize bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                {agentStatus}
              </span>
            </div>
            <p className="text-[12px] text-neutral-400 mt-0.5 flex items-center gap-3 font-mono">
              <span>Project: <strong className="text-neutral-200">SplitterAI Workspace</strong></span>
              <span>Task: <strong className="text-indigo-300 truncate max-w-[280px]">{activeSubtask?.instruction || taskTitle || 'Idle'}</strong></span>
            </p>
          </div>
        </div>

        {/* Status-Valid Control Actions */}
        <div className="flex items-center gap-2">
          {agentStatus === 'working' && (
            <>
              <button
                onClick={() => setLocalStatusOverride('paused')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[12.5px] font-semibold transition-colors cursor-pointer"
              >
                <Pause size={13} />
                <span>Pause</span>
              </button>
              <button
                onClick={() => setLocalStatusOverride('stopped')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[12.5px] font-semibold transition-colors cursor-pointer"
              >
                <Square size={13} />
                <span>Stop</span>
              </button>
            </>
          )}

          {agentStatus === 'paused' && (
            <>
              <button
                onClick={() => setLocalStatusOverride('working')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[12.5px] font-semibold transition-colors cursor-pointer"
              >
                <Play size={13} />
                <span>Resume</span>
              </button>
              <button
                onClick={() => setLocalStatusOverride('stopped')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[12.5px] font-semibold transition-colors cursor-pointer"
              >
                <Square size={13} />
                <span>Stop</span>
              </button>
            </>
          )}

          {(agentStatus === 'idle' || agentStatus === 'completed' || agentStatus === 'failed' || agentStatus === 'stopped') && (
            <button
              onClick={() => executeTask(`Run verification suite for ${meta.label}`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[12.5px] font-semibold transition-colors cursor-pointer shadow-sm"
            >
              <Play size={13} />
              <span>Launch Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Switcher Bar */}
      <div className="flex items-center gap-2 px-6 py-2 bg-[#0E121C] border-b border-white/[0.06] flex-shrink-0 overflow-x-auto">
        {(['planner', 'coder', 'auditor', 'tester'] as AgentRole[]).map((r) => {
          const isSel = selectedRole === r
          const rMeta = ROLE_META[r]
          return (
            <button
              key={r}
              onClick={() => {
                setSelectedRole(r)
                navigate(`/agents/${r}`)
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                isSel
                  ? 'bg-[#2B2358] text-white border border-[#48398C]'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <AgentIcon role={r} size={14} />
              <span>{rMeta.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* Left Column: Current Work, Activity Log Stream & Output */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-white/[0.08] overflow-y-auto p-6 space-y-6">
          
          {/* ── 2. SECTION 2: CURRENT WORK ───────────────────────────── */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#141824] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-[#9D8CFC]" />
                <h3 className="text-[14px] font-bold text-white">Current Work</h3>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">{progress}% Completed</span>
            </div>

            {activeSubtask ? (
              <div className="space-y-3">
                <p className="text-[13.5px] font-medium text-white leading-relaxed">{activeSubtask.instruction}</p>
                <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden">
                  <div className="h-full rounded-full bg-[#9D8CFC] transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : (
              <p className="text-[12.5px] text-neutral-500 italic">No work currently in progress for this agent.</p>
            )}
          </section>

          {/* ── 3. SECTION 3: ACTIVITY LOG STREAM ─────────────────────── */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#141824] overflow-hidden flex flex-col min-h-[260px]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] bg-[#101218]">
              <div className="flex items-center gap-2 text-[13px] font-bold text-white">
                <Terminal size={15} className="text-[#9D8CFC]" />
                <span>Agent Activity Stream</span>
              </div>
              <span className="text-[11px] font-mono text-neutral-500">{agentLogs.length} events</span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[320px] font-mono text-[12px]">
              {agentLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-neutral-500 gap-1.5 text-center">
                  <Activity size={24} className="opacity-30" />
                  <p className="text-[13px] font-semibold text-neutral-400">No activity yet.</p>
                  <p className="text-[11px] text-neutral-600">Events stream here live when tasks execute.</p>
                </div>
              ) : (
                agentLogs.map((log) => <LogLine key={log.id} log={log} />)
              )}
              <div ref={logEndRef} />
            </div>
          </section>

          {/* ── 4. SECTION 4: AGENT OUTPUT ───────────────────────────── */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#141824] p-5 space-y-3">
            <h3 className="text-[14px] font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Generated Agent Output</span>
            </h3>

            {activeSubtask?.output ? (
              <div className="p-4 rounded-xl bg-[#101218] border border-white/10 text-[12.5px] font-mono text-neutral-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {activeSubtask.output}
              </div>
            ) : (
              <p className="text-[12.5px] text-neutral-500 italic">No output generated yet.</p>
            )}
          </section>

          {/* ── 6. SECTION 6: TERMINAL / PROCESS OUTPUT (If present) ───── */}
          {terminalLogs.length > 0 && (
            <section className="rounded-2xl border border-white/[0.08] bg-[#101218] p-5 space-y-3">
              <h3 className="text-[14px] font-bold text-white flex items-center gap-2 font-mono">
                <Terminal size={15} className="text-indigo-400" />
                <span>Process Subprocess Log</span>
              </h3>
              <div className="space-y-1 font-mono text-[11.5px] text-neutral-300">
                {terminalLogs.map((t) => (
                  <div key={t.id} className="p-2 rounded bg-black/40 border border-white/5 truncate">
                    <span className="text-neutral-500 mr-2">[{t.timestamp}]</span>
                    <span>{t.message}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Files & Model Fallback Chain */}
        <div className="w-[340px] flex-shrink-0 flex flex-col bg-[#121723] overflow-y-auto p-5 space-y-5 border-l border-white/[0.08]">
          
          {/* ── 5. SECTION 5: FILES CREATED / MODIFIED ───────────────── */}
          <div className="rounded-xl bg-[#101218] border border-white/10 p-4 space-y-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
              <Folder size={15} className="text-amber-500" />
              <span>Files Modified / Created</span>
            </div>

            <div className="space-y-1.5 font-mono text-[11.5px]">
              {workspaceFiles.length === 0 ? (
                <p className="text-[12px] text-neutral-500 italic">No files modified by this agent yet.</p>
              ) : (
                workspaceFiles.slice(0, 10).map((f) => (
                  <div key={f.path || f.name} className="flex items-center justify-between p-2 rounded-lg bg-[#141824] border border-white/10 text-neutral-300">
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={13} className="text-neutral-500 flex-shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <span className="text-[10px] text-neutral-500">{f.size || '1.2KB'}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Model Fallback Chain */}
          <div className="rounded-xl bg-[#101218] border border-white/10 p-4 space-y-3">
            <button
              onClick={() => setModelSectionOpen(!modelSectionOpen)}
              className="w-full flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Cpu size={15} className="text-[#9D8CFC]" />
                <span className="text-[13px] font-semibold text-white">Model Fallback Chain</span>
              </div>
              {modelSectionOpen ? <ChevronDown size={14} className="text-neutral-400" /> : <ChevronRight size={14} className="text-neutral-400" />}
            </button>

            {modelSectionOpen && (
              <div className="space-y-1.5 font-mono text-[11.5px] pt-1">
                {(agentData?.modelChain || ['gemini/gemini-3.5-flash', 'xai/grok-2-beta']).map((m, idx) => (
                  <div key={m} className="p-2 rounded-lg bg-[#141824] border border-white/10 flex items-center justify-between text-neutral-300">
                    <span>{idx + 1}. {m}</span>
                    <span className="text-[9.5px] uppercase font-bold text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-500/20">Active</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default AgentPage
