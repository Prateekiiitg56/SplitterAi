import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home,
  Compass,
  LayoutGrid,
  Users,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  Cloud,
  Shield,
  Sliders,
  HelpCircle,
  BookOpen,
  Settings,
  ChevronsLeft,
} from 'lucide-react'
import type { SessionEntry } from '../data'

interface SidebarProps {
  collapsed?: boolean
  sessions?: SessionEntry[]
  selectedSession: string
  onSelectSession: (id: string) => void
  workspace?: string
  currentPath: string
  onToggleCollapse?: () => void
}

export default function Sidebar({
  selectedSession,
  onSelectSession,
  currentPath,
}: SidebarProps) {
  let navigate = (path: string) => { window.location.href = path }
  try {
    const nav = useNavigate()
    if (typeof nav === 'function') navigate = nav
  } catch { /* fallback */ }

  const [projectOpen, setProjectOpen] = useState(true)

  const mainNav = [
    { id: '/', label: 'Home', icon: <Home size={15} strokeWidth={1.75} /> },
    { id: '/projects', label: 'Projects', icon: <Compass size={15} strokeWidth={1.75} /> },
    { id: '/agents', label: 'Agents', icon: <Users size={15} strokeWidth={1.75} /> },
    { id: '/integrations', label: 'Integrations', icon: <LayoutGrid size={15} strokeWidth={1.75} /> },
  ]

  const projectItems = [
    { id: '/run', label: 'Database', icon: <Database size={13.5} strokeWidth={1.5} /> },
    { id: '/agent/planner', label: 'Files', icon: <FileText size={13.5} strokeWidth={1.5} /> },
    { id: '/logs', label: 'Cloud', icon: <Cloud size={13.5} strokeWidth={1.5} /> },
    { id: '/config', label: 'Security', icon: <Shield size={13.5} strokeWidth={1.5} /> },
    { id: '/settings', label: 'Config', icon: <Sliders size={13.5} strokeWidth={1.5} /> },
  ]

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0 select-none text-white font-sans border-r border-[#242C42]"
      style={{
        width: 256,
        minWidth: 256,
        background: '#101420',
      }}
    >
      {/* ── Workspace Header ─────────────────────────────────── */}
      <div className="p-3 border-b border-[#1E2538]">
        <button
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl bg-[#192031] border border-[#2B354F] hover:border-[#3D4A6E] transition-colors cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[#101420] border border-[#2B354F] flex items-center justify-center p-1 flex-shrink-0 shadow-2xs">
            <img
              src="/splitterai-logo.png"
              alt="SplitterAI Logo"
              className="w-5 h-5 object-contain"
            />
          </div>
          <span className="text-[13.5px] font-bold text-white flex-1 text-left truncate tracking-tight">
            SplitterAI
          </span>
          <ChevronDown size={14} className="text-[#677294] flex-shrink-0" />
        </button>
      </div>

      {/* ── Main Navigation ─────────────────────────────────── */}
      <div className="px-3 pt-3 space-y-1">
        {mainNav.map((item) => {
          const isActive = item.id === '/' ? currentPath === '/' : currentPath.startsWith(item.id)
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.id)}
              className={`flex items-center gap-3 w-full h-9 px-3 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                isActive
                  ? 'text-white bg-[#2B2358] border border-[#48398C]'
                  : 'text-[#9FA8C4] hover:bg-[#192031] hover:text-white'
              }`}
            >
              <span className={isActive ? 'text-[#9D8CFC]' : 'text-[#677294]'}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Project Section ──────────────────────────────────── */}
      <div className="px-3 mt-4 flex-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10.5px] font-bold uppercase tracking-wider text-[#677294]">
          ACTIVE SESSIONS
        </p>

        <button
          onClick={() => setProjectOpen(!projectOpen)}
          className="flex items-center gap-2 w-full h-8.5 px-3 rounded-lg text-[13px] font-semibold text-white hover:bg-[#192031] transition-colors cursor-pointer"
        >
          {projectOpen ? <ChevronDown size={14} className="text-[#677294]" /> : <ChevronRight size={14} className="text-[#677294]" />}
          <span className="flex-1 text-left truncate">Workspace Runs</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-neutral-400">
            {sessions.length}
          </span>
        </button>

        {projectOpen && (
          <div className="relative ml-3 pl-2 my-1 space-y-1">
            <div className="absolute left-0 top-1 bottom-1 w-px bg-[#242C42]" />

            {sessions.length === 0 ? (
              <p className="text-[11px] text-[#677294] italic px-3 py-1">No active session runs</p>
            ) : (
              sessions.map((s, idx) => {
                const isSelected = selectedSession === s.id
                return (
                  <button
                    key={s.id || idx}
                    onClick={() => {
                      onSelectSession(s.id)
                      navigate('/run')
                    }}
                    className={`flex items-center gap-2.5 w-full h-8 px-2.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer text-left truncate ${
                      isSelected
                        ? 'text-white bg-[#2B2358] border border-[#48398C]'
                        : 'text-[#9FA8C4] hover:text-white hover:bg-[#192031]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span className="truncate flex-1">{s.task || s.workspace.split(/[/\\]/).pop()}</span>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Section ───────────────────────────────────── */}
      <div className="px-3 pb-3 space-y-1">
        {[
          { icon: <BookOpen size={14.5} strokeWidth={1.5} />, label: 'Documentation' },
          { icon: <HelpCircle size={14.5} strokeWidth={1.5} />, label: 'Support' },
        ].map((item) => (
          <button
            key={item.label}
            className="flex items-center gap-3 w-full h-8.5 px-3 rounded-lg text-[12.5px] font-medium text-[#9FA8C4] hover:text-white hover:bg-[#192031] transition-colors cursor-pointer"
          >
            <span className="text-[#677294]">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        {/* User Profile Card */}
        <div className="flex items-center gap-2.5 px-2 py-2 border-t border-[#242C42] pt-3">
          <div className="w-8 h-8 rounded-full bg-[#30A46C] text-white font-bold text-[13px] flex items-center justify-center flex-shrink-0">
            S
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold text-white truncate leading-tight">Developer Workspace</p>
            <p className="text-[10.5px] text-[#677294]">Active</p>
          </div>
          <button className="p-1.5 rounded-md text-[#677294] hover:text-white hover:bg-[#192031] cursor-pointer">
            <Settings size={15} strokeWidth={1.5} />
          </button>
        </div>

        {/* Collapse Button */}
        <div className="px-1 pt-1 flex items-center">
          <button
            className="p-1 text-[#677294] hover:text-white cursor-pointer transition-colors"
            title="Collapse sidebar"
          >
            <ChevronsLeft size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
