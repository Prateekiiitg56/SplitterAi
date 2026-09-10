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
        'border-r border-white/10 transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16 min-w-16' : 'w-[190px] min-w-[190px]',
      )}
      aria-label="Primary navigation"
    >
      {/* Workspace Header */}
      <div
        className={cx(
          'flex h-12 items-center justify-between border-b border-white/10 px-2 flex-shrink-0',
          collapsed && 'flex-col justify-center gap-2 px-0 py-2 h-auto min-h-12',
        )}
      >
        {!collapsed ? (
          <img
            src="/splitterai-logo.png"
            alt="SplitterAI"
            className="h-6 w-auto max-w-[120px] cursor-pointer object-contain object-left transition-opacity hover:opacity-80"
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
                className="flex h-8 w-8 items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
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
            className="flex h-8 w-8 items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <PanelLeft size={15} />
          </button>
        )}
      </div>

      {/* Search Input Box */}
      {!collapsed && (
        <div className="px-2 py-4">
          <button
            type="button"
            onClick={handleOpenCommandPalette}
            aria-label="Search workspace"
            className="group relative flex h-10 w-full items-center gap-2 overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] px-2 text-left text-xs text-white/45 shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-all duration-150 hover:border-white/20 hover:bg-white/[0.08] hover:text-white/80 focus-visible:border-[var(--accent)] focus-visible:bg-white/[0.08]"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/45 transition-colors group-hover:bg-white/10 group-hover:text-white/75">
              <Search size={13} />
            </span>
            <span className="flex-1 truncate font-medium tracking-[0.01em]">Search workspace</span>
          </button>
        </div>
      )}

      {/* Navigation List */}
      <nav
        className={cx(
          'flex-1 overflow-y-auto px-2 py-2 text-xs font-medium',
        )}
      >
        {/* Main Group */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate('/agents')}
            className={cx(
              'flex h-10 w-full items-center gap-2 rounded-lg px-2 transition-all duration-150',
              isRouteActive('/agents')
                ? 'bg-[#18294b] text-white font-semibold shadow-[inset_2px_0_0_#60a5fa]'
                : 'text-white/60 hover:bg-white/[0.07] hover:text-white hover:translate-x-0.5',
              collapsed && 'justify-center px-0',
            )}
          >
            <Bot size={15} className="text-purple-400 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Agents</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/console')}
            className={cx(
              'flex h-10 w-full items-center gap-2 rounded-lg px-2 transition-all duration-150',
              isRouteActive('/console')
                ? 'bg-[#18294b] text-white font-semibold shadow-[inset_2px_0_0_#60a5fa]'
                : 'text-white/60 hover:bg-white/[0.07] hover:text-white hover:translate-x-0.5',
              collapsed && 'justify-center px-0',
            )}
          >
            <Home size={15} className="text-white/60 shrink-0" />
            {!collapsed && <span className="flex-1 text-left">Home</span>}
          </button>

        </div>

        {/* Company Group */}
        {!collapsed ? (
          <div>
            <div className="mb-2 px-2 text-[10px] font-semibold text-white/35 uppercase tracking-[0.14em]">Workspace</div>
            <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => navigate('/projects')}
                  className={cx(
                    'flex h-10 w-full items-center gap-2 rounded-lg px-2 text-white/60 transition-all duration-150 hover:bg-white/[0.07] hover:text-white hover:translate-x-0.5',
                    isRouteActive('/projects') && 'bg-[#18294b] text-white font-semibold shadow-[inset_2px_0_0_#60a5fa]',
                  )}
                >
                  <CreditCard size={14} className="text-white/50 shrink-0" />
                  <span className="flex-1 text-left">Projects</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/flow')}
                  className={cx(
                    'flex h-10 w-full items-center gap-2 rounded-lg px-2 text-white/60 transition-all duration-150 hover:bg-white/[0.07] hover:text-white hover:translate-x-0.5',
                    isRouteActive('/flow') && 'bg-[#18294b] text-white font-semibold shadow-[inset_2px_0_0_#60a5fa]',
                  )}
                >
                  <Repeat size={14} className="text-white/50 shrink-0" />
                  <span className="flex-1 text-left">Workflow</span>
                </button>

              </div>
          </div>
        ) : (
          <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              title="Projects"
              className={cx(
                'flex h-10 w-full items-center justify-center rounded-lg text-white/55 transition-all hover:bg-white/[0.07] hover:text-white',
                isRouteActive('/projects') && 'bg-[#18294b] text-white shadow-[inset_2px_0_0_#60a5fa]',
              )}
            >
              <FolderKanban size={15} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/flow')}
              title="Workflow"
              className={cx(
                'flex h-10 w-full items-center justify-center rounded-lg text-white/55 transition-all hover:bg-white/[0.07] hover:text-white',
                isRouteActive('/flow') && 'bg-[#18294b] text-white shadow-[inset_2px_0_0_#60a5fa]',
              )}
            >
              <GitBranch size={15} />
            </button>
          </div>
        )}

        {/* Integrations */}
        {!collapsed && (
          <div>
            <div className="mb-2 mt-6 px-2 text-[10px] font-semibold text-white/35 uppercase tracking-[0.14em]">Connect</div>
            <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => navigate('/integrations')}
                  className={cx(
                    'flex h-10 w-full items-center gap-2 rounded-lg px-2 text-white/60 transition-all duration-150 hover:bg-white/[0.07] hover:text-white hover:translate-x-0.5',
                    isRouteActive('/integrations') && 'bg-[#18294b] text-white font-semibold shadow-[inset_2px_0_0_#60a5fa]',
                  )}
                >
                  <Grid size={14} className="text-white/50 shrink-0" />
                  <span className="flex-1 text-left">Apps</span>
                </button>
              </div>
          </div>
        )}
      </nav>

      {/* Footer Profile User Card */}
      <div
        className={cx(
          'flex h-12 items-center justify-between border-t border-white/10 px-2 flex-shrink-0 bg-black/60',
          collapsed && 'justify-center px-0',
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 via-rose-400 to-purple-500 p-0.5 shrink-0">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <User size={12} className="text-white" />
            </div>
          </div>
        </div>
        {!collapsed && (
          <button
            type="button"
            aria-label="Open account menu"
            title="Account menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <MoreHorizontal size={14} />
          </button>
        )}
      </div>
    </aside>
  )
}
