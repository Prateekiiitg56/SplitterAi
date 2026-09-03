import React from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, Users, FolderTree, Terminal, GitBranch } from 'lucide-react'
import { DEFAULT_WORKSPACE } from '../config'

interface ProjectTabShellProps {
  children: React.ReactNode
}

export default function ProjectTabShell({ children }: ProjectTabShellProps) {
  const { projectId = 'default' } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    { id: `/projects/${projectId}`, label: 'Overview', icon: LayoutDashboard, exact: true },
    { id: `/projects/${projectId}/flow`, label: 'Flow', icon: GitBranch },
    { id: `/projects/${projectId}/tasks`, label: 'Tasks', icon: CheckSquare },
    { id: `/projects/${projectId}/agents`, label: 'Agents', icon: Users },
    { id: `/projects/${projectId}/files`, label: 'Files', icon: FolderTree },
    { id: `/projects/${projectId}/activity`, label: 'Activity Logs', icon: Terminal },
  ]

  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-[var(--bg)] relative z-10 font-sans text-[var(--text)]">
      {/* Sub-navigation Header Bar */}
      <div className="flex items-center justify-between px-5 h-11 border-b border-[var(--border-soft)] bg-[var(--panel)] select-none flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-semibold text-[var(--text)]">Project:</span>
          <span className="text-[11.5px] font-mono px-2 py-0.5 rounded bg-[var(--panel-2)] text-[var(--accent)] border border-[var(--border)] font-bold">
            {projectId === 'default' ? 'SplitterAI Workspace' : projectId}
          </span>
          <span className="text-[var(--faint)] font-mono text-[11px] truncate max-w-[200px]" title={DEFAULT_WORKSPACE}>
            {DEFAULT_WORKSPACE}
          </span>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = tab.exact
              ? location.pathname === tab.id
              : location.pathname.startsWith(tab.id)

            return (
              <button
                key={tab.label}
                onClick={() => navigate(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[var(--text)] bg-[var(--panel-2)] border border-[var(--border)] font-semibold'
                    : 'text-[var(--dim)] hover:text-[var(--text)] hover:bg-[var(--panel-2)]'
                }`}
              >
                <tab.icon size={13} className={isActive ? 'text-[var(--accent)]' : 'text-[var(--faint)]'} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex flex-1 min-h-0 min-w-0">
        {children}
      </div>
    </div>
  )
}
