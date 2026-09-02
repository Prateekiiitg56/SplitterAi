import {
  FolderOpen,
  Settings,
  Loader2,
  CheckCircle2,
  XCircle,
  Users,
  User,
} from 'lucide-react'
import type { Subtask, RunStatus } from '../data'

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
  const doneCount = subtasks.filter((s) => s.status === 'success').length
  const totalCount = subtasks.length

  return (
    <header className="flex items-center h-11 px-4 border-b border-slate-200/80 bg-white/70 backdrop-blur-md flex-shrink-0">
      {/* Workspace */}
      <div className="flex items-center gap-1.5 text-text-secondary">
        <FolderOpen size={14} />
        <span className="text-[12px]" style={{ fontFamily: 'var(--font-mono)' }}>
          {workspace}
        </span>
      </div>

      <div className="h-4 w-px bg-border mx-3" />

      {/* Mode toggle */}
      <button
        onClick={onToggleMulti}
        className={`flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] cursor-pointer transition-colors ${
          multiMode ? 'bg-nav-pill text-primary' : 'bg-hover-bg text-text-secondary'
        }`}
        style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}
      >
        {multiMode ? <Users size={12} /> : <User size={12} />}
        {multiMode ? 'Multi-Agent' : 'Single'}
      </button>

      <div className="flex-1" />

      {/* Progress */}
      {totalCount > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-text-secondary mr-3" style={{ fontFamily: 'var(--font-ui)' }}>
          {runStatus === 'executing' && <Loader2 size={12} className="text-primary animate-spin" />}
          {runStatus === 'done' && <CheckCircle2 size={12} className="text-success" />}
          {runStatus === 'error' && <XCircle size={12} className="text-urgent-red" />}
          <span className="tabular-nums">{doneCount}/{totalCount}</span>
        </div>
      )}

      <button className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-hover-bg text-text-secondary cursor-pointer">
        <Settings size={15} />
      </button>
    </header>
  )
}
