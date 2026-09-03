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
    <div className="p-4 border-t flex-shrink-0" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
      <div className="card">
        {/* Card header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-1)' }}>New Task</span>
          <button className="cursor-pointer" style={{ color: 'var(--color-text-3)' }}>
            <ChevronDown size={15} />
          </button>
        </div>

        {/* Input prompt */}
        <div className="mb-3">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            placeholder={disabled ? 'Execution in progress…' : 'Instruct the agents (e.g. "Add validation to factorial.py")'}
            disabled={disabled}
            className="input-field w-full"
          />
        </div>

        {/* Attachment chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map((file) => (
              <span key={file} className="chip text-[12px]">
                <FileText size={13} style={{ color: 'var(--color-text-3)' }} />
                <span>{file}</span>
                <button onClick={() => removeAttachment(file)} className="cursor-pointer" style={{ color: 'var(--color-text-3)' }}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Toggles & Action bar */}
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchEnabled(!searchEnabled)}
              className={`chip text-[12px] cursor-pointer transition-colors ${searchEnabled ? 'border-accent text-accent font-medium' : ''}`}
            >
              <Search size={12} />
              <span>Search</span>
            </button>
            <button
              onClick={() => setDeepResearchEnabled(!deepResearchEnabled)}
              className={`chip text-[12px] cursor-pointer transition-colors ${deepResearchEnabled ? 'border-accent text-accent font-medium' : ''}`}
            >
              <Sparkles size={12} />
              <span>Deep Research</span>
            </button>
            <button
              onClick={() => setReasonEnabled(!reasonEnabled)}
              className={`chip text-[12px] cursor-pointer transition-colors ${reasonEnabled ? 'border-accent text-accent font-medium' : ''}`}
            >
              <BrainCircuit size={12} />
              <span>Reason</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn-ghost text-[12px]">
              <Upload size={12} />
              <span>Plan file</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={disabled || !value.trim()}
              className="btn-primary text-[13px]"
              style={{ opacity: value.trim() && !disabled ? 1 : 0.5 }}
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
