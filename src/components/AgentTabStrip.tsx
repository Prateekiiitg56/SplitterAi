import { Plus, RotateCcw, Settings, Sparkles, Eye, Share2, PanelRight, ChevronDown, HelpCircle } from 'lucide-react'
import { AgentRainbowBadge } from './BrandIcons'
import { ROLE_META } from '../data'
import { cx } from '../lib/cx'
import type { AgentRole } from '../types'

// Map roles to reference agent names
const AGENT_NAMES: Record<AgentRole, string> = {
  planner: 'Rune',
  coder: 'Aether',
  auditor: 'Syntax',
  tester: 'Theo',
  unassigned: 'Clara',
}

interface AgentTabStripProps {
  selectedRole: AgentRole
  sessionAgents: AgentRole[]
  onSelectRole: (role: AgentRole) => void
  onAddAgent: () => void
  onStartFromScratch: () => void
}

export default function AgentTabStrip({
  selectedRole,
  sessionAgents,
  onSelectRole,
  onAddAgent,
  onStartFromScratch,
}: AgentTabStripProps) {
  const activeAgentName = AGENT_NAMES[selectedRole] || 'Rune'

  return (
    <div className="flex flex-col flex-shrink-0 select-none bg-black/40 backdrop-blur-md z-10">
      {/* Row 1: Top Bar Header */}
      <div className="flex items-center justify-between h-12 px-6 border-b border-white/5 text-xs">
        {/* Left: Ask [Agent] */}
        <div className="flex items-center gap-2">
          <AgentRainbowBadge size={18} />
          <span className="font-semibold text-white/90 text-sm tracking-tight">
            Ask {activeAgentName}
          </span>
        </div>

        {/* Right: Quick Chat dropdown, Memory, Share, Avatar Stack, Help */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Sparkles size={13} className="text-amber-300" />
            <span>Quick Chat</span>
            <ChevronDown size={12} className="text-white/40" />
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 px-2 py-1 text-white/60 hover:text-white transition-colors"
          >
            <Eye size={13} />
            <span>Memory</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 px-2 py-1 text-white/60 hover:text-white transition-colors"
          >
            <Share2 size={13} />
            <span>Share</span>
          </button>

          {/* Avatars Stack */}
          <div className="flex items-center -space-x-1.5">
            <AgentRainbowBadge size={16} />
            <AgentRainbowBadge size={16} />
            <AgentRainbowBadge size={16} />
          </div>

          <button type="button" className="text-white/40 hover:text-white transition-colors">
            <HelpCircle size={15} />
          </button>
        </div>
      </div>

      {/* Row 2: Agent Tabs */}
      <div className="flex items-center justify-between h-10 px-6 border-b border-white/10 text-xs">
        {/* Left: Tabs */}
        <div className="flex items-center gap-1.5">
          {/* Active / Available Agent Tabs */}
          {(['planner', 'coder', 'auditor', 'tester'] as AgentRole[]).map((r) => {
            const name = AGENT_NAMES[r]
            const isActive = selectedRole === r
            return (
              <button
                key={r}
                type="button"
                onClick={() => onSelectRole(r)}
                className={cx(
                  'relative flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all',
                  isActive
                    ? 'bg-[#182238] text-white shadow-sm ring-1 ring-white/15'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/5',
                )}
              >
                <AgentRainbowBadge size={14} className={isActive ? 'opacity-100' : 'opacity-70'} />
                <span>{name}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-500 rounded-full" />
                )}
              </button>
            )
          })}

          <button
            key="clara"
            type="button"
            className="flex items-center gap-1.5 px-3 py-1 rounded-md font-medium text-white/60 hover:text-white/90 hover:bg-white/5 transition-all"
          >
            <AgentRainbowBadge size={14} className="opacity-70" />
            <span>Clara</span>
          </button>

          <button
            type="button"
            onClick={onAddAgent}
            className="flex items-center gap-1 px-2.5 py-1 text-white/50 hover:text-white transition-colors"
          >
            <Plus size={13} />
            <span>Add Agent</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onStartFromScratch}
            className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
          >
            <RotateCcw size={12} />
            <span>Start from scratch</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
          >
            <Settings size={12} />
            <span>Settings</span>
          </button>

          <button type="button" className="text-white/40 hover:text-white transition-colors">
            <PanelRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

