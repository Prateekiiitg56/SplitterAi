import {
  Menu,
  History,
  FolderOpen,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
} from 'lucide-react'
import type { SessionEntry } from '../data'

interface SidebarProps {
  collapsed: boolean
  sessions: SessionEntry[]
  selectedSession: string
  onSelectSession: (id: string) => void
  onToggleCollapse: () => void
  workspace: string
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'executing': return <Loader2 size={14} className="text-primary animate-spin" />
    case 'done':      return <CheckCircle2 size={14} className="text-success" />
    case 'error':     return <XCircle size={14} className="text-urgent-red" />
    default:          return <Loader2 size={14} className="text-text-secondary" />
  }
}

export default function Sidebar({
  collapsed,
  sessions,
  selectedSession,
  onSelectSession,
  onToggleCollapse,
  workspace,
}: SidebarProps) {
  return (
    <aside
      className={`flex flex-col h-full bg-sidebar-bg border-r border-border transition-all duration-200 ease-out flex-shrink-0 ${
        collapsed ? 'w-[60px]' : 'w-[260px]'
      }`}
    >
      {/* Logo + hamburger */}
      <div className="flex items-center h-14 px-3 gap-2 flex-shrink-0">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-hover-bg transition-colors duration-150 text-text-secondary cursor-pointer flex-shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2 select-none overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Zap size={14} className="text-white" />
            </div>
            <span
              className="text-[16px] text-text-primary truncate"
              style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}
            >
              agentcli
            </span>
          </div>
        )}
      </div>

      {/* New task button */}
      <div className={`px-2 mb-3 ${collapsed ? 'flex justify-center' : ''}`}>
        <button
          className={`flex items-center gap-2 bg-compose-bg text-compose-text rounded-xl transition-all duration-150 hover:brightness-95 active:scale-[0.97] cursor-pointer ${
            collapsed
              ? 'w-10 h-10 justify-center rounded-lg'
              : 'w-full h-10 px-4'
          }`}
          style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}
        >
          <Plus size={18} />
          {!collapsed && <span className="text-[13px]">New Task</span>}
        </button>
      </div>

      {/* Sessions header */}
      {!collapsed && (
        <div className="flex items-center gap-2 px-4 mb-1">
          <History size={14} className="text-text-secondary" />
          <span
            className="text-[11px] text-text-secondary uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}
          >
            Recent Runs
          </span>
        </div>
      )}

      {/* Session list */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {sessions.map((session) => {
          const isSelected = selectedSession === session.id
          return (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`flex items-start gap-2 w-full text-left rounded-lg transition-colors duration-100 cursor-pointer ${
                collapsed ? 'p-2 justify-center' : 'px-3 py-2'
              } ${isSelected ? 'bg-nav-pill' : 'hover:bg-hover-bg'}`}
              title={collapsed ? session.task : undefined}
            >
              <span className="flex-shrink-0 mt-0.5">{statusIcon(session.status)}</span>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] text-text-primary truncate leading-tight"
                    style={{ fontWeight: isSelected ? 500 : 400 }}
                  >
                    {session.task}
                  </p>
                  <p className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-2">
                    <span>{session.createdAt}</span>
                    <span>·</span>
                    <span>{session.subtaskCount} subtasks</span>
                  </p>
                </div>
              )}
            </button>
          )
        })}
      </nav>

      {/* Workspace info */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-2 text-text-secondary">
            <FolderOpen size={14} className="flex-shrink-0" />
            <span
              className="text-[11px] truncate"
              style={{ fontFamily: 'var(--font-mono)' }}
              title={workspace}
            >
              {workspace}
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}
