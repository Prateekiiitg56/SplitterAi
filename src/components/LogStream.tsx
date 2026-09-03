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
      className={`flex gap-2.5 px-3 py-1.5 text-[11px] leading-relaxed border-b font-mono transition-colors ${
        isAlert
          ? 'bg-red-50 text-red-800 border-red-100'
          : isWarn
          ? 'bg-amber-50 text-amber-900 border-amber-100'
          : 'hover:bg-[#EFECE6]/60 text-[#1C1E17] border-[#F0EDE6]'
      }`}
    >
      <span className="w-[54px] flex-shrink-0 text-[#8E9084] tabular-nums select-none">{log.timestamp}</span>
      <span className="w-[56px] flex-shrink-0 text-[10px] uppercase font-bold text-[#6B6E62] select-none">
        {typeLabel[log.type] ?? log.type}
      </span>
      <span className="flex-1 min-w-0 break-words">
        {isAlert && <ShieldAlert size={11} className="inline mr-1 -mt-0.5 text-red-600" />}
        {isWarn && <AlertTriangle size={11} className="inline mr-1 -mt-0.5 text-amber-600" />}
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
    <div className="flex-1 flex flex-col min-h-0 p-4 font-mono select-text bg-[#FAF9F6]">
      <div className="bg-white rounded-xl border border-[#E5E2DC] shadow-2xs flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between h-10 px-4 border-b border-[#E5E2DC] bg-white flex-shrink-0 select-none">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-[#8E9084]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1C1E17]">
              Terminal Execution Stream
            </span>
            <span className="text-[10px] text-[#8E9084]">({logs.length})</span>
          </div>

          <div className="flex items-center gap-2">
            {filter && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#275838]/30 bg-[#275838]/10 text-[#275838] text-[10px] font-semibold">
                <Filter size={10} />
                <span>{filter}</span>
                <button onClick={onClearFilter} className="cursor-pointer hover:opacity-70">
                  <X size={10} />
                </button>
              </div>
            )}

            <button
              onClick={copyAllLogs}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#EFECE6] text-[#6B6E62] text-[11px] cursor-pointer transition-colors"
              title="Copy all logs"
            >
              {copied ? <Check size={12} className="text-[#41863E]" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Terminal Stream Body */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-[#F7F5F0]">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#8E9084] text-[11px]">
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
