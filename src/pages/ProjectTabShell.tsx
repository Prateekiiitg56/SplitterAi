import type { ReactNode } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, Users, FolderTree, Terminal, GitBranch } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { cx } from '../lib/cx'

/**
 * ProjectTabShell — the chrome around any single-project route.
 *
 * One header row (the project name + its workspace), one tab strip beside
 * it. The strip reads as an address, not a jukebox: the active tab keeps a
 * 1px accent line at its base rather than filling itself with a chip.
 * The old version carried a "Project:" label and a tinted pill for the id
 * in every page — that was decoration, and it is gone.
 */

interface ProjectTabShellProps {
  children: ReactNode
  /** Defaults to the active tab's label. */
  title?: ReactNode
}

export default function ProjectTabShell({ children, title }: ProjectTabShellProps) {
  const { projectId = 'default' } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { currentWorkspace } = useApp()

  const tabs = [
    { id: `/projects/${projectId}`, label: 'Overview', icon: LayoutDashboard, exact: true },
    { id: `/projects/${projectId}/flow`, label: 'Flow', icon: GitBranch },
    { id: `/projects/${projectId}/tasks`, label: 'Tasks', icon: CheckSquare },
    { id: `/projects/${projectId}/agents`, label: 'Agents', icon: Users },
    { id: `/projects/${projectId}/files`, label: 'Files', icon: FolderTree },
    { id: `/projects/${projectId}/activity`, label: 'Activity', icon: Terminal },
  ]

  const active = tabs.find((t) =>
    t.exact ? location.pathname === t.id : location.pathname.startsWith(t.id),
  )

  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-[var(--bg)] relative z-10 font-sans text-[var(--text)]">
      <div className="flex items-center justify-between gap-4 h-12 px-5 flex-shrink-0 border-b border-[var(--border-soft)] bg-[var(--bg)] select-none">
        {/* Project identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-strong font-semibold text-[var(--text)] tracking-tight truncate">
            {title ?? active?.label ?? 'Project'}
          </h1>
          <span
            className="font-mono text-micro text-[var(--faint)] truncate max-w-[220px] tabular-nums"
            title={currentWorkspace}
          >
            {projectId === 'default' ? currentWorkspace : projectId}
          </span>
        </div>

        {/* Tab strip */}
        <nav aria-label="Project sections" className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = tab.exact
              ? location.pathname === tab.id
              : location.pathname.startsWith(tab.id)
            const Icon = tab.icon
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => navigate(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cx(
                  'relative flex items-center gap-1.5 h-7 px-2.5 rounded-[var(--r-control)]',
                  'text-meta font-medium whitespace-nowrap',
                  'transition-colors duration-[var(--d-quick)] ease-standard',
                  isActive
                    ? 'text-[var(--text)]'
                    : 'text-[var(--dim)] hover:text-[var(--text)] hover:bg-[var(--panel)]',
                )}
              >
                <Icon
                  size={13}
                  className={cx('flex-shrink-0', isActive ? 'text-[var(--accent)]' : 'text-[var(--faint)]')}
                />
                <span>{tab.label}</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-2.5 right-2.5 -bottom-[9px] h-px bg-[var(--accent)]"
                  />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Main tab content */}
      <div className="flex flex-1 min-h-0 min-w-0">{children}</div>
    </div>
  )
}
