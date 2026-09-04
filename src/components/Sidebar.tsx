import { useNavigate } from 'react-router-dom'
import { StatusDot } from './Badges'
import type { SessionEntry } from '../types'

interface SidebarProps {
  collapsed?: boolean
  sessions?: SessionEntry[]
  selectedSession: string
  onSelectSession: (id: string) => void
  workspace?: string
  currentPath: string
  onToggleCollapse?: () => void
}

export default function Sidebar({
  sessions = [],
  selectedSession,
  onSelectSession,
  currentPath,
}: SidebarProps) {
  let navigate = (path: string) => { window.location.href = path }
  try {
    const nav = useNavigate()
    if (typeof nav === 'function') navigate = nav
  } catch { /* fallback */ }

  const mainNav = [
    {
      id: '/',
      label: 'Home',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5 flex-shrink-0">
          <path d="M4 11l8-7 8 7M6 10v9a1 1 0 001 1h4v-6h2v6h4a1 1 0 001-1v-9" />
        </svg>
      ),
    },
    {
      id: '/projects',
      label: 'Projects',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5 flex-shrink-0">
          <rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 6l3-3h5l2 3" />
        </svg>
      ),
    },
    {
      id: '/agents',
      label: 'Agents',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5 flex-shrink-0">
          <circle cx="8" cy="8" r="3" /><circle cx="17" cy="8" r="3" /><path d="M2 20c0-3 2.5-5 6-5s6 2 6 5M12 20c0-3 2.5-5 6-5" />
        </svg>
      ),
    },
    {
      id: '/integrations',
      label: 'Integrations',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5 flex-shrink-0">
          <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      id: '/flow',
      label: 'Flow',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5 flex-shrink-0">
          <circle cx="5" cy="6" r="2.3" /><circle cx="5" cy="18" r="2.3" /><circle cx="19" cy="12" r="2.3" /><path d="M7 6h5a3 3 0 013 3v0M7 18h5a3 3 0 003-3v0M17 12h-2" />
        </svg>
      ),
    },
  ]

  return (
    <aside className="w-[212px] min-w-[212px] bg-[var(--panel)] border-r border-[var(--border-soft)] flex flex-col p-4 select-none text-[var(--text)] font-sans h-full">
      
      {/* Brand */}
      <div className="brand flex items-center gap-2.5 pb-5 px-2">
        <div className="brand-mark w-5 h-5 rounded-md border border-[var(--border)] flex items-center justify-center text-[var(--accent)] flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
            <circle cx="12" cy="5" r="2.4" /><circle cx="5" cy="19" r="2.4" /><circle cx="19" cy="19" r="2.4" /><path d="M12 7.4V12M12 12L6.3 17M12 12l5.7 5" />
          </svg>
        </div>
        <div className="brand-name font-semibold text-[13.5px] tracking-tight text-[var(--text)]">
          SplitterAI
        </div>
      </div>

      {/* Navigation Group */}
      <div className="nav-group mb-5">
        <div className="nav-label font-mono text-[10px] text-[var(--faint)] tracking-wider px-2.5 pb-2 uppercase font-bold">
          WORKSPACE
        </div>

        {mainNav.map((item) => {
          const isActive = item.id === '/' ? currentPath === '/' : currentPath.startsWith(item.id)
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`nav-item flex items-center gap-2.5 px-2.5 py-1.5 rounded-md font-medium text-[12.5px] transition-colors cursor-pointer w-full text-left mb-0.5 ${
                isActive
                  ? 'bg-[var(--panel-2)] text-[var(--text)] font-semibold'
                  : 'text-[var(--dim)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]'
              }`}
            >
              <span className={isActive ? 'text-[var(--accent)]' : 'text-[var(--faint)]'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* Active Sessions */}
      <div className="nav-label font-mono text-[10px] text-[var(--faint)] tracking-wider px-2.5 pb-2 uppercase font-bold">
        ACTIVE SESSIONS
      </div>

      <div className="sessions-list flex-1 overflow-y-auto space-y-0.5">
        {sessions.length === 0 ? (
          <div className="px-2.5 py-1.5 font-mono text-[11px] text-[var(--faint)] italic">
            No active session runs
          </div>
        ) : (
          sessions.map((s) => {
            const isSelected = selectedSession === s.id
            const statusStr = (s.status || 'idle').toLowerCase()

            return (
              <button
                key={s.id}
                onClick={() => {
                  onSelectSession(s.id)
                  navigate(`/projects/${s.id || 'default'}`)
                }}
                className={`session-item flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] transition-colors cursor-pointer w-full text-left truncate ${
                  isSelected
                    ? 'bg-[var(--panel-2)] text-[var(--text)] font-semibold'
                    : 'text-[var(--dim)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]'
                }`}
              >
                <StatusDot status={statusStr} />
                <span className="truncate">{s.task || s.workspace.split(/[/\\]/).pop() || 'Untitled Session'}</span>
              </button>
            )
          })
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-foot border-t border-[var(--border-soft)] pt-3 mt-2 flex items-center gap-2.5">
        <div className="avatar w-5.5 h-5.5 rounded-full bg-[var(--panel-2)] border border-[var(--border)] flex items-center justify-center font-mono text-[10px] text-[var(--dim)] font-bold flex-shrink-0">
          P
        </div>
        <div className="foot-meta min-w-0">
          <div className="name font-medium text-[11px] text-[var(--text)] truncate">Developer Workspace</div>
          <div className="status text-[10.5px] text-[var(--faint)]">Active</div>
        </div>
      </div>
    </aside>
  )
}
