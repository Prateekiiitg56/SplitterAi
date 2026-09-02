import {
  FolderOpen,
  Settings,
  Loader2,
  CheckCircle2,
  XCircle,
  GitBranch,
  Users,
} from 'lucide-react'
import type { Subtask, RunStatus } from '../data'
import { ROLE_META } from '../data'

interface TopBarProps {
  workspace: string
  runStatus: RunStatus
  multiMode: boolean
  onToggleMulti: () => void
  subtasks: Subtask[]
}

export default function TopBar({
  workspace,
  runStatus,
  multiMode,
  onToggleMulti,
  subtasks,
}: TopBarProps) {
  const runningCount = subtasks.filter((s) => s.status === 'running').length
  const doneCount = subtasks.filter((s) => s.status === 'success').length
  const totalCount = subtasks.length
  const activeRoles = [...new Set(subtasks.filter((s) => s.status === 'running').map((s) => s.role))]

  return (
    <header className="flex items-center h-12 px-4 border-b border-border flex-shrink-0 gap-3">
      {/* Workspace path */}
      <div className="flex items-center gap-2 text-text-secondary flex-shrink-0">
        <FolderOpen size={15} />
        <span
          className="text-[13px]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {workspace}
        </span>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-border" />

      {/* Multi-agent toggle */}
      <button
        onClick={onToggleMulti}
        className={`flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] transition-colors duration-150 cursor-pointer ${
          multiMode
            ? 'bg-nav-pill text-primary'
            : 'bg-hover-bg text-text-secondary hover:text-text-primary'
        }`}
        style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}
        title={multiMode ? 'Multi-agent mode (planner + workers)' : 'Single agent mode'}
      >
        {multiMode ? <Users size={13} /> : <GitBranch size={13} />}
        {multiMode ? 'Multi-Agent' : 'Single Agent'}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Run status summary */}
      {totalCount > 0 && (
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Active agent indicators */}
          {activeRoles.length > 0 && (
            <div className="flex items-center gap-1">
              {activeRoles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px]"
                  style={{
                    backgroundColor: ROLE_META[role].bg,
                    color: ROLE_META[role].color,
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 500,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ backgroundColor: ROLE_META[role].color }} />
                  {ROLE_META[role].label}
                </span>
              ))}
            </div>
          )}

          {/* Progress */}
          <div className="flex items-center gap-2 text-[12px] text-text-secondary tabular-nums" style={{ fontFamily: 'var(--font-ui)' }}>
            {runStatus === 'executing' && (
              <>
                <Loader2 size={14} className="text-primary animate-spin" />
                <span>{doneCount}/{totalCount} subtasks</span>
              </>
            )}
            {runStatus === 'planning' && (
              <>
                <Loader2 size={14} className="text-purple animate-spin" />
                <span>Planning…</span>
              </>
            )}
            {runStatus === 'done' && (
              <>
                <CheckCircle2 size={14} className="text-success" />
                <span>All {totalCount} complete</span>
              </>
            )}
            {runStatus === 'error' && (
              <>
                <XCircle size={14} className="text-urgent-red" />
                <span>Failed</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Settings */}
      <button
        className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-hover-bg transition-colors duration-150 text-text-secondary cursor-pointer"
        title="Settings"
      >
        <Settings size={16} />
      </button>
    </header>
  )
}
