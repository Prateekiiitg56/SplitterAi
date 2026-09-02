import type React from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, User } from 'lucide-react'

interface TopBarProps {
  workspace?: string
  runStatus?: string
  multiMode?: boolean
  onToggleMulti?: () => void
  subtasks?: any[]
}

export default function TopBar({}: TopBarProps) {
  let navigate = (path: string) => { window.location.href = path }
  try {
    const nav = useNavigate()
    if (typeof nav === 'function') navigate = nav
  } catch (e) {
    // fallback
  }

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 text-white flex-shrink-0 select-none">
      {/* Left Lockup: Menu + Icon + agentcli + Version Badge */}
      <div className="flex items-center gap-3">
        <button className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer">
          <Menu size={18} />
        </button>

        {/* Node graph icon */}
        <div
          onClick={() => navigate('/')}
          className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center text-white cursor-pointer hover:border-slate-500 transition-colors"
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
          className="text-[16px] font-bold text-white tracking-tight cursor-pointer font-sans"
        >
          agentcli
        </span>

        <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
          v1.0-orchestrator
        </span>
      </div>

      {/* Center Search / Breadcrumb Pill */}
      <div className="hidden md:flex items-center justify-center px-6 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[13px] text-slate-300 font-mono max-w-md w-full">
        <span>agentcli</span>
        <span className="mx-2 text-slate-600">|</span>
        <span className="text-slate-400">multi-agent-orchestrator</span>
      </div>

      {/* Right Lockup: Live Workspace Button + User Profile */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/run')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-950/40 border border-teal-500/50 text-teal-300 text-[13px] font-medium hover:bg-teal-900/50 transition-all cursor-pointer shadow-[0_0_12px_rgba(20,184,166,0.15)]"
        >
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse-dot" />
          <span>Live Workspace</span>
        </button>

        <div className="hidden sm:flex items-center gap-2 text-right">
          <div className="flex flex-col text-[11px] text-slate-400 leading-tight">
            <span className="font-medium text-slate-300">Verify it's you</span>
            <span className="text-slate-500">Ask Gemini</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <User size={14} />
          </div>
        </div>
      </div>
    </header>
  )
}
