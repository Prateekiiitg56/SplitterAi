import { useState } from 'react'
import {
  ChevronDown,
  Gift,
  Bell,
  HelpCircle,
  Check,
  Cpu,
} from 'lucide-react'
import { AVAILABLE_MODELS } from '../data'

interface TopBarProps {
  workspace?: string
  runStatus?: string
  multiMode?: boolean
  onToggleMulti?: () => void
  subtasks?: any[]
}

export default function TopBar(_props: TopBarProps) {
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0])
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <header className="flex items-center justify-between h-14 px-6 flex-shrink-0 bg-[#121723] border-b border-[#242C42] select-none text-white z-30 relative">
      {/* Left: SplitterAI Brand Header */}
      <div className="flex items-center gap-3">
        <div className="w-7.5 h-7.5 rounded-lg bg-[#192031] border border-[#2B354F] flex items-center justify-center p-1 flex-shrink-0 shadow-2xs">
          <img
            src="/splitterai-logo.png"
            alt="SplitterAI Logo"
            className="w-5.5 h-5.5 object-contain"
          />
        </div>
        <span className="text-[14px] font-bold text-white tracking-wide">
          SplitterAI
        </span>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#6E56CF]/20 text-[#9D8CFC] border border-[#6E56CF]/30 font-semibold">
          Multi-Agent v0.1
        </span>
      </div>

      {/* Right: Active Real Model Selector + Action Icons + Profile */}
      <div className="flex items-center gap-3">
        
        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#192031] border border-[#2B354F] text-[13px] font-semibold text-white hover:border-[#3D4A6E] transition-colors cursor-pointer shadow-2xs"
          >
            <Cpu size={14} className="text-[#9D8CFC]" />
            <span>{selectedModel.label}</span>
            <ChevronDown size={13} className="text-[#677294]" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-[320px] rounded-xl bg-[#141824] border border-[#2B354F] shadow-2xl p-1.5 space-y-1 z-50">
              <div className="px-3 py-1.5 text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#677294]">
                ACTIVE USER MODELS (.ENV)
              </div>
              {AVAILABLE_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedModel(m)
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                    selectedModel.id === m.id
                      ? 'bg-[#2B2358] text-white border border-[#48398C]'
                      : 'hover:bg-[#192031] text-[#9FA8C4] hover:text-white'
                  }`}
                >
                  <div>
                    <p className="text-[13px] font-semibold leading-tight">{m.label}</p>
                    <p className="text-[10.5px] font-mono text-[#677294] mt-0.5">{m.provider} · {m.id}</p>
                  </div>
                  {selectedModel.id === m.id && (
                    <Check size={14} className="text-[#9D8CFC] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action icons */}
        <button className="p-2 rounded-lg text-[#677294] hover:text-white hover:bg-[#192031] transition-colors cursor-pointer" title="Perks & Rewards">
          <Gift size={16} />
        </button>

        <button className="p-2 rounded-lg text-[#677294] hover:text-white hover:bg-[#192031] transition-colors cursor-pointer" title="Notifications">
          <Bell size={16} />
        </button>

        <button className="p-2 rounded-lg text-[#677294] hover:text-white hover:bg-[#192031] transition-colors cursor-pointer" title="Documentation">
          <HelpCircle size={16} />
        </button>

        {/* User avatar */}
        <div className="relative cursor-pointer ml-1">
          <div className="w-7.5 h-7.5 rounded-full bg-[#30A46C] text-white font-bold text-[12.5px] flex items-center justify-center">
            V
          </div>
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#30A46C] ring-2 ring-[#121723]" />
        </div>
      </div>
    </header>
  )
}
