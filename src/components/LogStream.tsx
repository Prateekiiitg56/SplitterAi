import { useEffect, useRef } from 'react'
import { Terminal, X, Filter, Shield, AlertTriangle } from 'lucide-react'
import type { LogEntry } from '../data'
import { ROLE_META } from '../data'

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

const typeColor: Record<string, string> = {
  model_request:  'text-primary',
  model_response: 'text-primary',
  model_fallback: 'text-warning',
  tool_call:      'text-purple',
  tool_result:    'text-success',
  plan_generated: 'text-primary',
  group_start:    'text-text-secondary',
  group_end:      'text-text-secondary',
  subtask_start:  'text-success',
  subtask_end:    'text-success',
  sandbox_block:  'text-urgent-red',
  info:           'text-text-secondary',
  error:          'text-urgent-red',
}

export default function LogStream({ logs, filter, onClearFilter }: LogStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center h-10 px-3 border-b border-border flex-shrink-0">
        <Terminal size={13} className="text-text-secondary mr-1.5" />
        <span className="text-[11px] text-text-secondary uppercase tracking-wide flex-1"
          style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
          Logs
        </span>
        {filter && (
          <button onClick={onClearFilter}
            className="flex items-center gap-1 h-5 px-1.5 rounded bg-primary/10 text-primary text-[10px] cursor-pointer hover:bg-primary/15"
            style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
            <Filter size={9} />
            {filter}
            <X size={9} />
          </button>
        )}
        <span className="text-[10px] text-text-secondary tabular-nums ml-2"
          style={{ fontFamily: 'var(--font-mono)' }}>
          {logs.length}
        </span>
      </div>

      {/* Log lines */}
      <div className="flex-1 overflow-y-auto py-1">
        {logs.map((log) => {
          const isAlert = log.type === 'sandbox_block' || log.type === 'error'
          const isWarn = log.type === 'model_fallback'

          return (
            <div key={log.id}
              className={`flex gap-0 px-2 py-[5px] text-[11px] leading-tight border-b border-border/40 ${
                isAlert ? 'bg-urgent-red/[0.03]' : isWarn ? 'bg-warning/[0.03]' : 'hover:bg-hover-bg/40'
              }`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {/* Time */}
              <span className="w-[58px] flex-shrink-0 text-text-secondary tabular-nums">
                {log.timestamp}
              </span>

              {/* Type */}
              <span className={`w-[52px] flex-shrink-0 text-[10px] ${typeColor[log.type] ?? 'text-text-secondary'}`}
                style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
                {typeLabel[log.type] ?? log.type}
              </span>

              {/* Role */}
              <span className="w-[48px] flex-shrink-0 text-[10px]"
                style={{
                  color: log.role ? ROLE_META[log.role].color : 'transparent',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 500,
                }}>
                {log.role ? ROLE_META[log.role].label : ''}
              </span>

              {/* Message */}
              <span className={`flex-1 min-w-0 break-words ${isAlert ? 'text-urgent-red' : 'text-text-primary'}`}>
                {isAlert && <Shield size={10} className="inline mr-0.5 -mt-px" />}
                {isWarn && <AlertTriangle size={10} className="inline mr-0.5 -mt-px" />}
                {log.message}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
