import { useState } from 'react'
import TopBar from '../components/TopBar'
import LogStream from '../components/LogStream'
import FileExplorer from '../components/FileExplorer'
import ProjectTabShell from './ProjectTabShell'
import { useApp } from '../context/AppContext'
import { useUI } from '../context/UIContext'
import { useWorkspaceFiles } from '../hooks/useWorkspaceFiles'
import { ROLE_META, STATUS_META } from '../data'
import type { AgentRole, Subtask } from '../types'
import { AgentIcon } from '../components/Badges'
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers,
  Terminal,
  Folder,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Code,
  FileText,
  Play,
  Zap,
} from 'lucide-react'

export default function ProjectOverviewPage() {
  const { subtasks, logs, runStatus, taskTitle, errorMessage, clearError } = useApp()
  const { multiMode, setMultiMode, logFilter, setLogFilter } = useUI()
  const { fileTree: workspaceFiles } = useWorkspaceFiles()

  // Selected agent for inline detail inspection
  const [selectedAgentRole, setSelectedAgentRole] = useState<AgentRole>('coder')
  
  // Collapsible panel states for Files (Right) and Terminal (Bottom)
  const [filePanelOpen, setFilePanelOpen] = useState(true)
  const [terminalPanelOpen, setTerminalPanelOpen] = useState(true)

  // Group subtasks by execution group number for parallel DAG visualization
  const groupedSubtasks = subtasks.reduce((acc, st) => {
    const groupNum = st.group || 1
    if (!acc[groupNum]) acc[groupNum] = []
    acc[groupNum].push(st)
    return acc
  }, {} as Record<number, Subtask[]>)

  const groupNumbers = Object.keys(groupedSubtasks).map(Number).sort((a, b) => a - b)

  // Filter logs for selected agent inline drawer
  const selectedAgentLogs = logs.filter((l) => !l.role || l.role === selectedAgentRole)
  const selectedAgentSubtask = subtasks.find((s) => s.role === selectedAgentRole)
  const selectedMeta = ROLE_META[selectedAgentRole] || ROLE_META.coder

  return (
    <ProjectTabShell>
      <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-[#121723] relative z-10 font-sans text-white select-none">
        
        {/* ── Top Bar ────────────────────────────────────────────── */}
        <TopBar
          workspace="SplitterAI Workspace"
          runStatus={runStatus}
          multiMode={multiMode}
          onToggleMulti={() => setMultiMode((p) => !p)}
          subtasks={subtasks}
        />

        {/* ── Execution Error Banner ─────────────────────────────── */}
        {errorMessage && (
          <div className="mx-6 mt-3 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-[13px] flex items-center justify-between flex-shrink-0">
            <span>⚠️ <strong>Execution Error:</strong> {errorMessage}</span>
            <button onClick={clearError} className="text-red-400 hover:text-white font-bold ml-4">✕</button>
          </div>
        )}

        {/* ── Command Center Body (Visualizer + Inline Agent + File Panel) ── */}
        <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
          
          {/* ── LEFT: Master Task & Parallel Agent Visualizer ───── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6 border-r border-[#242C42]">
            
            {/* Master Task Header Card */}
            <div className="rounded-2xl border border-white/10 bg-[#141824] p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-bold">
                  <Cpu size={15} className="text-[#9D8CFC]" />
                  <span>MASTER TASK INSTRUCTION</span>
                </div>
                <span className="text-[11.5px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  {subtasks.length > 0 ? `${subtasks.length} Subtasks Decomposed` : 'Awaiting Task Prompt'}
                </span>
              </div>

              <h2 className="text-[17px] font-bold text-white leading-snug">
                {taskTitle || 'Submit a prompt on Home or click "New Agent Run" to begin master task decomposition.'}
              </h2>
            </div>

            {/* Parallel Agent Visualizer (Grouped Side-by-Side) */}
            <div className="space-y-5">
              <div className="flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-[#9D8CFC]" />
                  <h3 className="text-[15px] font-bold text-white">Parallel Multi-Agent Visualizer</h3>
                </div>
                <span className="text-[12px] font-mono text-neutral-400">
                  Click an agent card to inspect inline details
                </span>
              </div>

              {groupNumbers.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-10 text-center text-neutral-400 space-y-2">
                  <Layers size={32} className="mx-auto opacity-30 text-neutral-400" />
                  <p className="text-[14px] font-semibold text-neutral-300">No Active Agent Visualizer Nodes</p>
                  <p className="text-[12.5px] text-neutral-500">
                    When a task is launched, parallel worker nodes will render side-by-side below.
                  </p>
                </div>
              ) : (
                groupNumbers.map((gNum) => {
                  const groupSubtasks = groupedSubtasks[gNum]
                  return (
                    <div key={gNum} className="space-y-3">
                      <div className="flex items-center gap-2 text-[12px] font-mono text-neutral-400">
                        <span className="w-2 h-2 rounded-full bg-[#9D8CFC]" />
                        <span className="font-bold text-white">Group {gNum} (Parallel Execution)</span>
                        <span className="text-neutral-500">— {groupSubtasks.length} agents running simultaneously</span>
                      </div>

                      {/* Side-by-Side Parallel Agent Cards */}
                      <div className="grid grid-cols-2 gap-4">
                        {groupSubtasks.map((st) => {
                          const meta = ROLE_META[st.role] || ROLE_META.coder
                          const isSelected = selectedAgentRole === st.role
                          const isWorking = st.status === 'running' || st.status === 'working'
                          const isDone = st.status === 'success' || st.status === 'completed'
                          const isError = st.status === 'error' || st.status === 'failed'

                          const progressPct = isDone ? 100 : isWorking ? Math.min(90, (st.steps || 1) * 25) : 0

                          return (
                            <div
                              key={st.id}
                              onClick={() => setSelectedAgentRole(st.role)}
                              className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all cursor-pointer shadow-sm relative overflow-hidden ${
                                isSelected
                                  ? 'border-[#9D8CFC] bg-[#1A2032] shadow-md ring-1 ring-[#9D8CFC]/40'
                                  : 'border-white/[0.08] bg-[#141824] hover:border-white/[0.16] hover:bg-[#181E2E]'
                              } ${isWorking ? 'border-indigo-500/50 shadow-indigo-500/10 animate-pulse' : ''}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs"
                                    style={{ backgroundColor: `${meta.color}22` }}
                                  >
                                    <AgentIcon role={st.role} size={18} />
                                  </div>
                                  <div>
                                    <h4 className="text-[14px] font-bold text-white">{meta.label} Agent</h4>
                                    <span className="text-[10px] font-mono text-neutral-400">Node {st.id}</span>
                                  </div>
                                </div>

                                <span
                                  className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full capitalize border ${
                                    isDone
                                      ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                                      : isError
                                      ? 'bg-red-400/10 text-red-400 border-red-400/20'
                                      : isWorking
                                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                      : 'bg-white/5 text-neutral-400 border-white/10'
                                  }`}
                                >
                                  {st.status || 'pending'}
                                </span>
                              </div>

                              <p className="text-[12.5px] text-neutral-300 line-clamp-2 leading-relaxed font-mono">
                                {st.instruction}
                              </p>

                              {/* Progress bar */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10.5px] font-mono text-neutral-400">
                                  <span>Progress</span>
                                  <span>{progressPct}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${progressPct}%`,
                                      backgroundColor: isError ? '#EF4444' : meta.color,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* ── MIDDLE: Inline Selected Agent Detail Inspection Drawer ─ */}
          <div className="w-[380px] flex-shrink-0 flex flex-col min-h-0 bg-[#101420] border-r border-[#242C42] overflow-y-auto p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${selectedMeta.color}22` }}
                >
                  <AgentIcon role={selectedAgentRole} size={16} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-white">{selectedMeta.label} Detail</h3>
                  <span className="text-[11px] font-mono text-neutral-400">Role: {selectedAgentRole}</span>
                </div>
              </div>

              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                {selectedAgentSubtask?.status || 'idle'}
              </span>
            </div>

            {/* Current Task */}
            <div className="rounded-xl bg-[#141824] border border-white/10 p-3.5 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold block">
                CURRENT INSTRUCTION:
              </span>
              <p className="text-[12.5px] font-mono text-neutral-200 leading-relaxed">
                {selectedAgentSubtask?.instruction || 'No task actively executing for this role.'}
              </p>
            </div>

            {/* Activity Stream */}
            <div className="rounded-xl bg-[#141824] border border-white/10 p-3.5 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold block">
                LIVE ACTIVITY STREAM ({selectedAgentLogs.length}):
              </span>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto font-mono text-[11px]">
                {selectedAgentLogs.length === 0 ? (
                  <p className="text-[11.5px] text-neutral-500 italic">No activity recorded yet.</p>
                ) : (
                  selectedAgentLogs.slice(-6).map((log) => (
                    <div key={log.id} className="p-2 rounded bg-[#101218] border border-white/5 text-neutral-300">
                      <span className="text-neutral-500 text-[10px] mr-1.5">[{log.timestamp}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Generated Output */}
            {selectedAgentSubtask?.output && (
              <div className="rounded-xl bg-[#141824] border border-white/10 p-3.5 space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                  GENERATED OUTPUT:
                </span>
                <div className="p-2.5 rounded bg-[#101218] text-[11.5px] font-mono text-neutral-300 max-h-[140px] overflow-y-auto whitespace-pre-wrap">
                  {selectedAgentSubtask.output}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Collapsible File Explorer Panel (Phase 10) ───── */}
          {filePanelOpen && (
            <div className="w-[300px] flex-shrink-0 flex flex-col min-h-0 bg-[#0E121C] border-r border-[#242C42]">
              <div className="flex items-center justify-between px-3.5 h-10 border-b border-white/[0.08] bg-[#101420]">
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase font-bold text-neutral-300">
                  <Folder size={14} className="text-amber-500" />
                  <span>WORKSPACE FILES</span>
                </div>
                <button onClick={() => setFilePanelOpen(false)} className="text-neutral-500 hover:text-white">
                  <ChevronDown size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                <FileExplorer workspace={DEFAULT_WORKSPACE} />
              </div>
            </div>
          )}
        </div>

        {/* ── BOTTOM DOCK: Collapsible Terminal LogStream (Phase 11) ── */}
        {terminalPanelOpen ? (
          <div className="h-[220px] flex-shrink-0 border-t border-[#242C42] bg-[#0C1019] flex flex-col">
            <div className="flex items-center justify-between px-4 h-8 border-b border-white/[0.08] bg-[#101420] text-[11px] font-mono text-neutral-400">
              <div className="flex items-center gap-2">
                <Terminal size={13} className="text-[#9D8CFC]" />
                <span className="font-bold text-white">SYSTEM TERMINAL LOG STREAM</span>
                <span>({logs.length} total events)</span>
              </div>
              <div className="flex items-center gap-2">
                {!filePanelOpen && (
                  <button onClick={() => setFilePanelOpen(true)} className="text-neutral-400 hover:text-white text-[10.5px]">
                    Show Files Panel
                  </button>
                )}
                <button onClick={() => setTerminalPanelOpen(false)} className="text-neutral-400 hover:text-white">
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <LogStream logs={logs} filter={logFilter} onClearFilter={() => setLogFilter(null)} />
            </div>
          </div>
        ) : (
          <div className="h-8 flex-shrink-0 border-t border-[#242C42] bg-[#101420] px-4 flex items-center justify-between text-[11px] font-mono text-neutral-400 select-none">
            <div className="flex items-center gap-2">
              <Terminal size={13} className="text-[#9D8CFC]" />
              <span>Terminal Output Collapsed ({logs.length} events)</span>
            </div>
            <button onClick={() => setTerminalPanelOpen(true)} className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer">
              <span>Expand Terminal</span>
              <ChevronUp size={13} />
            </button>
          </div>
        )}

      </div>
    </ProjectTabShell>
  )
}
