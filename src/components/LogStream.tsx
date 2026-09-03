import { useRef, useEffect } from 'react'
import { Terminal, Filter, X, ShieldAlert, AlertTriangle } from 'lucide-react'
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
      className={`flex gap-2 px-3 py-1 text-[11px] leading-relaxed border-b font-mono transition-colors ${
        isAlert
          ? 'bg-red-50 text-red-700 border-red-100'
          : isWarn
          ? 'bg-amber-50 text-amber-800 border-amber-100'
          : 'hover:bg-zinc-100/70 text-zinc-700 border-zinc-200/60'
      }`}
    >
      <span className="w-[52px] flex-shrink-0 text-zinc-400 tabular-nums">{log.timestamp}</span>
      <span className="w-[52px] flex-shrink-0 text-[10px] uppercase font-semibold text-zinc-500">
        {typeLabel[log.type] ?? log.type}
      </span>
      <span className="flex-1 min-w-0 break-words">
        {isAlert && <ShieldAlert size={10} className="inline mr-1 -mt-0.5 text-red-500" />}
        {isWarn && <AlertTriangle size={10} className="inline mr-1 -mt-0.5 text-amber-500" />}
        {log.message}
      </span>
    </div>
  )
}

export default function LogStream({ logs, filter, onClearFilter }: LogStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  return (
    <div className="flex-1 flex flex-col min-h-0 p-4 font-mono select-text" style={{ background: 'var(--color-bg)' }}>
      <div className="card flex-1 flex flex-col min-h-0" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between h-10 px-4 border-b flex-shrink-0" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Terminal size={14} style={{ color: 'var(--color-text-3)' }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-1)' }}>
              Execution Logs
            </span>
            <span className="text-[10px] text-zinc-400">({logs.length})</span>
          </div>

          {filter && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px]" style={{ background: 'rgba(61,139,95,0.08)', borderColor: 'rgba(61,139,95,0.2)', color: 'var(--color-accent)' }}>
              <Filter size={10} />
              <span>{filter}</span>
              <button onClick={onClearFilter} className="cursor-pointer hover:opacity-70">
                <X size={10} />
              </button>
            </div>
          )}
        </div>

        {/* Terminal Stream Body */}
        <div className="flex-1 overflow-y-auto min-h-0" style={{ background: 'var(--color-elevated)' }}>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-[11px]">
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
