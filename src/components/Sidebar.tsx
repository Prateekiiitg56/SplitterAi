import { useNavigate } from 'react'
import {
  Home,
  Play,
  Users,
  Clock,
  Layers,
  Code,
  ShieldCheck,
  TestTube,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings,
  User,
} from 'lucide-react'
import type { SessionEntry } from '../data'
import { mockAgents, type AgentRole } from '../data'
import SidebarAgentSimulation3D from './SidebarAgentSimulation3D'

/* ── Sidebar palette (dark teal) ──────────────────────────────── */
const S = {
  bg: '#1A343E',
  bgHover: 'rgba(251,233,208,0.06)',
  bgActive: 'rgba(230,72,51,0.1)',
  text: '#FBE9D0',
  textMuted: '#90AEAD',
  textDim: 'rgba(144,174,173,0.6)',
  accent: '#E64833',
  green: '#34D399',
  border: 'rgba(251,233,208,0.08)',
} as const

/* ── Agent icon helper ────────────────────────────────────────── */
const agentIcons: Record<AgentRole, React.ReactNode> = {
  planner: <Layers size={14} />,
  coder: <Code size={14} />,
  auditor: <ShieldCheck size={14} />,
  tester: <TestTube size={14} />,
}

/* ── Session status icon ──────────────────────────────────────── */
function SessionStatusDot({ status }: { status: string }) {
  switch (status) {
    case 'done':
      return <CheckCircle2 size={12} style={{ color: S.green }} className="flex-shrink-0" />
    case 'error':
      return <XCircle size={12} style={{ color: S.accent }} className="flex-shrink-0" />
    case 'executing':
    case 'planning':
      return <span className="w-2 h-2 rounded-full animate-pulse-dot flex-shrink-0" style={{ background: S.accent }} />
    default:
      return <AlertCircle size={12} style={{ color: S.textMuted }} className="flex-shrink-0" />
  }
}

/* ── Agent status dot from real data ──────────────────────────── */
function AgentStatusDot({ role }: { role: AgentRole }) {
  const agent = mockAgents.find((a) => a.role === role)
  const isActive = agent?.status === 'active'
  return (
    <span
      className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'animate-pulse-dot' : ''}`}
      style={{ background: isActive ? S.green : S.textMuted }}
      title={isActive ? 'Active' : 'Idle'}
    />
  )
}

/* ── Types ─────────────────────────────────────────────────────── */
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
  try {
    const nav = useNavigate()
    if (typeof nav === 'function') navigate = nav
  } catch (e) {
    // fallback
  }

  const navItems = [
    { id: '/', label: 'Home (Console)', icon: <Home size={16} />, shortcut: '⌘1' },
    { id: '/run', label: 'Run Execution', icon: <Play size={16} />, shortcut: '⌘2' },
    { id: '/agent/planner', label: 'Agent Roster', icon: <Users size={16} />, shortcut: '⌘3' },
    { id: '/run', label: 'Audit Logs', icon: <Clock size={16} />, shortcut: '⌘4' },
  ]

  const agents: { role: AgentRole; label: string }[] = [
    { role: 'planner', label: 'Planner' },
    { role: 'coder', label: 'Coder' },
    { role: 'auditor', label: 'Auditor' },
    { role: 'tester', label: 'Tester' },
  ]

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0 select-none relative z-10"
      style={{
        width: 264,
        minWidth: 264,
        background: S.bg,
        borderRight: `1px solid ${S.border}`,
      }}
    >
      {/* ── Product Identity ─────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 h-16 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(230,72,51,0.15)', border: '1px solid rgba(230,72,51,0.25)' }}
        >
          <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
            <line x1="20" y1="20" x2="20" y2="7" stroke="#90AEAD" strokeWidth="2.5" />
            <line x1="20" y1="20" x2="33" y2="20" stroke="#90AEAD" strokeWidth="2.5" />
            <line x1="20" y1="20" x2="20" y2="33" stroke="#90AEAD" strokeWidth="2.5" />
            <line x1="20" y1="20" x2="7" y2="20" stroke="#90AEAD" strokeWidth="2.5" />
            <circle cx="20" cy="20" r="4.5" fill="#E64833" />
            <circle cx="20" cy="7" r="3" fill="#FBE9D0" />
            <circle cx="33" cy="20" r="3" fill="#FBE9D0" />
            <circle cx="20" cy="33" r="3" fill="#FBE9D0" />
            <circle cx="7" cy="20" r="3" fill="#FBE9D0" />
          </svg>
        </div>
        <div className="flex flex-col min-w-0">
          <span style={{ fontSize: 15, fontWeight: 600, color: S.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            AgentCLI
          </span>
          <span className="font-mono" style={{ fontSize: 10, color: S.textMuted, lineHeight: 1.2, marginTop: 2 }}>
            v1.0
          </span>
        </div>
      </div>

      <div className="h-px mx-4" style={{ background: S.border }} />

      {/* ── NAVIGATION ───────────────────────────────────────── */}
      <div className="px-3 pt-4 pb-2">
        <p className="px-3 mb-2" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: S.textMuted }}>
          NAVIGATION
        </p>
        <div className="space-y-0.5">
          {navItems.map((item, idx) => {
            const isActive = idx === 0 ? currentPath === '/' : currentPath === item.id && currentPath !== '/'
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.id)}
                className="relative flex items-center w-full rounded-lg cursor-pointer transition-all duration-150"
                style={{
                  height: 40,
                  paddingLeft: isActive ? 14 : 16,
                  paddingRight: 12,
                  background: isActive ? S.bgActive : 'transparent',
                  borderLeft: isActive ? `2px solid ${S.accent}` : '2px solid transparent',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = S.bgHover }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <span className="flex-shrink-0" style={{ color: isActive ? S.accent : S.textMuted }}>
                  {item.icon}
                </span>
                <span className="ml-3 text-[13px] font-medium flex-1 text-left" style={{ color: isActive ? S.text : S.textMuted }}>
                  {item.label}
                </span>
                <span className="text-[10px] font-mono flex-shrink-0 opacity-40" style={{ color: S.textMuted }}>
                  {item.shortcut}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── AGENTS ────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2">
        <p className="px-3 mb-2" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: S.textMuted }}>
          AGENTS
        </p>
        <div className="space-y-0.5">
          {agents.map((agent) => {
            const agentPath = `/agent/${agent.role}`
            const isActive = currentPath === agentPath
            return (
              <button
                key={agent.role}
                onClick={() => navigate(agentPath)}
                className="flex items-center w-full rounded-lg cursor-pointer transition-all duration-150"
                style={{
                  height: 36,
                  paddingLeft: 16,
                  paddingRight: 12,
                  background: isActive ? S.bgHover : 'transparent',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = S.bgHover }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? S.bgHover : 'transparent' }}
              >
                <span className="flex-shrink-0" style={{ color: isActive ? S.text : S.textMuted }}>
                  {agentIcons[agent.role]}
                </span>
                <span className="ml-3 text-[13px] font-medium flex-1 text-left" style={{ color: isActive ? S.text : S.textMuted }}>
                  {agent.label}
                </span>
                <AgentStatusDot role={agent.role} />
              </button>
            )
          })}
        </div>
      </div>

      {/* 3D Agent Simulation Canvas */}
      <SidebarAgentSimulation3D />

      <div className="h-px mx-4 my-2" style={{ background: S.border }} />

      {/* ── RECENT RUNS ───────────────────────────────────────── */}
      <p className="px-6 mb-1.5 flex-shrink-0" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: S.textMuted }}>
        RECENT RUNS
      </p>
      <div className="flex-1 overflow-y-auto px-3 space-y-0.5 min-h-0">
        {sessions.map((session) => {
          const isSel = selectedSession === session.id
          return (
            <button
              key={session.id}
              onClick={() => { onSelectSession(session.id); navigate('/run') }}
              className="flex items-center gap-2 w-full text-left rounded-lg cursor-pointer transition-all duration-150"
              style={{ padding: '6px 10px', background: isSel ? S.bgHover : 'transparent' }}
              onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = S.bgHover }}
              onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
            >
              <SessionStatusDot status={session.status} />
              <span className="truncate flex-1 min-w-0 text-[12px]" style={{ color: isSel ? S.text : S.textMuted }}>
                {session.task}
              </span>
              <span className="text-[10px] font-mono flex-shrink-0 ml-1" style={{ color: S.textDim }}>
                {session.createdAt}
              </span>
            </button>
          )
        })}
      </div>

      <div className="h-px mx-4" style={{ background: S.border }} />

      {/* ── Bottom System Bar ─────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 h-12 flex-shrink-0">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: S.green }} />
        <span className="text-[11px] flex-1" style={{ color: S.textMuted }}>Operational</span>
        <button className="p-1.5 rounded-md transition-colors cursor-pointer" style={{ color: S.textMuted }} title="Settings">
          <Settings size={14} />
        </button>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(251,233,208,0.08)', border: `1px solid ${S.border}` }}
        >
          <User size={13} style={{ color: S.textMuted }} />
        </div>
      </div>
    </aside>
  )
}
