import { useState, useRef } from 'react'
import { Send, Upload, Search, Sparkles, BrainCircuit, X, FileText, ChevronDown, Play } from 'lucide-react'

interface TaskInputProps {
  onSubmit: (task: string) => void
  disabled: boolean
  multiMode: boolean
}

export default function TaskInput({ onSubmit, disabled }: TaskInputProps) {
  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<string[]>(['project_spec.md'])
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

  const removeAttachment = (name: string) => {
    setAttachments((prev) => prev.filter((a) => a !== name))
  }

  return (
    <div className="p-4 border-t border-white/[0.08] flex-shrink-0 bg-[#0B0C10]">
      <div className="rounded-2xl border border-white/[0.08] bg-[#141824] p-4 shadow-md space-y-3">
        {/* Card header */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold text-white tracking-tight">New Agent Task Instruction</span>
          <button className="cursor-pointer text-neutral-500 hover:text-white transition-colors">
            <ChevronDown size={15} />
          </button>
        </div>

        {/* Input prompt */}
        <div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            placeholder={disabled ? 'Execution in progress…' : 'Instruct the agents (e.g. "Add validation to factorial.py")'}
            disabled={disabled}
            className="w-full p-3 rounded-xl bg-[#101218] border border-white/10 text-[13.5px] text-white placeholder:text-neutral-500 outline-none focus:border-[#6E56CF] transition-colors"
          />
        </div>

        {/* Attachment chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((file) => (
              <span key={file} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#101218] border border-white/10 text-[12px] font-mono text-neutral-300">
                <FileText size={13} className="text-neutral-400" />
                <span>{file}</span>
                <button onClick={() => removeAttachment(file)} className="cursor-pointer text-neutral-500 hover:text-white ml-1">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Toggles & Action bar */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchEnabled(!searchEnabled)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors cursor-pointer ${
                searchEnabled
                  ? 'border-[#6E56CF] bg-[#6E56CF]/20 text-[#9D8CFC]'
                  : 'border-white/10 bg-[#101218] text-neutral-400 hover:text-white'
              }`}
            >
              <Search size={12} />
              <span>Search</span>
            </button>
            <button
              onClick={() => setDeepResearchEnabled(!deepResearchEnabled)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors cursor-pointer ${
                deepResearchEnabled
                  ? 'border-[#6E56CF] bg-[#6E56CF]/20 text-[#9D8CFC]'
                  : 'border-white/10 bg-[#101218] text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles size={12} />
              <span>Deep Research</span>
            </button>
            <button
              onClick={() => setReasonEnabled(!reasonEnabled)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors cursor-pointer ${
                reasonEnabled
                  ? 'border-[#6E56CF] bg-[#6E56CF]/20 text-[#9D8CFC]'
                  : 'border-white/10 bg-[#101218] text-neutral-400 hover:text-white'
              }`}
            >
              <BrainCircuit size={12} />
              <span>Reason</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-3.5 py-1.5 rounded-xl border border-white/10 text-[12.5px] font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer">
              <Upload size={13} className="inline mr-1.5" />
              <span>Plan file</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={disabled || !value.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[13px] font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-40"
            >
              <Play size={13} />
              <span>Run Task</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
