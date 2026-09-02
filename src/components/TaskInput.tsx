import { useState } from 'react'
import { Send, Upload } from 'lucide-react'

interface TaskInputProps {
  onSubmit: (task: string) => void
  disabled: boolean
  multiMode: boolean
}

export default function TaskInput({ onSubmit, disabled, multiMode }: TaskInputProps) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex items-center gap-3 h-14 px-4 border-t border-border flex-shrink-0 bg-white">
      {/* Input */}
      <div className="flex-1 relative">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Task is running…' : 'Describe a task (e.g. "write a REST API with tests")'}
          disabled={disabled}
          className="w-full h-10 pl-4 pr-24 rounded-xl bg-search-bg text-[14px] text-text-primary placeholder:text-text-secondary/60 outline-none focus:ring-1 focus:ring-primary/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: 'var(--font-body)' }}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Upload plan */}
          <button
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-hover-bg text-text-secondary transition-colors duration-150 cursor-pointer disabled:opacity-30"
            title="Load manual plan (JSON/YAML)"
            disabled={disabled}
          >
            <Upload size={15} />
          </button>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white transition-all duration-150 cursor-pointer hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Run task"
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* Mode indicator */}
      <span className="text-[11px] text-text-secondary flex-shrink-0" style={{ fontFamily: 'var(--font-ui)' }}>
        {multiMode ? 'planner → workers' : 'single agent'}
      </span>
    </div>
  )
}
