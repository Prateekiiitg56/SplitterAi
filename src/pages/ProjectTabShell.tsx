import React from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, Users, FolderTree, Terminal } from 'lucide-react'
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
    { id: `/projects/${projectId}/tasks`, label: 'Tasks', icon: CheckSquare },
    { id: `/projects/${projectId}/agents`, label: 'Agents', icon: Users },
    { id: `/projects/${projectId}/files`, label: 'Files', icon: FolderTree },
    { id: `/projects/${projectId}/activity`, label: 'Activity Logs', icon: Terminal },
  ]

  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-[#121723] relative z-10">
      {/* Sub-navigation Header Bar */}
      <div className="flex items-center justify-between px-6 h-12 border-b border-[#242C42] bg-[#101420] select-none flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold text-white tracking-tight">Project:</span>
          <span className="text-[12.5px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {projectId === 'default' ? 'SplitterAI Workspace' : projectId}
          </span>
          <span className="text-neutral-500 text-[12px] truncate max-w-[200px]" title={DEFAULT_WORKSPACE}>
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'text-white bg-[#2B2358] border border-[#48398C]'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <tab.icon size={14} className={isActive ? 'text-[#9D8CFC]' : 'text-neutral-500'} />
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
