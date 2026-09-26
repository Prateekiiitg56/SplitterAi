import type { ReactNode } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, Users, FolderTree, Terminal, GitBranch } from 'lucide-react'
import { useApp } from '../context/AppContext'

interface ProjectTabShellProps {
  children: ReactNode
  title?: ReactNode
}

export default function ProjectTabShell({ children, title }: ProjectTabShellProps) {
  const { projectId = 'default' } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { currentWorkspace, taskTitle, sessions } = useApp()

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

  const sessionTask = sessions.find((s) => s.id === projectId)?.task
  const displayTitle = title ?? (taskTitle || sessionTask || 'Current run')
  const displayPath = currentWorkspace ? `~/workspace/${currentWorkspace.split(/[/\\]/).pop()}` : `~/workspace/${projectId}`

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
