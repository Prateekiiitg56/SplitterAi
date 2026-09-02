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

  return (
    <div className="flex items-center gap-2 h-12 px-4 border-t border-slate-200/80 flex-shrink-0 bg-white/70 backdrop-blur-md">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
        placeholder={disabled ? 'Running…' : 'Describe a task…'}
        disabled={disabled}
        className="flex-1 h-8 px-3 rounded-lg bg-search-bg text-[13px] text-text-primary placeholder:text-text-secondary/50 outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-40"
        style={{ fontFamily: 'var(--font-body)' }}
      />
      <button
        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover-bg text-text-secondary cursor-pointer disabled:opacity-30"
        title="Load plan file"
        disabled={disabled}
      >
        <Upload size={14} />
      </button>
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="w-7 h-7 flex items-center justify-center rounded-md bg-primary text-white cursor-pointer hover:opacity-90 active:scale-95 disabled:opacity-30"
        title="Run"
      >
        <Send size={14} />
      </button>
    </div>
  )
}
