import { useNavigate } from 'react'
import {
  FolderOpen,
  Zap,
  Home,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  Clock,
  ShieldCheck,
  Code,
  TestTube,
  Layers,
} from 'lucide-react'
import type { SessionEntry } from '../data'

interface SidebarProps {
  sessions?: SessionEntry[]
  selectedSession: string
  onSelectSession: (id: string) => void
  workspace: string
  currentPath: string
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'executing': return <Loader2 size={13} className="text-teal-400 animate-spin flex-shrink-0" />
    case 'done':      return <CheckCircle2 size={13} className="text-teal-400 flex-shrink-0" />
    case 'error':     return <XCircle size={13} className="text-red-400 flex-shrink-0" />
    default:          return <Clock size={13} className="text-slate-500 flex-shrink-0" />
  }
}

export default function Sidebar({
  sessions = [], selectedSession,
  onSelectSession, currentPath,
}: SidebarProps) {
  let navigate = (path: string) => { window.location.href = path }
  try {
    const nav = useNavigate()
    if (typeof nav === 'function') navigate = nav
  } catch (e) {
    // fallback
  }

  const navItems = [
    { id: '/', label: 'Home (Console)', icon: <Home size={15} /> },
    { id: '/run', label: 'Run Execution', icon: <Play size={15} /> },
    { id: '/agent/planner', label: 'Agent Roster', icon: <Users size={15} /> },
    { id: '/run', label: 'Audit Logs', icon: <Clock size={15} /> },
  ]

  const agentLinks = [
    { id: '/agent/planner', label: 'Planner', icon: <Layers size={14} className="text-sky-400" /> },
    { id: '/agent/coder', label: 'Coder', icon: <Code size={14} className="text-blue-400" /> },
    { id: '/agent/auditor', label: 'Auditor', icon: <ShieldCheck size={14} className="text-amber-400" /> },
    { id: '/agent/tester', label: 'Tester', icon: <TestTube size={14} className="text-emerald-400" /> },
  ]

  return (
    <aside className="w-[240px] flex flex-col h-full bg-slate-950/90 backdrop-blur-xl border-r border-slate-800/80 text-slate-300 flex-shrink-0 select-none">

      {/* Navigation Section */}
      <div className="p-3 space-y-1 pt-4">
        <p className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          NAVIGATION
        </p>
        {navItems.map((item) => {
          const isActive = currentPath === item.id
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`flex items-center gap-2.5 w-full h-8 px-3 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-800/90 text-sky-400 border border-slate-700/80 font-semibold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
              }`}
            >
              <span className={isActive ? 'text-sky-400' : 'text-slate-400'}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* Agents Section */}
      <div className="px-3 py-2 space-y-1">
        <p className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          AGENTS
        </p>
        {agentLinks.map((agent) => {
          const isActive = currentPath === agent.id
          return (
            <button
              key={agent.id}
              onClick={() => navigate(agent.id)}
              className={`flex items-center justify-between w-full h-8 px-3 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-800/90 text-white font-semibold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {agent.icon}
                <span>{agent.label}</span>
              </div>
              <CheckCircle2 size={13} className="text-teal-400" />
            </button>
          )
        })}
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-800/80 mx-3 my-2" />

      {/* Recent Runs Section */}
      <p className="px-5 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
        Recent Runs
      </p>

      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {sessions.map((session) => {
          const isSel = selectedSession === session.id
          return (
            <button
              key={session.id}
              onClick={() => { onSelectSession(session.id); navigate('/run') }}
              className={`flex items-start gap-2.5 w-full text-left rounded-lg p-2 transition-all cursor-pointer ${
                isSel
                  ? 'bg-slate-800/90 text-white border border-slate-700/80'
                  : 'hover:bg-slate-900/60 text-slate-400 border border-transparent'
              }`}
            >
              <span className="mt-0.5">{statusIcon(session.status)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate leading-tight">
                  {session.task}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {session.createdAt}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
