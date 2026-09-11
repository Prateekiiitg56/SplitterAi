import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  FolderKanban,
  Bot,
  GitBranch,
  Search,
  User,
  MoreHorizontal,
  CreditCard,
  Repeat,
  Grid,
  PanelLeft,
  ChevronRight,
} from 'lucide-react'
import { cx } from '../lib/cx'
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

/* ── Nav item helper ───────────────────────────────────────────────── */

function NavItem({
  icon: Icon,
  label,
  active,
  collapsed,
  iconColor = 'text-white/50',
  onClick,
}: {
  icon: any
  label: string
  active: boolean
  collapsed: boolean
  iconColor?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cx(
        'flex w-full items-center gap-3 rounded-lg transition-all duration-150',
        collapsed ? 'h-9 justify-center px-0' : 'h-9 px-2.5',
        active
          ? 'bg-[rgba(30,120,255,0.14)] border border-[rgba(30,140,255,0.55)] text-white font-semibold'
          : 'border border-transparent text-white/60 hover:bg-white/[0.06] hover:text-white',
      )}
    >
      <Icon size={15} className={cx('shrink-0', active ? 'text-[var(--accent)]' : iconColor)} />
      {!collapsed && <span className="flex-1 text-left text-[12.5px] truncate">{label}</span>}
    </button>
  )
}

/* ── Sidebar ───────────────────────────────────────────────────────── */

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

  const handleOpenCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'))
  }

  const isRouteActive = (path: string) => {
    if (path === '/console') return location.pathname === '/console' || location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      className={cx(
        'h-full flex flex-col select-none bg-black/70 backdrop-blur-md z-20',
        'border-r border-white/[0.08] transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-14 min-w-14' : 'w-[200px] min-w-[200px]',
      )}
      aria-label="Primary navigation"
    >
      {/* ── Workspace Header ─────────────────────────────────────── */}
      <div
        className={cx(
          'flex items-center justify-between border-b border-white/[0.08] flex-shrink-0',
          collapsed ? 'flex-col justify-center gap-2 px-0 py-3 h-auto min-h-14' : 'h-14 px-3',
        )}
      >
        {!collapsed ? (
          <img
            src="/splitterai-logo.png"
            alt="SplitterAI"
            className="h-6 w-auto max-w-[110px] cursor-pointer object-contain object-left transition-opacity hover:opacity-80"
            onClick={() => navigate('/welcome')}
          />
        ) : (
          <>
            <img
              src="/splitterai-logo.png"
              alt="SplitterAI"
              title="Open landing page"
              className="h-6 w-6 cursor-pointer object-cover object-left transition-opacity hover:opacity-80"
              onClick={() => navigate('/welcome')}
            />
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <PanelLeft size={14} />
              </button>
            )}
          </>
        )}

        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <PanelLeft size={15} />
          </button>
        )}
      </div>

      {/* ── Search ─────────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-2.5 pt-3 pb-1.5">
          <button
            type="button"
            onClick={handleOpenCommandPalette}
            aria-label="Search workspace"
            className="group relative flex h-8 w-full items-center gap-2 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 text-left text-[11.5px] text-white/45 transition-all duration-150 hover:border-white/[0.15] hover:bg-white/[0.07] hover:text-white/80 focus-visible:border-[var(--accent)]"
          >
            <Search size={13} className="shrink-0 text-white/40 group-hover:text-white/70 transition-colors" />
            <span className="flex-1 truncate font-medium">Search...</span>
            <kbd className="hidden lg:inline-flex items-center rounded bg-white/[0.06] px-1 py-0.2 text-[9px] font-mono text-white/30 border border-white/[0.06]">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 text-[12.5px] font-medium space-y-4">
        {/* Main */}
        <div className="space-y-0.5">
          <NavItem icon={Bot}  label="Agents" active={isRouteActive('/agents')}  collapsed={collapsed} iconColor="text-purple-400" onClick={() => navigate('/agents')} />
          <NavItem icon={Home} label="Home"   active={isRouteActive('/console')} collapsed={collapsed} onClick={() => navigate('/console')} />
        </div>

        {/* Workspace group */}
        {!collapsed ? (
          <div>
            <div className="mb-1.5 px-2.5 text-[9.5px] font-bold text-white/30 uppercase tracking-[0.14em]">Workspace</div>
            <div className="space-y-0.5">
              <NavItem icon={FolderKanban} label="Projects" active={isRouteActive('/projects')} collapsed={collapsed} onClick={() => navigate('/projects')} />
              <NavItem icon={Repeat}       label="Workflow" active={isRouteActive('/flow')}     collapsed={collapsed} onClick={() => navigate('/flow')} />
            </div>
          </div>
        ) : (
          <div className="space-y-0.5 border-t border-white/[0.08] pt-3">
            <NavItem icon={FolderKanban} label="Projects" active={isRouteActive('/projects')} collapsed={collapsed} onClick={() => navigate('/projects')} />
            <NavItem icon={Repeat}       label="Workflow" active={isRouteActive('/flow')}     collapsed={collapsed} onClick={() => navigate('/flow')} />
          </div>
        )}

        {/* Connect group */}
        {!collapsed ? (
          <div>
            <div className="mb-1.5 px-2.5 text-[9.5px] font-bold text-white/30 uppercase tracking-[0.14em]">Connect</div>
            <div className="space-y-0.5">
              <NavItem icon={Grid} label="Apps" active={isRouteActive('/integrations')} collapsed={collapsed} onClick={() => navigate('/integrations')} />
            </div>
          </div>
        ) : (
          <div className="space-y-0.5 border-t border-white/[0.08] pt-3">
            <NavItem icon={Grid} label="Apps" active={isRouteActive('/integrations')} collapsed={collapsed} onClick={() => navigate('/integrations')} />
          </div>
        )}
      </nav>

      {/* ── Footer Profile ──────────────────────────────────────── */}
      <div
        className={cx(
          'flex items-center border-t border-white/[0.08] flex-shrink-0 bg-black/40',
          collapsed ? 'justify-center px-0 py-2.5' : 'gap-2 px-2.5 py-2.5',
        )}
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 via-rose-400 to-purple-500 p-[2px] shrink-0">
          <div className="w-full h-full rounded-full bg-[#0a0e18] flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">PS</span>
          </div>
        </div>

        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] font-medium text-white/90 truncate">Prateek Singh</div>
              <div className="text-[9.5px] text-white/35 font-mono truncate">prateek@workspace.dev</div>
            </div>
            <button
              type="button"
              aria-label="Open account menu"
              title="Account menu"
              className="flex h-6 w-6 items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-colors shrink-0"
            >
              <ChevronRight size={13} />
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
