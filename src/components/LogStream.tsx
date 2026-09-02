import { useEffect, useRef } from 'react'
import {
  Terminal,
  X,
  Filter,
  AlertTriangle,
  Shield,
} from 'lucide-react'
import type { LogEntry } from '../data'
import { ROLE_META } from '../data'

interface LogStreamProps {
  logs: LogEntry[]
  filter: string | null
  onClearFilter: () => void
}

const typeLabels: Record<string, string> = {
  model_request:  'MODEL',
  model_response: 'MODEL',
  model_fallback: 'FALLBACK',
  tool_call:      'TOOL',
  tool_result:    'RESULT',
  plan_generated: 'PLAN',
  group_start:    'GROUP',
  group_end:      'GROUP',
  subtask_start:  'START',
  subtask_end:    'END',
  sandbox_block:  'BLOCKED',
  info:           'INFO',
  error:          'ERROR',
}

export default function LogStream({ logs, filter, onClearFilter }: LogStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center h-10 px-4 border-b border-border flex-shrink-0 gap-2">
        <Terminal size={14} className="text-text-secondary" />
        <span
          className="text-[12px] text-text-secondary uppercase tracking-wider flex-1"
          style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}
        >
          Live Logs
        </span>
        {filter && (
          <button
            onClick={onClearFilter}
            className="flex items-center gap-1 h-6 px-2 rounded-full bg-primary/10 text-primary text-[11px] hover:bg-primary/15 transition-colors cursor-pointer"
            style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}
          >
            <Filter size={10} />
            {filter}
            <X size={10} />
          </button>
        )}
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {logs.map((log) => {
          const isSandboxBlock = log.type === 'sandbox_block'
          const isError = log.type === 'error'
          const isFallback = log.type === 'model_fallback'

          return (
            <div
              key={log.id}
              className={`flex items-start gap-2 py-1.5 px-2 rounded border-l-2 transition-colors duration-100 log-${log.type} ${
                isSandboxBlock || isError ? 'bg-urgent-red/4' : isFallback ? 'bg-warning/4' : 'hover:bg-hover-bg/50'
              }`}
            >
              {/* Timestamp */}
              <span
                className="text-[10px] text-text-secondary tabular-nums flex-shrink-0 mt-0.5 w-14"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {log.timestamp}
              </span>

              {/* Type badge */}
              <span
                className={`text-[9px] uppercase tracking-wider flex-shrink-0 mt-0.5 w-14 text-center rounded px-1 py-px ${
                  isSandboxBlock ? 'bg-urgent-red/10 text-urgent-red'
                  : isError ? 'bg-urgent-red/10 text-urgent-red'
                  : isFallback ? 'bg-warning/10 text-warning'
                  : 'text-text-secondary'
                }`}
                style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}
              >
                {typeLabels[log.type] ?? log.type}
              </span>

              {/* Role badge (if present) */}
              {log.role && (
                <span
                  className="text-[10px] flex-shrink-0 mt-0.5 px-1.5 rounded"
                  style={{
                    backgroundColor: ROLE_META[log.role].bg,
                    color: ROLE_META[log.role].color,
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 500,
                  }}
                >
                  {ROLE_META[log.role].label}
                </span>
              )}

              {/* Message */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[12px] leading-relaxed break-words ${
                    isSandboxBlock ? 'text-urgent-red' : isError ? 'text-urgent-red' : 'text-text-primary'
                  }`}
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: isSandboxBlock || isError ? 500 : 400 }}
                >
                  {isSandboxBlock && <Shield size={11} className="inline mr-1 -mt-0.5" />}
                  {isFallback && <AlertTriangle size={11} className="inline mr-1 -mt-0.5" />}
                  {log.message}
                </p>
                {/* Expandable detail */}
                {log.detail && (
                  <pre
                    className="mt-1 text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap break-words bg-white/60 rounded p-1.5"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {log.detail}
                  </pre>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Footer status */}
      <div className="flex items-center h-8 px-4 border-t border-border flex-shrink-0">
        <span className="text-[10px] text-text-secondary tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
          {logs.length} entries
        </span>
      </div>
    </div>
  )
}
