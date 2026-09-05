import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  FolderKanban,
  Bot,
  Blocks,
  GitBranch,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { StatusDot } from './Badges'
import { cx } from '../lib/cx'
import type { SessionEntry } from '../types'
import { useBackendHealth } from '../hooks/useBackendHealth'

interface SidebarProps {
  collapsed?: boolean
  sessions?: SessionEntry[]
  selectedSession: string
  onSelectSession: (id: string) => void
  workspace?: string
  currentPath: string
  onToggleCollapse?: () => void
}

const NAV = [
  { id: '/', label: 'Home', icon: Home },
  { id: '/projects', label: 'Projects', icon: FolderKanban },
  { id: '/agents', label: 'Agents', icon: Bot },
  { id: '/integrations', label: 'Integrations', icon: Blocks },
  { id: '/flow', label: 'Flow', icon: GitBranch },
]

export default function Sidebar({
  collapsed = false,
  sessions = [],
  selectedSession,
  onSelectSession,
  currentPath,
  onToggleCollapse,
}: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isOnline } = useBackendHealth()

  const isActive = (id: string) =>
    id === '/' ? location.pathname === '/' : location.pathname.startsWith(id)


  return (
    <aside
      className={cx(
        'h-full flex flex-col select-none bg-[var(--bg)]',
        'border-r border-[var(--border-soft)] transition-[width] duration-[var(--d-base)] ease-standard',
        collapsed ? 'w-16 min-w-16' : 'w-[212px] min-w-[212px]',
      )}
      aria-label="Primary"
    >
      {/* Brand */}
      <div
        className={cx(
          'flex items-center gap-2.5 h-14 px-4 flex-shrink-0 border-b border-[var(--border-soft)]',
          collapsed && 'justify-center px-0',
        )}
      >
        <span
          className="w-6 h-6 rounded-[var(--r-control)] border border-[var(--border)] bg-[var(--panel)] flex items-center justify-center text-[var(--accent)] flex-shrink-0"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <circle cx="12" cy="5" r="2.4" /><circle cx="5" cy="19" r="2.4" /><circle cx="19" cy="19" r="2.4" /><path d="M12 7.4V12M12 12L6.3 17M12 12l5.7 5" />
          </svg>
        </span>
        {!collapsed && (
          <span className="font-semibold text-[13.5px] tracking-tight text-[var(--text)]">
            Splitter
          </span>
        )}
      </div>

      {/* Nav */}
      <nav
        className={cx('flex-1 overflow-y-auto py-4', !collapsed && 'px-3')}
        aria-label="Workspace"
      >
        {!collapsed && (
          <p className="px-2 pb-2 text-meta font-medium text-[var(--faint)]">Workspace</p>
        )}

        <ul className="space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = isActive(id)
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => navigate(id)}
                  title={collapsed ? label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'relative w-full flex items-center gap-2.5 rounded-[var(--r-control)]',
                    'text-meta font-medium text-left transition-colors duration-[var(--d-quick)] ease-standard',
                    collapsed ? 'justify-center h-9' : 'px-2 h-8',
                    active
                      ? 'bg-[var(--panel-2)] text-[var(--text)]'
                      : 'text-[var(--dim)] hover:bg-[var(--panel)] hover:text-[var(--text)]',
                  )}
                >
                  {/* Active indicator: the structure encodes which area you are in. */}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-[var(--accent)]"
                    />
                  )}
                  <Icon
                    size={16}
                    className={cx('flex-shrink-0', active ? 'text-[var(--accent)]' : 'text-[var(--faint)]')}
                  />
                  {!collapsed && <span className="truncate">{label}</span>}
                </button>
              </li>
            )
          })}
        </ul>

        {/* Active sessions */}
        <div className={cx('mt-6', collapsed && 'px-0')}>
          {!collapsed && (
            <p className="px-2 pb-2 text-meta font-medium text-[var(--faint)]">Active sessions</p>
          )}
          <ul className="space-y-0.5">
            {sessions.length === 0 ? (
              <li className={cx('text-[11px] text-[var(--faint)]', collapsed ? 'hidden' : 'px-2 py-1.5')}>
                No active runs
              </li>
            ) : (
              sessions.map((s) => {
                const selected = selectedSession === s.id
                const statusStr = (s.status || 'idle').toLowerCase()
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSession(s.id)
                        navigate(`/projects/${s.id || 'default'}`)
                      }}
                      title={collapsed ? s.task || 'Session' : undefined}
                      className={cx(
                        'relative w-full flex items-center gap-2.5 rounded-[var(--r-control)]',
                        'text-meta transition-colors duration-[var(--d-quick)] ease-standard',
                        collapsed ? 'justify-center h-9' : 'px-2 h-8',
                        selected
                          ? 'bg-[var(--panel-2)] text-[var(--text)]'
                          : 'text-[var(--dim)] hover:bg-[var(--panel)] hover:text-[var(--text)]',
                      )}
                    >
                      {selected && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-[var(--accent)]"
                        />
                      )}
                      <StatusDot status={statusStr} />
                      {!collapsed && (
                        <span className="truncate">
                          {s.task || (s.workspace || '').split(/[/\\]/).pop() || 'Untitled session'}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      </nav>

      {/* Footer — the only thing here is the collapse toggle and the account. */}
      <div
        className={cx(
          'flex items-center gap-2.5 border-t border-[var(--border-soft)] flex-shrink-0',
          collapsed ? 'justify-center h-12 px-0' : 'h-12 px-3',
        )}
      >
        {!collapsed && (
          <span
            className={cx(
              'w-6 h-6 rounded-full border flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0 relative',
              isOnline
                ? 'bg-[var(--good-quiet)] border-[var(--good)] text-[var(--good)]'
                : 'bg-[var(--bad-quiet)] border-[var(--bad)] text-[var(--bad)]',
            )}
            aria-hidden="true"
            title={isOnline ? 'Backend server connected (:8000)' : 'Backend server offline (:8000)'}
          >
            {isOnline ? (
              <span className="w-2 h-2 rounded-full bg-[var(--good)] animate-pulse" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-[var(--bad)]" />
            )}
          </span>
        )}
        {!collapsed && (
          <span className="min-w-0">
            <span className="block text-[11.5px] font-medium text-[var(--text)] truncate">
              Developer workspace
            </span>
            <span className={cx('block text-[10.5px] font-mono', isOnline ? 'text-[var(--good)]' : 'text-[var(--bad)]')}>
              {isOnline ? 'Server :8000' : 'Server offline'}
            </span>
          </span>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cx(
              'flex items-center justify-center rounded-[var(--r-control)]',
              'text-[var(--faint)] hover:text-[var(--text)] hover:bg-[var(--panel-2)]',
              'transition-colors duration-[var(--d-quick)] ease-standard',
              'w-6 h-6 flex-shrink-0',
              !collapsed && 'ml-auto',
            )}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

    </aside>
  )
}
