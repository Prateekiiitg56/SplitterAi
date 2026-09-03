import { useState, useRef, useEffect } from 'react'
import {
  Terminal,
  Maximize2,
  Minimize2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Play,
  Copy,
  Check,
  Cpu,
  CornerDownLeft,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { LogEntry } from '../types'

interface TerminalPanelProps {
  logs: LogEntry[]
  filter?: string | null
  onClearFilter?: () => void
}

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
  shell: 'SHELL',
}

export default function TerminalPanel({ logs, filter }: TerminalPanelProps) {
  const { executeTask } = useApp()

  // State management
  const [collapsed, setCollapsed] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'tools' | 'shell'>('all')
  const [commandInput, setCommandInput] = useState('')
  const [localLogs, setLocalLogs] = useState<LogEntry[]>([])
  const [copied, setCopied] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)

  // Combined logs (props logs + local command executions)
  const allLogs = [...logs, ...localLogs]

  // Filter logs by active tab
  const filteredLogs = allLogs.filter((l) => {
    if (filter && l.subtaskId && l.subtaskId !== filter) return false
    if (activeTab === 'tools') return l.type === 'tool_call' || l.type === 'tool_result'
    if (activeTab === 'shell') return l.type === 'shell' || l.type === 'tool_call'
    return true
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allLogs.length])

  // Actions
  const handleClearTerminal = () => {
    setLocalLogs([])
  }

  const handleCopyLogs = () => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] [${l.type}] ${l.message}`).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRunCommand = async () => {
    const cmd = commandInput.trim()
    if (!cmd) return

    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const userLog: LogEntry = {
      id: `shell-${Date.now()}`,
      timestamp: ts,
      type: 'shell',
      message: `$ ${cmd}`,
    }

    setLocalLogs((prev) => [...prev, userLog])
    setCommandInput('')

    // Trigger backend task execution
    await executeTask(cmd)
  }

  if (collapsed) {
    return (
      <div className="h-8 flex-shrink-0 border-t border-[#242C42] bg-[#101420] px-4 flex items-center justify-between text-[11px] font-mono text-neutral-400 select-none z-20">
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-[#9D8CFC]" />
          <span className="font-bold text-white">Terminal Panel Collapsed</span>
          <span>({allLogs.length} events logged)</span>
        </div>
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-1 text-[#9D8CFC] hover:text-indigo-300 font-semibold cursor-pointer transition-colors"
        >
          <span>Expand Terminal</span>
          <ChevronUp size={13} />
        </button>
      </div>
    )
  }

  const heightClass = maximized ? 'h-[480px]' : 'h-[240px]'

  return (
    <div className={`flex-shrink-0 border-t border-[#242C42] bg-[#0C1019] flex flex-col font-mono text-white select-none transition-all duration-300 z-20 ${heightClass}`}>
      {/* ── IDE Terminal Header Bar ─────────────────────────────── */}
      <div className="flex items-center justify-between h-9 px-4 border-b border-white/[0.08] bg-[#101420] text-[11.5px] flex-shrink-0">
        
        {/* Tabs */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1.5 mr-3 text-white font-bold">
            <Terminal size={14} className="text-[#9D8CFC]" />
            <span>Terminal</span>
          </div>

          {(['all', 'tools', 'shell'] as const).map((tab) => {
            const isAct = activeTab === tab
            const label = tab === 'all' ? 'All Events' : tab === 'tools' ? 'Tool Outputs' : 'Shell Prompt'
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer capitalize ${
                  isAct
                    ? 'bg-[#2B2358] text-white border border-[#48398C]'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Toolbar Controls: Clear, Copy, Maximize, Collapse */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLogs}
            className="p-1.5 rounded hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Copy Output"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>

          <button
            onClick={handleClearTerminal}
            className="p-1.5 rounded hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Clear Terminal Output"
          >
            <Trash2 size={13} />
          </button>

          <button
            onClick={() => setMaximized(!maximized)}
            className="p-1.5 rounded hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title={maximized ? 'Restore Height' : 'Maximize Terminal'}
          >
            {maximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors cursor-pointer ml-1"
            title="Collapse Terminal"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* ── Real Command Input Bar ───────────────────────────── */}
      <div className="px-3 py-1.5 border-b border-white/[0.06] bg-[#0E121C] flex items-center gap-2 text-[12px] flex-shrink-0">
        <span className="text-emerald-400 font-bold">$</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRunCommand()
          }}
          placeholder="Execute sandboxed command (e.g. pytest, python script.py, ls)..."
          className="flex-1 bg-transparent outline-none text-white placeholder:text-neutral-600 font-mono text-[12px]"
        />
        <button
          onClick={handleRunCommand}
          disabled={!commandInput.trim()}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#6E56CF] hover:bg-[#5E46BF] disabled:opacity-40 text-white text-[11px] font-semibold transition-colors cursor-pointer"
        >
          <span>Run</span>
          <CornerDownLeft size={11} />
        </button>
      </div>

      {/* ── Terminal Output Render Stream ─────────────────────── */}
      <div className="flex-1 overflow-y-auto font-mono text-[12px] p-2 bg-[#0B0C10] select-text">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500 text-[11.5px] p-4 text-center">
            <span>Terminal ready — type a command above or run an agent task.</span>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isAlert = log.type === 'sandbox_block' || log.type === 'error'
            const isWarn = log.type === 'model_fallback'
            const isShell = log.type === 'shell'

            return (
              <div
                key={log.id}
                className={`flex gap-2 px-2.5 py-1 leading-relaxed rounded font-mono ${
                  isAlert
                    ? 'bg-red-500/10 text-red-300'
                    : isWarn
                    ? 'bg-amber-500/10 text-amber-300'
                    : isShell
                    ? 'bg-indigo-500/10 text-indigo-300 font-bold'
                    : 'hover:bg-white/[0.04] text-neutral-200'
                }`}
              >
                <span className="w-[58px] flex-shrink-0 text-neutral-500 text-[10.5px] select-none">{log.timestamp}</span>
                <span className="w-[55px] flex-shrink-0 text-[9.5px] font-bold uppercase text-neutral-400 select-none">
                  {typeLabel[log.type] ?? log.type}
                </span>
                <span className="flex-1 min-w-0 break-words">{log.message}</span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
