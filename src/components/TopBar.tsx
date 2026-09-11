import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ChevronDown,
  Gauge,
  Plug,
  Settings,
  Search,
  FolderGit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Cpu,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { DEFAULT_WORKSPACE } from '../config'

export default function TopBar() {
  const location = useLocation()
  const { sessions, runStatus } = useApp()
  const wsConnected = runStatus !== 'error'

  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [quotaOpen, setQuotaOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const workspaceRef = useRef<HTMLDivElement>(null)
  const quotaRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (workspaceRef.current && !workspaceRef.current.contains(e.target as Node)) {
        setWorkspaceOpen(false)
      }
      if (quotaRef.current && !quotaRef.current.contains(e.target as Node)) {
        setQuotaOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setWorkspaceOpen(false)
        setQuotaOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  // Trigger global command palette shortcut
  const handleOpenCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'))
  }

  // Derive breadcrumbs based on route
  const getBreadcrumb = () => {
    const path = location.pathname
    if (path === '/console') return { section: 'Console', detail: 'Interactive AI Workspace' }
    if (path.startsWith('/projects')) {
      const parts = path.split('/').filter(Boolean)
      if (parts.length === 1) return { section: 'Projects', detail: 'Overview' }
      const projectId = parts[1]
      const sub = parts[2] || 'overview'
      return { section: `Project: ${projectId}`, detail: sub.toUpperCase() }
    }
    if (path.startsWith('/agents')) return { section: 'Agents', detail: 'Multi-Agent Mesh' }
    if (path === '/flow') return { section: 'Flow', detail: 'Visual Canvas' }
    if (path === '/integrations') return { section: 'Integrations', detail: 'API Connections' }
    return { section: 'SplitterAI', detail: 'Developer Console' }
  }

  const breadcrumb = getBreadcrumb()

  // Provider quotas mock/data
  const quotaUsage = [
    { provider: 'OpenAI (GPT-4o)', used: 64, limit: 100, color: 'bg-emerald-500' },
    { provider: 'Gemini 1.5 Pro', used: 28, limit: 100, color: 'bg-sky-500' },
    { provider: 'Claude 3.5 Sonnet', used: 85, limit: 100, color: 'bg-amber-500' }
  ]

  return (
    <header className="h-14 w-full bg-[var(--bg)]/80 backdrop-blur-md border-b border-white/[0.08] px-4 flex items-center justify-between z-30 flex-shrink-0 select-none">
      {/* Left: Workspace Switcher */}
      <div className="flex items-center gap-3 min-w-0" ref={workspaceRef}>
        <div className="relative">
          <button
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            className="flex h-8 items-center gap-2 rounded bg-[var(--panel-2)] px-3 border border-[var(--border)] hover:border-[var(--accent)] transition-colors text-left"
            title={DEFAULT_WORKSPACE}
            aria-haspopup="true"
            aria-expanded={workspaceOpen}
          >
            <FolderGit2 size={15} className="text-[var(--accent)] flex-shrink-0" />
            <span className="font-mono text-meta font-medium text-[var(--text)] truncate max-w-[110px] sm:max-w-[180px]">
              {DEFAULT_WORKSPACE.split(/[/\\]/).pop() || 'Workspace'}
            </span>
            <ChevronDown size={13} className={`text-[var(--dim)] transition-transform duration-[var(--d-quick)] ease-standard ${workspaceOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Workspace Dropdown */}
          {workspaceOpen && (
            <div role="menu" className="absolute top-full left-0 mt-1 w-72 bg-[var(--panel)] border border-[var(--border)] rounded-panel shadow-xl p-2 z-50">
              <div className="text-micro font-mono text-[var(--faint)] uppercase px-2 py-1 tracking-wider border-b border-[var(--border)] mb-1">
                Active Workspace
              </div>
              <div className="px-2 py-1.5 rounded bg-[var(--panel-2)] border border-[var(--border)] mb-2">
                <div className="font-mono text-meta font-semibold text-[var(--accent)] truncate">{DEFAULT_WORKSPACE}</div>
                <div className="flex items-center gap-1.5 mt-1 text-micro text-[var(--dim)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                  <span>Sandboxed Local Environment</span>
                </div>
              </div>

              <div className="text-micro font-mono text-[var(--faint)] uppercase px-2 py-1 tracking-wider border-b border-[var(--border)] mb-1">
                Recent Sessions ({sessions.length})
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {sessions.slice(0, 5).map(session => (
                  <div
                    key={session.id}
                    className="p-2 rounded hover:bg-[var(--panel-2)] transition-colors cursor-pointer text-meta flex items-center justify-between"
                  >
                    <div className="truncate">
                      <div className="font-medium text-[var(--text)] truncate">{session.task}</div>
                      <div className="font-mono text-micro text-[var(--faint)] flex items-center gap-1 mt-0.5">
                        <Clock size={10} />
                        {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className={`text-micro font-mono px-1.5 py-0.5 rounded ${session.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-sky-500/10 text-sky-400'}`}>
                      {session.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Quick Search Button */}
      <button
        onClick={handleOpenCommandPalette}
        className="hidden md:flex h-9 w-[480px] max-w-[50%] items-center gap-2 rounded-lg bg-white/[0.04] px-3.5 border border-white/[0.08] hover:border-white/[0.15] text-white/40 hover:text-white/70 transition-colors text-[13px]"
      >
        <Search size={14} className="text-white/30" />
        <span className="flex-1 text-left">Search commands & files...</span>
        <kbd className="font-mono text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded text-white/30 border border-white/[0.06]">
          Ctrl K
        </kbd>
      </button>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* WS Connection Indicator */}
        <div className="hidden sm:flex h-8 items-center gap-2 rounded-lg bg-white/[0.04] px-3 border border-white/[0.08] text-[11px] font-mono">
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="hidden lg:inline text-white/60">
            {wsConnected ? 'Connected' : 'Standby'}
          </span>
          <span className="sr-only">WebSocket {wsConnected ? 'connected' : 'on standby'}</span>
        </div>

        {/* Quota Popover */}
        <div className="relative" ref={quotaRef}>
          <button
            onClick={() => setQuotaOpen(!quotaOpen)}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--panel-2)] text-[var(--dim)] hover:text-[var(--text)] transition-colors relative"
            title="API Quotas & Usage"
            aria-label="API Quotas & Usage"
            aria-haspopup="true"
            aria-expanded={quotaOpen}
          >
            <Gauge size={17} />
          </button>

          {quotaOpen && (
            <div role="menu" className="absolute top-full right-0 mt-1 w-64 bg-[var(--panel)] border border-[var(--border)] rounded-panel shadow-xl p-3 z-50">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-2">
                <span className="font-mono text-meta font-semibold text-[var(--text)] flex items-center gap-1.5">
                  <Cpu size={14} className="text-[var(--accent)]" /> Model Quotas
                </span>
                <button onClick={() => setQuotaOpen(false)} className="flex h-8 w-8 items-center justify-center text-[var(--faint)] hover:text-[var(--text)] rounded transition-colors" aria-label="Close">
                  <X size={13} />
                </button>
              </div>
              <div className="space-y-3">
                {quotaUsage.map(q => (
                  <div key={q.provider} className="text-meta">
                    <div className="flex justify-between font-mono text-micro text-[var(--dim)] mb-1">
                      <span>{q.provider}</span>
                      <span>{q.used}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--panel-2)] rounded-full overflow-hidden">
                      <div className={`h-full ${q.color}`} style={{ width: `${q.used}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Integrations Link */}
        <Link
          to="/integrations"
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--panel-2)] text-[var(--dim)] hover:text-[var(--text)] transition-colors relative"
          title="Integrations"
          aria-label="Integrations"
        >
          <Plug size={17} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--accent)]" />
        </Link>

        {/* Settings Toggle */}
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/[0.06] text-white/35 hover:text-white transition-colors"
          title="Settings"
          aria-label="Settings"
          aria-expanded={settingsOpen}
        >
          <Settings size={17} />
        </button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-[11px] font-bold text-[var(--accent-ink)] ml-1">
          PS
        </div>
      </div>
    </header>
  )
}
