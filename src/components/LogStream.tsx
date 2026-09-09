import { useRef, useEffect, useState, useMemo } from 'react'
import {
  Terminal,
  Filter,
  X,
  ShieldAlert,
  AlertTriangle,
  Copy,
  Check,
  ArrowDown,
  Search,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import type { LogEntry } from '../data'
import { RoleBadge } from './Badges'

interface LogStreamProps {
  logs: LogEntry[]
  filter?: string | null
  onClearFilter?: () => void
}

const TYPE_TO_ROLE: Record<string, string> = {
  planner: 'planner',
  coder: 'coder',
  auditor: 'auditor',
  tester: 'tester',
}

function ToolCallDetails({ toolName, details }: { toolName: string; details?: string }) {
  const [expanded, setExpanded] = useState(false)
  if (!details) return null

  const isLong = details.length > 120 || details.includes('\n')

  return (
    <div className="mt-1 ml-4 border-l-2 border-[var(--accent)] pl-2 text-micro font-mono text-[var(--dim)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[var(--accent)] font-semibold hover:underline cursor-pointer"
      >
        {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <span>tool: {toolName}</span>
      </button>
      {expanded ? (
        <pre className="mt-1 p-2 rounded bg-[var(--panel)] border border-[var(--border)] overflow-x-auto text-micro whitespace-pre-wrap text-[var(--text-2)]">
          {details}
        </pre>
      ) : isLong ? (
        <div className="text-[var(--faint)] truncate max-w-xl cursor-pointer" onClick={() => setExpanded(true)}>
          {details.slice(0, 80)}... <span className="text-[var(--accent)] text-micro">(click to view)</span>
        </div>
      ) : (
        <div className="text-[var(--text-2)]">{details}</div>
      )}
    </div>
  )
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-[var(--accent)] text-[var(--accent-ink)] px-0.5 rounded font-semibold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

export default function LogStream({ logs, filter, onClearFilter }: LogStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | null>(filter || null)
  const [copied, setCopied] = useState(false)
  const [userScrolledUp, setUserScrolledUp] = useState(false)

  // Auto-scroll logic
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setUserScrolledUp(false)
  }

  useEffect(() => {
    if (!userScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [logs.length, userScrolledUp])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isBottom = scrollHeight - scrollTop - clientHeight < 40
    setUserScrolledUp(!isBottom)
  }

  // Filter logs by search query and role
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (roleFilter && log.type !== roleFilter && TYPE_TO_ROLE[log.type] !== roleFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchMsg = log.message.toLowerCase().includes(q)
        const matchType = log.type.toLowerCase().includes(q)
        return matchMsg || matchType
      }
      return true
    })
  }, [logs, roleFilter, searchQuery])

  const copyAllLogs = () => {
    const text = filteredLogs.map(l => `[${l.timestamp}] [${l.type}] ${l.message}`).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 p-3 font-mono select-text bg-[var(--bg)]">
      <div className="bg-[var(--panel)] rounded-panel border border-[var(--border)] shadow-md flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Terminal Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b border-[var(--border)] bg-[var(--panel-2)] flex-shrink-0 select-none">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-[var(--accent)]" />
            <span className="text-micro font-bold uppercase tracking-wider text-[var(--text)]">
              Execution Stream
            </span>
            <span className="text-micro font-mono text-[var(--faint)] bg-[var(--bg-inset)] px-1.5 py-0.5 rounded border border-[var(--border)]">
              {filteredLogs.length} / {logs.length}
            </span>
          </div>

          {/* Role Filter Chips & Search Input */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            {filter && (
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[var(--accent-edge)] bg-[var(--accent-quiet)] text-[var(--accent)] text-micro font-semibold">
                <Filter size={10} />
                <span>{filter}</span>
                <button onClick={onClearFilter} className="cursor-pointer hover:opacity-70">
                  <X size={10} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-1 bg-[var(--bg-inset)] p-0.5 rounded border border-[var(--border)]">
              {['planner', 'coder', 'auditor', 'tester'].map(role => {
                const active = roleFilter === role
                return (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(active ? null : role)}
                    className={`px-1.5 py-0.5 text-micro font-semibold rounded uppercase transition-colors cursor-pointer ${
                      active
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                        : 'text-[var(--dim)] hover:text-[var(--text)]'
                    }`}
                  >
                    {role.slice(0, 2)}
                  </button>
                )
              })}
            </div>

            <div className="relative">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
              <input
                type="text"
                placeholder="Filter logs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-6 pl-6 pr-2 text-micro bg-[var(--bg-inset)] text-[var(--text)] border border-[var(--border)] rounded focus:border-[var(--accent)] outline-none w-32 focus:w-44 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--faint)] hover:text-[var(--text)] cursor-pointer"
                >
                  <X size={10} />
                </button>
              )}
            </div>

            {(roleFilter || filter) && (
              <button
                onClick={() => {
                  setRoleFilter(null)
                  onClearFilter?.()
                }}
                className="text-micro text-[var(--accent)] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <X size={10} /> Clear
              </button>
            )}

            <button
              onClick={copyAllLogs}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-[var(--bg-inset)] border border-[var(--border)] text-[var(--dim)] hover:text-[var(--text)] text-micro cursor-pointer transition-colors"
              title="Copy visible logs"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Terminal Stream Body */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto min-h-0 bg-[#040810] divide-y divide-[rgba(255,255,255,0.03)]"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--faint)] text-micro p-6 text-center">
              <Terminal size={24} className="mb-2 opacity-30" />
              <span>No matching log entries found</span>
              {searchQuery && <span className="text-micro text-[var(--dim)] mt-1">Query: "{searchQuery}"</span>}
            </div>
          ) : (
            filteredLogs.map(log => {
              const isError = log.type === 'error' || log.type === 'sandbox_block'
              const isWarn = log.type === 'model_fallback'
              const isTool = log.type === 'tool_call'
              const role = TYPE_TO_ROLE[log.type]

              return (
                <div
                  key={log.id}
                  className={`px-3 py-1.5 text-[11.5px] leading-relaxed transition-colors border-l-2 ${
                    isError
                      ? 'border-[var(--bad)] bg-[rgba(239,68,68,0.08)] text-[var(--bad)]'
                      : isWarn
                      ? 'border-amber-400 bg-[rgba(245,158,11,0.08)] text-amber-300'
                      : 'border-transparent hover:bg-[rgba(255,255,255,0.02)] text-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Timestamp */}
                    <span className="text-[10px] text-slate-500 tabular-nums select-none pt-0.5 flex-shrink-0 font-mono">
                      {log.timestamp}
                    </span>

                    {/* Role / Tag */}
                    {role ? (
                      <RoleBadge role={role} compact size="sm" className="mt-0.5 flex-shrink-0" />
                    ) : (
                      <span className="text-[9.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50 flex-shrink-0">
                        {log.type.slice(0, 6)}
                      </span>
                    )}

                    {/* Message Body */}
                    <div className="flex-1 min-w-0 break-words">
                      {isError && <ShieldAlert size={12} className="inline mr-1.5 -mt-0.5 text-red-400" />}
                      {isWarn && <AlertTriangle size={12} className="inline mr-1.5 -mt-0.5 text-amber-400" />}
                      <HighlightText text={log.message} query={searchQuery} />

                      {/* Tool call details if available */}
                      {isTool && (
                        <ToolCallDetails
                          toolName={log.message.replace(/^tool_call:\s*/i, '')}
                          details={log.message}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Scroll to Latest Floating Pill */}
        {userScrolledUp && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-3 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--panel-2)] border border-[var(--accent)] text-[var(--accent)] shadow-lg hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] transition-all text-xs font-semibold z-20"
          >
            <ArrowDown size={12} />
            <span>Jump to latest</span>
          </button>
        )}
      </div>
    </div>
  )
}
