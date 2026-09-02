import { useState, useRef } from 'react'
import { Send, Upload, Search, Sparkles, BrainCircuit } from 'lucide-react'

interface TaskInputProps {
  onSubmit: (task: string) => void
  disabled: boolean
  multiMode: boolean
}

export default function TaskInput({ onSubmit, disabled }: TaskInputProps) {
  const [value, setValue] = useState('')
  const [searchEnabled, setSearchEnabled] = useState(false)
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(false)
  const [reasonEnabled, setReasonEnabled] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setValue('')
  }

  return (
    <div className="p-4 border-t border-slate-200/80 bg-white/80 backdrop-blur-md flex-shrink-0">
      <div className="rounded-xl border border-slate-200 bg-white input-depth overflow-hidden transition-all duration-150 focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/15">
        {/* Main Input Row with Prompt Glyph '>' */}
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-accent font-mono font-bold text-lg select-none leading-none -mt-0.5">
            &gt;
          </span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            placeholder={disabled ? 'Execution in progress…' : 'Instruct the agents (e.g. "Add validation to factorial.py")'}
            disabled={disabled}
            className="flex-1 text-[14px] text-slate-900 outline-none bg-transparent placeholder:text-slate-400 disabled:opacity-50"
          />

          <button
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
              value.trim() && !disabled
                ? 'bg-accent text-white hover:bg-accent-hover shadow-xs active:scale-95'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
            title="Send instruction"
          >
            <Send size={14} />
          </button>
        </div>

        {/* Function Toggles Row */}
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50/50 border-t border-slate-100">
          <button
            onClick={() => setSearchEnabled(!searchEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
              searchEnabled ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Search size={12} />
            <span>Search</span>
          </button>
          <button
            onClick={() => setDeepResearchEnabled(!deepResearchEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
              deepResearchEnabled ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Sparkles size={12} />
            <span>Deep Research</span>
          </button>
          <button
            onClick={() => setReasonEnabled(!reasonEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
              reasonEnabled ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <BrainCircuit size={12} />
            <span>Reason</span>
          </button>

          <div className="flex-1" />

          <button
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Load manual plan JSON/YAML"
          >
            <Upload size={12} />
            <span>Plan file</span>
          </button>
        </div>
      </div>
    </div>
  )
}
