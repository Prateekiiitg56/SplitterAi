import { useEffect, useRef } from 'react'
import { Terminal, X, Filter, Shield, AlertTriangle } from 'lucide-react'
import type { LogEntry } from '../data'

interface LogStreamProps {
  logs: LogEntry[]
  filter: string | null
  onClearFilter: () => void
}

const typeLabel: Record<string, string> = {
  model_request:  'MODEL',
  model_response: 'RESP',
  model_fallback: 'FALLBACK',
  tool_call:      'TOOL',
  tool_result:    'RESULT',
  plan_generated: 'PLAN',
  group_start:    'GROUP',
  group_end:      'GROUP',
  subtask_start:  'START',
  subtask_end:    'END',
  sandbox_block:  'BLOCK',
  info:           'INFO',
  error:          'ERROR',
}

// Restrained log tag coloring — strong colors reserved for warnings & errors
const tagStyle: Record<string, string> = {
  model_request:  'text-slate-400 font-mono',
  model_response: 'text-slate-400 font-mono',
  model_fallback: 'text-amber-400 font-bold bg-amber-950/40 px-1 rounded border border-amber-800/50',
  tool_call:      'text-slate-400 font-mono',
  tool_result:    'text-slate-400 font-mono',
  plan_generated: 'text-slate-300 font-mono',
  group_start:    'text-slate-500 font-mono',
  group_end:      'text-slate-500 font-mono',
  subtask_start:  'text-slate-400 font-mono',
  subtask_end:    'text-slate-400 font-mono',
  sandbox_block:  'text-red-400 font-bold bg-red-950/40 px-1 rounded border border-red-800/50',
  info:           'text-slate-500 font-mono',
  error:          'text-red-400 font-bold bg-red-950/40 px-1 rounded border border-red-800/50',
}

export default function LogStream({ logs, filter, onClearFilter }: LogStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-mono border-l border-slate-200/80">
      {/* Terminal Header Bar */}
      <div className="flex items-center h-10 px-4 border-b border-slate-800 bg-slate-900/90 flex-shrink-0">
        <Terminal size={13} className="text-slate-400 mr-2" />
        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex-1 font-mono">
          EXECUTION LOGS
        </span>
        {filter && (
          <button
            onClick={onClearFilter}
            className="flex items-center gap-1 h-5 px-2 rounded bg-blue-950 border border-blue-800 text-blue-300 text-[10px] cursor-pointer hover:bg-blue-900"
          >
            <Filter size={9} />
            <span>{filter}</span>
            <X size={9} />
          </button>
        )}
        <span className="text-[10px] text-slate-500 tabular-nums ml-2 font-mono">
          {logs.length} entries
        </span>
      </div>

      {/* Terminal Stream Rows */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 select-text">
        {logs.map((log) => {
          const isBlock = log.type === 'sandbox_block' || log.type === 'error'
          const isFallback = log.type === 'model_fallback'

          return (
            <div
              key={log.id}
              className={`flex items-start gap-2 px-2 py-1 text-[11px] leading-relaxed rounded border-l-2 ${
                isBlock
                  ? 'bg-red-950/30 border-red-500 text-red-200'
                  : isFallback
                  ? 'bg-amber-950/20 border-amber-500 text-amber-200'
                  : 'border-transparent hover:bg-slate-900/70 text-slate-300'
              }`}
            >
              {/* Timestamp */}
              <span className="w-[56px] flex-shrink-0 text-slate-500 tabular-nums">
                {log.timestamp}
              </span>

              {/* Tag */}
              <span className={`w-[54px] flex-shrink-0 text-[10px] uppercase ${tagStyle[log.type] ?? 'text-slate-400'}`}>
                {typeLabel[log.type] ?? log.type}
              </span>

              {/* Role badge if available */}
              {log.role && (
                <span className="text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-300 font-semibold flex-shrink-0">
                  {log.role}
                </span>
              )}

              {/* Log Message */}
              <div className="flex-1 min-w-0 break-words">
                <span className={isBlock ? 'text-red-300 font-medium' : isFallback ? 'text-amber-300' : 'text-slate-200'}>
                  {isBlock && <Shield size={10} className="inline mr-1 -mt-0.5 text-red-400" />}
                  {isFallback && <AlertTriangle size={10} className="inline mr-1 -mt-0.5 text-amber-400" />}
                  {log.message}
                </span>
                {log.detail && (
                  <pre className="mt-1 text-[10.5px] text-slate-400 bg-slate-900/90 p-2 rounded border border-slate-800 whitespace-pre-wrap">
                    {log.detail}
                  </pre>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
