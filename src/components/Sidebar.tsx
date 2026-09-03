import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, Search, Play, Link2, ChevronDown, ChevronRight, ChevronUp,
  Database, FolderOpen, Cloud, Shield, Settings, HelpCircle, Users,
  BookOpen, Zap, User,
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
  sessions = [],
  selectedSession,
  onSelectSession,
  currentPath,
}: SidebarProps) {
  let navigate = (path: string) => { window.location.href = path }
  try { const nav = useNavigate(); if (typeof nav === 'function') navigate = nav } catch {}

  const [projectOpen, setProjectOpen] = useState(true)

  const topNav = [
    { id: '/', label: 'Home', icon: <Home size={18} strokeWidth={1.5} /> },
    { id: '/search', label: 'Search', icon: <Search size={18} strokeWidth={1.5} /> },
    { id: '/run', label: 'Runs', icon: <Play size={18} strokeWidth={1.5} /> },
    { id: '/integrations', label: 'Integrations', icon: <Link2 size={18} strokeWidth={1.5} /> },
  ]

  const projectChildren = [
    { id: '/run', label: 'Runs', icon: <Database size={16} strokeWidth={1.5} /> },
    { id: '/agent/planner', label: 'Agents', icon: <FolderOpen size={16} strokeWidth={1.5} /> },
    { id: '/logs', label: 'Logs', icon: <Cloud size={16} strokeWidth={1.5} /> },
    { id: '/config', label: 'Config', icon: <Shield size={16} strokeWidth={1.5} /> },
  ]

  const secondaryItems = [
    { label: 'Auditor Agent', status: 'Idle' },
    { label: 'Tester Agent', status: 'Offline' },
  ]

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0 select-none rounded-2xl border mr-3 overflow-hidden"
      style={{
        width: 260, minWidth: 260,
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* ── Workspace Switcher ───────────────────────────────── */}
      <div className="p-3 flex-shrink-0">
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[13px] font-bold"
            style={{ background: 'var(--color-accent)' }}
          >
            SA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-1)' }}>
              SplitterAi
            </p>
            <p className="text-[11px] truncate" style={{ color: 'var(--color-text-3)' }}>
              Multi-agent workspace
            </p>
          </div>
          <ChevronDown size={14} style={{ color: 'var(--color-text-3)' }} />
        </div>
      </div>

      {/* ── Top Nav Items ────────────────────────────────────── */}
      <div className="px-3 space-y-0.5">
        {topNav.map((item) => {
          const isActive = item.id === '/' ? currentPath === '/' : currentPath.startsWith(item.id)
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.id)}
              className="flex items-center w-full h-9 px-3 rounded-lg text-[13px] font-medium cursor-pointer transition-all gap-3"
              style={{
                background: isActive ? 'var(--color-recessed)' : 'transparent',
                color: isActive ? 'var(--color-text-1)' : 'var(--color-text-2)',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--color-surface-hover)' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? 'var(--color-recessed)' : 'transparent' }}
            >
              <span style={{ color: isActive ? 'var(--color-text-1)' : 'var(--color-text-3)' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Project Section ──────────────────────────────────── */}
      <div className="px-3 mt-5">
        <p className="px-3 mb-2 t-micro">Project</p>

        {/* Main project row */}
        <button
          onClick={() => setProjectOpen(!projectOpen)}
          className="flex items-center w-full h-9 px-3 rounded-lg text-[13px] font-semibold cursor-pointer transition-colors gap-2"
          style={{ color: 'var(--color-text-1)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          {projectOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Zap size={16} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
          <span className="flex-1 text-left">AgentCLI</span>
          <span className="chip-status chip-status-active text-[10px]">Active</span>
        </button>

        {/* Expanded project children with guide line */}
        {projectOpen && (
          <div className="relative ml-[22px] pl-4 mt-1 space-y-0.5">
            {/* Faint vertical guide line */}
            <div
              className="absolute left-0 top-0 bottom-0 w-px"
              style={{ background: 'var(--color-border)' }}
            />
            {projectChildren.map((child) => {
              const isActive = currentPath.startsWith(child.id)
              return (
                <button
                  key={child.label}
                  onClick={() => navigate(child.id)}
                  className="flex items-center w-full h-8 px-2.5 rounded-lg text-[12.5px] cursor-pointer transition-colors gap-2.5"
                  style={{
                    background: isActive ? 'var(--color-recessed)' : 'transparent',
                    color: isActive ? 'var(--color-text-1)' : 'var(--color-text-2)',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--color-surface-hover)' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? 'var(--color-recessed)' : 'transparent' }}
                >
                  <span style={{ color: 'var(--color-text-3)' }}>{child.icon}</span>
                  <span>{child.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Secondary Agents ─────────────────────────────────── */}
      <div className="px-3 mt-4 space-y-0.5">
        {secondaryItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center h-8 px-3 rounded-lg text-[12.5px] gap-2.5"
            style={{ color: 'var(--color-text-2)' }}
          >
            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'var(--color-recessed)' }}>
              <User size={11} style={{ color: 'var(--color-text-3)' }} />
            </div>
            <span className="flex-1">{item.label}</span>
            <span className="chip-status chip-status-idle text-[10px]">{item.status}</span>
          </div>
        ))}
      </div>

      <div className="flex-1" />

      {/* ── Bottom Section ───────────────────────────────────── */}
      <div className="px-3 pb-2 space-y-0.5 flex-shrink-0">
        {[
          { icon: <HelpCircle size={16} strokeWidth={1.5} />, label: 'Support' },
          { icon: <Users size={16} strokeWidth={1.5} />, label: 'Team' },
          { icon: <BookOpen size={16} strokeWidth={1.5} />, label: 'Documentation' },
        ].map((item) => (
          <button
            key={item.label}
            className="flex items-center w-full h-8 px-3 rounded-lg text-[12.5px] cursor-pointer transition-colors gap-3"
            style={{ color: 'var(--color-text-2)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ color: 'var(--color-text-3)' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        {/* Upsell info card */}
        <div className="mx-1 mt-2 mb-3 p-3 rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(65,85,47,0.08)' }}>
              <Zap size={14} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <p className="text-[12px] font-semibold" style={{ color: 'var(--color-text-1)' }}>Upgrade to Pro</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-3)' }}>Unlock parallel execution and priority model routing.</p>
            </div>
          </div>
        </div>

        {/* User card */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[12px] font-bold"
            style={{ background: 'var(--color-accent)' }}
          >
            D
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-1)' }}>Developer</p>
            <p className="text-[11px] truncate" style={{ color: 'var(--color-text-3)' }}>Free tier</p>
          </div>
          <button className="p-1 rounded-lg cursor-pointer" style={{ color: 'var(--color-text-3)' }}>
            <Settings size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  )
}
