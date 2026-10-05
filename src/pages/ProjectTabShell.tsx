import { useEffect, type ReactNode } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, Users, FolderTree, Terminal, GitBranch } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { DEFAULT_WORKSPACE } from '../config'
import { listRuns } from '../lib/api'

interface ProjectTabShellProps {
  children: ReactNode
  title?: ReactNode
}

export default function ProjectTabShell({ children, title }: ProjectTabShellProps) {
  const { projectId = 'default' } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { currentWorkspace, taskTitle, sessions, sessionsLoading, openProject, runWorkspace, followRun, resetRun } = useApp()
  const session = sessions.find((s) => s.id === projectId)
  // Imported projects live outside workspace_output, so their path comes from the session list.
  const workspace = projectId === 'default'
    ? DEFAULT_WORKSPACE
    : session?.workspace ?? (sessionsLoading ? null : `./workspace_output/${projectId}`)

  // The URL decides which project is open, so a refresh or deep link never shows another project's files.
  useEffect(() => {
    if (workspace) openProject(workspace)
  }, [workspace]) // eslint-disable-line react-hooks/exhaustive-deps

  // Show this project's latest run (live or finished) unless the page already follows one of its runs.
  useEffect(() => {
    if (!workspace || workspace !== currentWorkspace || workspace === DEFAULT_WORKSPACE || runWorkspace === workspace) return
    let cancelled = false
    listRuns(workspace)
      .then((list) => {
        if (cancelled) return
        if (list.length) followRun(list[0].run_id)
        else resetRun()
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [workspace, currentWorkspace, runWorkspace]) // eslint-disable-line react-hooks/exhaustive-deps

  const tabs = [
    { id: `/projects/${projectId}`, label: 'Overview', icon: LayoutDashboard, exact: true },
    { id: `/projects/${projectId}/flow`, label: 'Flow', icon: GitBranch },
    { id: `/projects/${projectId}/tasks`, label: 'Tasks', icon: CheckSquare },
    { id: `/projects/${projectId}/agents`, label: 'Agents', icon: Users },
    { id: `/projects/${projectId}/files`, label: 'Files', icon: FolderTree },
    { id: `/projects/${projectId}/activity`, label: 'Activity', icon: Terminal },
  ]

  const active = tabs.find((t) =>
    t.exact ? location.pathname === t.id : location.pathname.startsWith(t.id)
  )

  const sessionTask = session?.task
  const isNew = currentWorkspace === DEFAULT_WORKSPACE
  const displayTitle = title ?? (taskTitle || sessionTask || (isNew ? 'New project' : 'Current run'))
  const displayPath = isNew ? 'folder is created on first run' : `~/workspace/${currentWorkspace.split(/[/\\]/).pop()}`

  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-transparent relative z-10 font-sans text-[var(--text)] select-none">
      {/* Project Chrome Header */}
      <header className="proj-head">
        <div className="proj-id">
          <h1 title={typeof displayTitle === 'string' ? displayTitle : undefined}>{displayTitle}</h1>
          <span className="path" title={currentWorkspace}>{displayPath}</span>
        </div>

        {/* Tab Strip */}
        <nav className="tab-strip" aria-label="Project sections">
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
                className={`tab-btn ${isActive ? 'active' : ''}`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </header>

      {/* Main Tab View Content */}
      <div className="tab-body flex flex-1 min-h-0 min-w-0">{children}</div>
    </div>
  )
}
