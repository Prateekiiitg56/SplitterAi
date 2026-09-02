import type React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderOpen,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
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
  subtasks,
}: TopBarProps) {
  let navigate = (path: string) => { window.location.href = path }
  try {
    const nav = useNavigate()
    if (typeof nav === 'function') navigate = nav
  } catch (e) {
    // fallback if router context reloaded
  }
  const doneCount = subtasks.filter((s) => s.status === 'success').length
  const totalCount = subtasks.length

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-slate-200/80 bg-white/90 backdrop-blur-md flex-shrink-0">
      {/* Left: Brand Lockup + Divider + Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Brand Icon */}
        <div
          onClick={() => navigate('/')}
          className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center text-white shadow-xs flex-shrink-0 cursor-pointer hover:bg-slate-800 transition-colors"
          title="Go to Home"
        >
          <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
            <line x1="20" y1="20" x2="20" y2="7" stroke="#94A3B8" strokeWidth="2.5" />
            <line x1="20" y1="20" x2="33" y2="20" stroke="#94A3B8" strokeWidth="2.5" />
            <line x1="20" y1="20" x2="20" y2="33" stroke="#94A3B8" strokeWidth="2.5" />
            <line x1="20" y1="20" x2="7" y2="20" stroke="#94A3B8" strokeWidth="2.5" />
            <circle cx="20" cy="20" r="4.5" fill="#38BDF8" />
            <circle cx="20" cy="7" r="3.5" fill="#E2E8F0" />
            <circle cx="33" cy="20" r="3.5" fill="#E2E8F0" />
            <circle cx="20" cy="33" r="3.5" fill="#E2E8F0" />
            <circle cx="7" cy="20" r="3.5" fill="#E2E8F0" />
          </svg>
        </div>

        <span
          onClick={() => navigate('/')}
          className="text-[15px] font-bold text-slate-900 tracking-tight font-sans cursor-pointer"
        >
          agentcli
        </span>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-300" />

        {/* Breadcrumb / Workspace Path */}
        <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[12px]">
          <FolderOpen size={13} className="text-slate-400" />
          <span>{workspace}</span>
        </div>
      </div>

      {/* Right: Subtask Execution Progress & Primary Action */}
      <div className="flex items-center gap-4">
        {totalCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200/60 text-[12px] font-medium text-slate-700">
            {runStatus === 'executing' && (
              <>
                <Loader2 size={13} className="text-blue-600 animate-spin" />
                <span>Exec: {doneCount}/{totalCount} subtasks</span>
              </>
            )}
            {runStatus === 'planning' && (
              <>
                <Loader2 size={13} className="text-purple-600 animate-spin" />
                <span>Planning subtasks…</span>
              </>
            )}
            {runStatus === 'done' && (
              <>
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>All {totalCount} complete</span>
              </>
            )}
            {runStatus === 'error' && (
              <>
                <XCircle size={13} className="text-red-600" />
                <span>Execution failed</span>
              </>
            )}
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-xs cursor-pointer"
        >
          <Plus size={14} className="text-slate-500" />
          <span>New Task</span>
        </button>
      </div>
    </header>
  )
}
