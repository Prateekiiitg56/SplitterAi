import { useNavigate } from 'react-router-dom'
import {
  Menu, Plus, FolderOpen, Zap,
  Home, Bot, Play,
  CheckCircle2, XCircle, Loader2,
} from 'lucide-react'
import type { SessionEntry } from '../data'

interface SidebarProps {
  collapsed: boolean
  sessions: SessionEntry[]
  selectedSession: string
  onSelectSession: (id: string) => void
  onToggleCollapse: () => void
  workspace: string
  currentPath: string
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'executing': return <Loader2 size={13} className="text-primary animate-spin" />
    case 'done':      return <CheckCircle2 size={13} className="text-success" />
    case 'error':     return <XCircle size={13} className="text-urgent-red" />
    default:          return <Loader2 size={13} className="text-text-secondary" />
  }
}

export default function Sidebar({
  collapsed, sessions, selectedSession,
  onSelectSession, onToggleCollapse, workspace, currentPath,
}: SidebarProps) {
  const navigate = useNavigate()

  const navItems = [
    { id: '/', label: 'Home', icon: <Home size={17} /> },
    { id: '/run', label: 'Run', icon: <Play size={17} /> },
  ]

  return (
    <aside className={`flex flex-col h-full bg-white/75 backdrop-blur-md border-r border-slate-200/80 transition-all duration-200 ease-out flex-shrink-0 ${
      collapsed ? 'w-[56px]' : 'w-[240px]'
    }`}>

      {/* Logo row */}
      <div className="flex items-center h-12 px-2.5 gap-2 flex-shrink-0">
        <button onClick={onToggleCollapse}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-hover-bg text-text-secondary cursor-pointer flex-shrink-0">
          <Menu size={17} />
        </button>
        {!collapsed && (
          <div className="flex items-center gap-1.5 select-none">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="text-[14px] text-text-primary" style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
              agentcli
            </span>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="px-2 space-y-0.5 mb-3">
        {navItems.map((item) => {
          const isActive = currentPath === item.id
          return (
            <button key={item.id}
              onClick={() => navigate(item.id)}
              className={`flex items-center gap-2.5 w-full h-8 rounded-md transition-colors cursor-pointer ${
                collapsed ? 'justify-center px-0' : 'px-2.5'
              } ${isActive ? 'bg-nav-pill text-primary' : 'text-text-secondary hover:bg-hover-bg'}`}
              title={collapsed ? item.label : undefined}>
              {item.icon}
              {!collapsed && (
                <span className="text-[13px]" style={{ fontFamily: 'var(--font-ui)', fontWeight: isActive ? 500 : 400 }}>
                  {item.label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="h-px bg-border mx-2.5 mb-2" />

      {/* Recent runs label */}
      {!collapsed && (
        <p className="px-3 mb-1 text-[10px] text-text-secondary uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
          Recent
        </p>
      )}

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {sessions.map((session) => {
          const isSel = selectedSession === session.id
          return (
            <button key={session.id}
              onClick={() => { onSelectSession(session.id); navigate('/run') }}
              className={`flex items-start gap-2 w-full text-left rounded-md transition-colors cursor-pointer ${
                collapsed ? 'p-1.5 justify-center' : 'px-2.5 py-1.5'
              } ${isSel ? 'bg-nav-pill' : 'hover:bg-hover-bg'}`}
              title={collapsed ? session.task : undefined}>
              <span className="flex-shrink-0 mt-0.5">{statusIcon(session.status)}</span>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-text-primary truncate leading-tight" style={{ fontWeight: isSel ? 500 : 400 }}>
                    {session.task}
                  </p>
                  <p className="text-[10px] text-text-secondary mt-0.5">
                    {session.createdAt}
                  </p>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Workspace */}
      {!collapsed && (
        <div className="px-3 py-2.5 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <FolderOpen size={12} className="flex-shrink-0" />
            <span className="text-[10px] truncate" style={{ fontFamily: 'var(--font-mono)' }} title={workspace}>
              {workspace}
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}
