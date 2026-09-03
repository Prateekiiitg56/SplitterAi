import { useState } from 'react'
import {
  ChevronDown,
  Search,
  Gift,
  Bell,
  HelpCircle,
} from 'lucide-react'

interface TopBarProps {
  workspace?: string
  runStatus?: string
  multiMode?: boolean
  onToggleMulti?: () => void
  subtasks?: any[]
}

export default function TopBar(_props: TopBarProps) {
  const [searchValue, setSearchValue] = useState('')

  return (
    <header className="flex items-center justify-between h-14 px-6 flex-shrink-0 bg-[#121723] border-b border-[#242C42] select-none text-white">
      {/* Left: Workspace dropdown */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-[#6E56CF] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
          VE
        </div>
        <span className="text-[13px] font-semibold text-white">
          Vlad's Workspace
        </span>
        <ChevronDown size={14} className="text-[#677294]" />
      </div>

      {/* Center: Search input box with ⌘K badge */}
      <div className="flex-1 max-w-[420px] mx-6">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#192031] border border-[#2B354F] focus-within:border-[#6E56CF] transition-colors">
          <Search size={14} className="text-[#677294]" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search anything..."
            className="flex-1 bg-transparent text-[13px] text-white placeholder:text-[#677294] outline-none"
          />
          <span className="px-1.5 py-0.5 rounded bg-[#232C42] text-[10.5px] font-mono text-[#677294] border border-[#2D3754]">
            ⌘K
          </span>
        </div>
      </div>

      {/* Right: Model Selector + Action Icons + Profile Dot */}
      <div className="flex items-center gap-3">
        {/* Model Dropdown */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#192031] border border-[#2B354F] text-[12.5px] font-medium text-white hover:border-[#3D4A6E] transition-colors cursor-pointer">
          <span>GPT-5.5</span>
          <ChevronDown size={13} className="text-[#677294]" />
        </button>

        {/* Gift icon */}
        <button className="p-1.5 rounded-lg text-[#677294] hover:text-white hover:bg-[#192031] transition-colors cursor-pointer">
          <Gift size={16} />
        </button>

        {/* Bell icon */}
        <button className="p-1.5 rounded-lg text-[#677294] hover:text-white hover:bg-[#192031] transition-colors cursor-pointer">
          <Bell size={16} />
        </button>

        {/* Help icon */}
        <button className="p-1.5 rounded-lg text-[#677294] hover:text-white hover:bg-[#192031] transition-colors cursor-pointer">
          <HelpCircle size={16} />
        </button>

        {/* User avatar with green presence dot */}
        <div className="relative cursor-pointer ml-1">
          <div className="w-7 h-7 rounded-full bg-[#30A46C] text-white font-bold text-[12px] flex items-center justify-center">
            V
          </div>
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#30A46C] ring-2 ring-[#121723]" />
        </div>
      </div>
    </header>
  )
}
