import { useState, useRef, useEffect } from 'react'
import {
  Terminal,
  Maximize2,
  Minimize2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
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
      <div className="h-8 flex-shrink-0 border-t border-[var(--border)] bg-[var(--panel-2)] px-4 flex items-center justify-between text-[11px] font-mono text-[var(--dim)] select-none z-20">
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-[var(--accent)]" />
          <span className="font-medium text-[var(--text)]">Terminal collapsed</span>
          <span className="text-[var(--faint)]">({allLogs.length} events logged)</span>
        </div>
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-1 text-[var(--accent)] hover:brightness-110 font-medium cursor-pointer transition-[filter]"
        >
          <span>Expand terminal</span>
          <ChevronUp size={13} />
        </button>
      </div>
    )
  }

  const heightClass = maximized ? 'h-[480px]' : 'h-[240px]'

  return (
    <div className={`flex-shrink-0 border-t border-[var(--border)] bg-[var(--panel)] flex flex-col font-mono text-[var(--text)] select-none transition-all duration-300 z-20 ${heightClass}`}>
      {/* ── Terminal header bar ─────────────────────────────── */}
      <div className="flex items-center justify-between h-9 px-4 border-b border-[var(--border-soft)] bg-[var(--panel-2)] text-[11.5px] flex-shrink-0">

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-sans font-medium text-[var(--text)] text-[12px] pr-2 border-r border-[var(--border-soft)]">
            <Terminal size={14} className="text-[var(--accent)]" />
            <span>Terminal Logs</span>
          </div>

          {(['all', 'tools', 'shell'] as const).map((tab) => {
            const isAct = activeTab === tab
            const label = tab === 'all' ? 'All Events' : tab === 'tools' ? 'Tool Outputs' : 'Commands'
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-pressed={isAct}
                className={`px-2.5 py-0.5 rounded-[var(--r-control)] text-[11px] font-medium transition-colors cursor-pointer ${
                  isAct
                    ? 'bg-[var(--accent-quiet)] text-[var(--text)] border border-[var(--accent-edge)] font-semibold'
                    : 'text-[var(--dim)] hover:text-[var(--text)] hover:bg-[var(--panel-3)]'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Toolbar controls: copy, clear, maximize, collapse */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLogs}
            className="p-1.5 rounded-control hover:bg-[var(--panel-3)] text-[var(--dim)] hover:text-[var(--text)] transition-colors cursor-pointer"
            title="Copy output"
            aria-label="Copy output"
          >
            {copied ? <Check size={13} className="text-[var(--good)]" /> : <Copy size={13} />}
          </button>

          <button
            onClick={handleClearTerminal}
            className="p-1.5 rounded-control hover:bg-[var(--panel-3)] text-[var(--dim)] hover:text-[var(--text)] transition-colors cursor-pointer"
            title="Clear terminal output"
            aria-label="Clear terminal output"
          >
            <Trash2 size={13} />
          </button>

          <button
            onClick={() => setMaximized(!maximized)}
            className="p-1.5 rounded-control hover:bg-[var(--panel-3)] text-[var(--dim)] hover:text-[var(--text)] transition-colors cursor-pointer"
            title={maximized ? 'Restore height' : 'Maximize terminal'}
            aria-label={maximized ? 'Restore height' : 'Maximize terminal'}
          >
            {maximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-control hover:bg-[var(--panel-3)] text-[var(--dim)] hover:text-[var(--text)] transition-colors cursor-pointer ml-1"
            title="Collapse terminal"
            aria-label="Collapse terminal"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* ── Command input bar ───────────────────────────── */}
      <div className="px-3 py-1.5 border-b border-[var(--border-soft)] bg-[var(--panel-2)] flex items-center gap-2 text-[12px] flex-shrink-0">
        <span className="text-[var(--good)] font-bold">$</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRunCommand()
          }}
          placeholder="Execute sandboxed command (e.g. pytest, python script.py, ls)..."
          aria-label="Sandboxed command input"
          className="flex-1 bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--faint)] font-mono text-[12px]"
        />
        <button
          onClick={handleRunCommand}
          disabled={!commandInput.trim()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-control bg-[var(--accent)] hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 text-[var(--accent-ink)] text-[11px] font-semibold transition-[filter] cursor-pointer disabled:cursor-not-allowed"
        >
          <span>Run</span>
          <CornerDownLeft size={11} />
        </button>
      </div>

      {/* ── Terminal output render stream ─────────────────────── */}
      <div className="flex-1 overflow-y-auto font-mono text-[12px] p-2 bg-[var(--bg-inset)] select-text">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--faint)] text-[11.5px] p-4 text-center">
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
                    ? 'bg-[var(--bad-quiet)] text-[var(--bad)]'
                    : isWarn
                    ? 'bg-[var(--warn-quiet)] text-[var(--warn)]'
                    : isShell
                    ? 'bg-[var(--accent-quiet)] text-[var(--accent)] font-medium'
                    : 'hover:bg-[var(--panel-2)] text-[var(--text-2)]'
                }`}
              >
                <span className="w-[58px] flex-shrink-0 text-[var(--faint)] text-[10.5px] select-none">{log.timestamp}</span>
                <span className="w-[55px] flex-shrink-0 text-[9.5px] font-bold uppercase text-[var(--faint)] select-none">
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
