import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  MessageSquare,
  FolderKanban,
  Bot,
  Blocks,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  User,
  MoreHorizontal,
  Inbox,
  CreditCard,
  Users,
  Repeat,
  FileText,
  CheckSquare,
  Grid,
  PanelLeft,
  ChevronsUpDown,
} from 'lucide-react'
import { StatusDot } from './Badges'
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
  const [companyOpen, setCompanyOpen] = useState(true)
  const [spacesOpen, setSpacesOpen] = useState(true)

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
        collapsed ? 'w-16 min-w-16' : 'w-[230px] min-w-[230px]',
      )}
      aria-label="Primary navigation"
    >
      {/* Workspace Header */}
      <div
        className={cx(
          'flex items-center justify-between h-12 px-3 border-b border-white/10 flex-shrink-0',
          collapsed && 'justify-center px-0',
        )}
      >
        {!collapsed ? (
          <button
            type="button"
            className="flex items-center gap-2 text-xs font-semibold text-white/90 hover:text-white transition-colors"
          >
            <span className="w-5 h-5 rounded-md bg-[#c026d3] flex items-center justify-center text-[11px] font-bold text-white shadow-sm shrink-0">
              L
            </span>
            <span className="truncate max-w-[120px]">Locally inc.</span>
            <ChevronsUpDown size={13} className="text-white/40 shrink-0" />
          </button>
        ) : (
          <span className="w-6 h-6 rounded-md bg-[#c026d3] flex items-center justify-center text-xs font-bold text-white shadow-sm">
            L
          </span>
        )}

        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <PanelLeft size={15} />
          </button>
        )}
      </div>

      {/* Search Input Box */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-2">
          <button
            type="button"
            onClick={handleOpenCommandPalette}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white/40 hover:text-white/70 hover:border-white/20 transition-all group"
          >
            <Search size={13} className="text-white/40 group-hover:text-white/60 shrink-0" />
            <span className="flex-1 text-left">Search</span>
            <kbd className="font-mono text-[10px] bg-white/[0.08] px-1.5 py-0.5 rounded text-white/50 border border-white/10">
              ⌘ K
            </kbd>
          </button>
        </div>
      )}

      {/* Navigation List */}
      <nav className={cx('flex-1 overflow-y-auto py-2 space-y-4 text-xs font-medium', collapsed ? 'px-1.5' : 'px-3')}>
        {/* Main Group */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => navigate('/agents')}
            className={cx(
              'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors',
              isRouteActive('/agents') ? 'bg-white/10 text-white font-semibold' : 'text-white/70 hover:bg-white/5 hover:text-white',
              collapsed && 'justify-center px-0',
            )}
          >
            <Bot size={15} className="text-purple-400 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Agents</span>
                <kbd className="font-mono text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white/50">⌘ Y</kbd>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/console')}
            className={cx(
              'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors',
              isRouteActive('/console') ? 'bg-white/10 text-white font-semibold' : 'text-white/70 hover:bg-white/5 hover:text-white',
              collapsed && 'justify-center px-0',
            )}
          >
            <Home size={15} className="text-white/60 shrink-0" />
            {!collapsed && <span className="flex-1 text-left">Home</span>}
          </button>

          <button
            type="button"
            className={cx(
              'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-white/70 hover:bg-white/5 hover:text-white transition-colors',
              collapsed && 'justify-center px-0',
            )}
          >
            <Inbox size={15} className="text-white/60 shrink-0" />
            {!collapsed && <span className="flex-1 text-left">Inbox</span>}
          </button>

          <button
            type="button"
            onClick={() => navigate('/console')}
            className={cx(
              'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-white/70 hover:bg-white/5 hover:text-white transition-colors',
              collapsed && 'justify-center px-0',
            )}
          >
            <MessageSquare size={15} className="text-white/60 shrink-0" />
            {!collapsed && <span className="flex-1 text-left">Messages</span>}
          </button>
        </div>

        {/* Company Group */}
        {!collapsed ? (
          <div>
            <button
              type="button"
              onClick={() => setCompanyOpen(!companyOpen)}
              className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-white/40 hover:text-white/70 transition-colors uppercase tracking-wider"
            >
              <span>Company</span>
              <ChevronDown size={12} className={cx('transition-transform text-white/40', !companyOpen && '-rotate-90')} />
            </button>
            {companyOpen && (
              <div className="mt-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => navigate('/projects')}
                  className={cx(
                    'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-white/70 hover:bg-white/5 hover:text-white transition-colors',
                    isRouteActive('/projects') && 'bg-white/10 text-white font-semibold',
                  )}
                >
                  <CreditCard size={14} className="text-white/50 shrink-0" />
                  <span className="flex-1 text-left">Balances</span>
                </button>

                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Users size={14} className="text-white/50 shrink-0" />
                  <span className="flex-1 text-left">Customers</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/flow')}
                  className={cx(
                    'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-white/70 hover:bg-white/5 hover:text-white transition-colors',
                    isRouteActive('/flow') && 'bg-white/10 text-white font-semibold',
                  )}
                >
                  <Repeat size={14} className="text-white/50 shrink-0" />
                  <span className="flex-1 text-left">Transactions</span>
                </button>

                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <FileText size={14} className="text-white/50 shrink-0" />
                  <span className="flex-1 text-left">Contracts</span>
                </button>

                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-white/50 hover:bg-white/5 transition-colors"
                >
                  <GitBranch size={14} className="text-white/40 shrink-0" />
                  <span className="flex-1 text-left truncate">Workflows</span>
                  <span className="text-[9px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded font-mono shrink-0">Soon</span>
                </button>

                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-white/50 hover:bg-white/5 transition-colors"
                >
                  <CheckSquare size={14} className="text-white/40 shrink-0" />
                  <span className="flex-1 text-left truncate">Tasks</span>
                  <span className="text-[9px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded font-mono shrink-0">Soon</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-2 border-t border-white/5 space-y-1">
            <button type="button" onClick={() => navigate('/projects')} className="w-full flex justify-center py-1.5 text-white/70 hover:text-white">
              <FolderKanban size={15} />
            </button>
            <button type="button" onClick={() => navigate('/flow')} className="w-full flex justify-center py-1.5 text-white/70 hover:text-white">
              <GitBranch size={15} />
            </button>
          </div>
        )}

        {/* Spaces Group */}
        {!collapsed && (
          <div>
            <button
              type="button"
              onClick={() => setSpacesOpen(!spacesOpen)}
              className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-white/40 hover:text-white/70 transition-colors uppercase tracking-wider"
            >
              <span>Spaces</span>
              <ChevronDown size={12} className={cx('transition-transform text-white/40', !spacesOpen && '-rotate-90')} />
            </button>
            {spacesOpen && (
              <div className="mt-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => navigate('/integrations')}
                  className={cx(
                    'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-white/70 hover:bg-white/5 hover:text-white transition-colors',
                    isRouteActive('/integrations') && 'bg-white/10 text-white font-semibold',
                  )}
                >
                  <Grid size={14} className="text-white/50 shrink-0" />
                  <span className="flex-1 text-left">Apps</span>
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Blocks size={14} className="text-white/50 shrink-0" />
                  <span className="flex-1 text-left">More</span>
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Footer Profile User Card */}
      <div
        className={cx(
          'flex items-center justify-between h-12 px-3 border-t border-white/10 flex-shrink-0 bg-black/60',
          collapsed && 'justify-center px-0',
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 via-rose-400 to-purple-500 p-0.5 shrink-0">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <User size={12} className="text-white" />
            </div>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">Jane Moore</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <MoreHorizontal size={14} />
          </button>
        )}
      </div>
    </aside>
  )
}

