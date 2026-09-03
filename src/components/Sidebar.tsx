import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Inbox,
  Search,
  Compass,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  Cloud,
  Shield,
  HelpCircle,
  Users,
  BookOpen,
  Gift,
  Settings,
  Globe,
  Palette,
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

  const [soaxOpen, setSoaxOpen] = useState(true)

  const navItems = [
    { id: '/', label: 'Inbox', icon: <Inbox size={16} strokeWidth={1.5} />, badge: '12' },
    { id: '/search', label: 'Search', icon: <Search size={16} strokeWidth={1.5} /> },
    { id: '/run', label: 'Overview', icon: <Compass size={16} strokeWidth={1.5} /> },
    { id: '/integrations', label: 'Integrations', icon: <LayoutGrid size={16} strokeWidth={1.5} /> },
  ]

  const projectChildren = [
    { id: '/run', label: 'Database', icon: <Database size={15} strokeWidth={1.5} /> },
    { id: '/agent/planner', label: 'Files', icon: <FileText size={15} strokeWidth={1.5} /> },
    { id: '/logs', label: 'Cloud', icon: <Cloud size={15} strokeWidth={1.5} /> },
    { id: '/config', label: 'Security', icon: <Shield size={15} strokeWidth={1.5} /> },
    { id: '/landing', label: 'Landing Page', icon: <Globe size={15} strokeWidth={1.5} /> },
    { id: '/design', label: 'Design System', icon: <Palette size={15} strokeWidth={1.5} /> },
  ]

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0 select-none text-white font-sans border-r border-[#242C42]"
      style={{
        width: 240,
        minWidth: 240,
        background: '#101420',
      }}
    >
      {/* ── Workspace Switcher Dropdown ───────────────────────── */}
      <div className="p-3">
        <button
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl bg-[#192031] border border-[#2B354F] hover:border-[#3D4A6E] transition-colors cursor-pointer"
        >
          <div className="w-6 h-6 rounded-md bg-[#6E56CF] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
            VE
          </div>
          <span className="text-[13px] font-semibold text-white flex-1 text-left truncate">
            Vlad's Workspace
          </span>
          <ChevronDown size={14} className="text-[#677294] flex-shrink-0" />
        </button>
      </div>

      {/* ── Main Nav Items ───────────────────────────────────── */}
      <div className="px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.id === '/' ? currentPath === '/' : currentPath.startsWith(item.id)
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.id)}
              className={`flex items-center gap-3 w-full h-8 px-3 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'text-white font-semibold bg-[#2B2358] border border-[#48398C]'
                  : 'text-[#9FA8C4] hover:bg-[#192031] hover:text-white'
              }`}
            >
              <span className={isActive ? 'text-[#9D8CFC]' : 'text-[#677294]'}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#6E56CF] text-white text-[10px] font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Project Section ──────────────────────────────────── */}
      <div className="px-2 mt-4">
        <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#677294]">
          PROJECT
        </p>

        {/* Soax Expandable Header */}
        <button
          onClick={() => setSoaxOpen(!soaxOpen)}
          className="flex items-center gap-2 w-full h-8 px-3 rounded-lg text-[13px] font-semibold text-white hover:bg-[#192031] transition-colors cursor-pointer"
        >
          {soaxOpen ? <ChevronDown size={14} className="text-[#677294]" /> : <ChevronRight size={14} className="text-[#677294]" />}
          <span className="flex-1 text-left">Soax</span>
          <span className="px-2 py-0.5 rounded-full bg-[#30A46C]/20 border border-[#30A46C]/40 text-[#30A46C] text-[10px] font-semibold tracking-wide">
            Active
          </span>
        </button>

        {/* Indented Sub-items with Vertical Guide Line */}
        {soaxOpen && (
          <div className="relative ml-[22px] pl-3.5 my-1 space-y-0.5">
            {/* Guide line */}
            <div className="absolute left-0 top-1 bottom-1 w-px bg-[#2B354F]" />

            {projectChildren.map((child) => (
              <button
                key={child.label}
                onClick={() => navigate(child.id)}
                className="flex items-center gap-2.5 w-full h-7 px-2 rounded-lg text-[12.5px] text-[#9FA8C4] hover:text-white hover:bg-[#192031] transition-colors cursor-pointer"
              >
                <span className="text-[#677294]">{child.icon}</span>
                <span>{child.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Secondary Workspaces */}
        <div className="mt-2 space-y-0.5">
          {[
            { name: 'Metapax', status: 'Offline' },
            { name: 'Carsana', status: 'Offline' },
          ].map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between h-7 px-3 rounded-lg text-[12.5px] text-[#9FA8C4]"
            >
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded border border-[#2F3954] flex items-center justify-center text-[9px] font-mono text-[#677294]">
                  {}
                </span>
                <span>{item.name}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#192031] text-[#677294] text-[10px] font-medium border border-[#2B354F]">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      {/* ── Bottom Section ───────────────────────────────────── */}
      <div className="px-2 pb-3 space-y-0.5">
        {[
          { icon: <HelpCircle size={15} strokeWidth={1.5} />, label: 'Support' },
          { icon: <Users size={15} strokeWidth={1.5} />, label: 'Members' },
          { icon: <BookOpen size={15} strokeWidth={1.5} />, label: 'Documentation' },
        ].map((item) => (
          <button
            key={item.label}
            className="flex items-center gap-3 w-full h-8 px-3 rounded-lg text-[12.5px] text-[#9FA8C4] hover:text-white hover:bg-[#192031] transition-colors cursor-pointer"
          >
            <span className="text-[#677294]">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        {/* Upgrade Card */}
        <div className="my-2 p-3 rounded-xl bg-[#192031] border border-[#2B354F] flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-white">Upgrade to Business</p>
            <p className="text-[10.5px] text-[#677294]">Unlock more features</p>
          </div>
          <div className="w-7 h-7 rounded-lg bg-[#6E56CF] text-white flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-[#5E46BF] transition-colors shadow-sm">
            <Gift size={13} />
          </div>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 pt-2">
          <div className="w-8 h-8 rounded-full bg-[#30A46C] text-white font-bold text-[13px] flex items-center justify-center flex-shrink-0">
            V
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold text-white truncate leading-tight">Vlad Ermakov</p>
            <p className="text-[10.5px] text-[#677294]">Free</p>
          </div>
          <button className="p-1 rounded-md text-[#677294] hover:text-white hover:bg-[#192031] cursor-pointer">
            <Settings size={15} strokeWidth={1.5} />
          </button>
        </div>

        {/* Bottom Left Collapse Icon */}
        <div className="px-2 pt-2 flex items-center">
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
