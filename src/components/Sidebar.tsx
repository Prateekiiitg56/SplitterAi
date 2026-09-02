import { useNavigate } from 'react'
import {
  FolderOpen,
  Zap,
  Home,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Bot,
} from 'lucide-react'
import type { SessionEntry } from '../data'

interface SidebarProps {
  collapsed?: boolean
  sessions: SessionEntry[]
  selectedSession: string
  onSelectSession: (id: string) => void
  onToggleCollapse?: () => void
  workspace: string
  currentPath: string
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'executing': return <Loader2 size={13} className="text-blue-600 animate-spin flex-shrink-0" />
    case 'done':      return <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
    case 'error':     return <XCircle size={13} className="text-red-600 flex-shrink-0" />
    default:          return <Loader2 size={13} className="text-slate-400 flex-shrink-0" />
  }
}

export default function Sidebar({
  sessions = [], selectedSession,
  onSelectSession, workspace, currentPath,
}: SidebarProps) {
  let navigate = (path: string) => { window.location.href = path }
  try {
    const nav = useNavigate()
    if (typeof nav === 'function') navigate = nav
  } catch (e) {
    // fallback if router context reloaded
  }

  const navItems = [
    { id: '/', label: 'Home (Console)', icon: <Home size={16} /> },
    { id: '/run', label: 'Run Execution', icon: <Play size={16} /> },
  ]

  const agentLinks = [
    { id: '/agent/planner', label: 'Planner', role: 'planner' },
    { id: '/agent/coder', label: 'Coder', role: 'coder' },
    { id: '/agent/auditor', label: 'Auditor', role: 'auditor' },
    { id: '/agent/tester', label: 'Tester', role: 'tester' },
  ]

  return (
    <aside className="w-[240px] flex flex-col h-full bg-white border-r border-slate-200/80 flex-shrink-0 transition-none select-none shadow-xs">
      {/* Brand logo & wordmark */}
      <div className="flex items-center h-14 px-4 gap-2.5 flex-shrink-0 border-b border-slate-200/60">
        <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-white shadow-xs">
          <Zap size={14} className="fill-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-bold text-slate-900 leading-none tracking-tight">
            agentcli
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            v1.0-orchestrator
          </span>
        </div>
      </div>

      {/* Primary Navigation */}
      <div className="p-3 space-y-1">
        <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
          Navigation
        </p>
        {navItems.map((item) => {
          const isActive = currentPath === item.id
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`flex items-center gap-2.5 w-full h-8 px-2.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-accent/10 border border-accent/20 text-accent font-semibold'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent'
              }`}
            >
              <span className={isActive ? 'text-accent' : 'text-slate-400'}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* Agents Direct Links */}
      <div className="px-3 py-1 space-y-1">
        <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
          <Bot size={11} />
          <span>Agents</span>
        </p>
        {agentLinks.map((agent) => {
          const isActive = currentPath === agent.id
          return (
            <button
              key={agent.id}
              onClick={() => navigate(agent.id)}
              className={`flex items-center justify-between w-full h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-slate-200/70 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{agent.label}</span>
              <span className="text-[10px] text-slate-400 font-mono">view</span>
            </button>
          )
        })}
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-200/80 mx-3 my-2" />

      {/* Session History Header */}
      <p className="px-5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
        Recent Runs
      </p>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {sessions.map((session) => {
          const isSel = selectedSession === session.id
          return (
            <button
              key={session.id}
              onClick={() => { onSelectSession(session.id); navigate('/run') }}
              className={`flex items-start gap-2.5 w-full text-left rounded-lg p-2 transition-colors cursor-pointer border ${
                isSel
                  ? 'bg-blue-50/60 border-blue-200/80 text-slate-900'
                  : 'bg-transparent border-transparent hover:bg-slate-100/70 text-slate-600'
              }`}
            >
              <span className="mt-0.5">{statusIcon(session.status)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate leading-tight">
                  {session.task}
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {session.createdAt}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Workspace Footer */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/50 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-slate-500">
          <FolderOpen size={13} className="text-slate-400 flex-shrink-0" />
          <span className="text-[11px] font-mono truncate" title={workspace}>
            {workspace}
          </span>
        </div>
      </div>
    </aside>
  )
}
