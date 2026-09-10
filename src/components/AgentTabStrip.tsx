import { Plus, RotateCcw } from 'lucide-react'
import { ROLE_META } from '../data'
import { cx } from '../lib/cx'
import type { AgentRole } from '../types'

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
  return (
    <div className="flex flex-shrink-0 select-none bg-black/40 backdrop-blur-md z-10">
      <div className="ml-4 flex min-h-12 w-[calc(100%-1rem)] items-center justify-between gap-4 border-b border-white/10 px-4 sm:px-6 lg:justify-end lg:px-8 text-xs">
        {/* Left: Tabs */}
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          {/* Active / Available Agent Tabs */}
          {sessionAgents.map((r) => {
            const name = ROLE_META[r].label
            const isActive = selectedRole === r
            return (
              <button
                key={r}
                type="button"
                onClick={() => onSelectRole(r)}
                className={cx(
                  'relative flex h-8 items-center gap-2 rounded-md px-3 font-medium transition-all',
                  isActive
                    ? 'bg-[#182238] text-white shadow-sm ring-1 ring-white/15'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/5',
                )}
              >
                <span>{name}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-500 rounded-full" />
                )}
              </button>
            )
          })}

          <button
            type="button"
            onClick={onAddAgent}
            className="ml-2 flex h-8 items-center gap-2 px-3 text-white/50 hover:text-white transition-colors"
          >
            <Plus size={13} />
            <span className="whitespace-nowrap">Add Agent</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={onStartFromScratch}
            className="flex h-8 items-center gap-2 px-3 text-white/60 hover:text-white transition-colors"
          >
            <RotateCcw size={12} />
            <span>Start from scratch</span>
          </button>
        </div>
      </div>
    </div>
  )
}
