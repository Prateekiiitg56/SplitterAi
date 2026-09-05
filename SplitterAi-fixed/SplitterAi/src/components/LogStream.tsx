import { useRef, useEffect, useState } from 'react'
import { Terminal, Filter, X, ShieldAlert, AlertTriangle, Copy, Check } from 'lucide-react'
import type { LogEntry } from '../data'

interface LogStreamProps {
  logs: LogEntry[]
  filter: string | null
  onClearFilter: () => void
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
}

function LogRow({ log }: { log: LogEntry }) {
  const isAlert = log.type === 'sandbox_block' || log.type === 'error'
  const isWarn = log.type === 'model_fallback'

  return (
    <div
      className={`flex gap-2.5 px-3.5 py-1.5 text-[11.5px] leading-relaxed border-b font-mono transition-colors ${
        isAlert
          ? 'bg-[var(--bad-dim)] text-[var(--bad)] border-[var(--bad-quiet)]'
          : isWarn
          ? 'bg-[var(--warn-quiet)] text-[var(--warn)] border-[var(--warn-quiet)]'
          : 'hover:bg-[var(--panel-2)] text-[var(--text-2)] border-[var(--border-soft)]'
      }`}
    >
      <span className="w-[58px] flex-shrink-0 text-[var(--faint)] tabular-nums select-none">{log.timestamp}</span>
      <span className="w-[60px] flex-shrink-0 text-[10px] uppercase font-bold text-[var(--dim)] select-none">
        {typeLabel[log.type] ?? log.type}
      </span>
      <span className="flex-1 min-w-0 break-words">
        {isAlert && <ShieldAlert size={12} className="inline mr-1 -mt-0.5 text-[var(--bad)]" />}
        {isWarn && <AlertTriangle size={12} className="inline mr-1 -mt-0.5 text-[var(--warn)]" />}
        {log.message}
      </span>
    </div>
  )
}

export default function LogStream({ logs, filter, onClearFilter }: LogStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  const copyAllLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.type}] ${l.message}`).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 p-4 font-mono select-text bg-[var(--bg)]">
      <div className="bg-[var(--panel)] rounded-panel border border-[var(--border-soft)] shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between h-11 px-4 border-b border-[var(--border-soft)] bg-[var(--panel-2)] flex-shrink-0 select-none">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-[var(--accent)]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text)]">
              Terminal Stream
            </span>
            <span className="text-[10.5px] font-mono text-[var(--dim)]">({logs.length})</span>
          </div>

          <div className="flex items-center gap-2">
            {filter && (
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[var(--accent-edge)] bg-[var(--accent-quiet)] text-[var(--accent)] text-[10.5px] font-semibold">
                <Filter size={10} />
                <span>{filter}</span>
                <button onClick={onClearFilter} className="cursor-pointer hover:opacity-70">
                  <X size={10} />
                </button>
              </div>
            )}

            <button
              onClick={copyAllLogs}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-[var(--bg-inset)] border border-[var(--border)] text-[var(--dim)] hover:text-[var(--text)] text-[11px] cursor-pointer transition-colors"
              title="Copy all logs"
            >
              {copied ? <Check size={12} className="text-[var(--good)]" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Terminal Stream Body */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-[var(--bg-inset)]">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--faint)] text-[11.5px]">
              <span>No execution logs recorded</span>
            </div>
          ) : (
            logs.map((log) => <LogRow key={log.id} log={log} />)
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
