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
        {isAlert && <ShieldAlert size={12} className="inline mr-1 -mt-0.5 text-red-400" />}
        {isWarn && <AlertTriangle size={12} className="inline mr-1 -mt-0.5 text-amber-400" />}
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
    <div className="flex-1 flex flex-col min-h-0 p-4 font-mono select-text bg-[#0B0C10]">
      <div className="bg-[#141824] rounded-2xl border border-white/[0.08] shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between h-11 px-4 border-b border-white/[0.08] bg-[#192031] flex-shrink-0 select-none">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-[#9D8CFC]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">
              Terminal Stream
            </span>
            <span className="text-[10.5px] font-mono text-neutral-400">({logs.length})</span>
          </div>

          <div className="flex items-center gap-2">
            {filter && (
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#6E56CF]/40 bg-[#6E56CF]/20 text-[#9D8CFC] text-[10.5px] font-semibold">
                <Filter size={10} />
                <span>{filter}</span>
                <button onClick={onClearFilter} className="cursor-pointer hover:opacity-70">
                  <X size={10} />
                </button>
              </div>
            )}

            <button
              onClick={copyAllLogs}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#101218] border border-white/10 text-[#9FA8C4] hover:text-white text-[11px] cursor-pointer transition-colors"
              title="Copy all logs"
            >
              {copied ? <Check size={12} className="text-[#30A46C]" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Terminal Stream Body */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-[#0C1019]">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500 text-[11.5px]">
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
