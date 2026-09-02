import { useState } from 'react'
import { X, Minus, Maximize2, Send, Paperclip, MoreVertical } from 'lucide-react'

interface ComposeModalProps {
  minimized: boolean
  onMinimize: () => void
  onClose: () => void
}

export default function ComposeModal({ minimized, onMinimize, onClose }: ComposeModalProps) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  if (minimized) {
    return (
      <div
        className="fixed bottom-0 right-6 w-[280px] h-10 bg-text-primary rounded-t-lg flex items-center px-4 cursor-pointer compose-shadow z-50"
        onClick={onMinimize}
      >
        <span
          className="text-[14px] text-white truncate flex-1"
          style={{ fontFamily: 'var(--font-google-sans)', fontWeight: 500 }}
        >
          {subject || 'New Message'}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMinimize()
          }}
          className="text-white/70 hover:text-white ml-2 cursor-pointer"
        >
          <Maximize2 size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="text-white/70 hover:text-white ml-2 cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 right-6 w-[540px] h-[480px] bg-white rounded-t-xl flex flex-col compose-shadow z-50">
      {/* Title bar */}
      <div className="flex items-center h-10 px-4 bg-text-primary rounded-t-xl flex-shrink-0">
        <span
          className="text-[14px] text-white flex-1 truncate"
          style={{ fontFamily: 'var(--font-google-sans)', fontWeight: 500 }}
        >
          New Message
        </span>
        <button
          onClick={onMinimize}
          className="text-white/70 hover:text-white ml-2 cursor-pointer"
          title="Minimize"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white ml-2 cursor-pointer"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Fields */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center h-10 px-4 border-b border-border">
          <span className="text-[14px] text-text-secondary w-10 flex-shrink-0" style={{ fontFamily: 'var(--font-roboto)' }}>
            To
          </span>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 text-[14px] text-text-primary outline-none bg-transparent"
            style={{ fontFamily: 'var(--font-roboto)' }}
          />
        </div>
        <div className="flex items-center h-10 px-4 border-b border-border">
          <span className="text-[14px] text-text-secondary w-10 flex-shrink-0" style={{ fontFamily: 'var(--font-roboto)' }}>
            Subj
          </span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 text-[14px] text-text-primary outline-none bg-transparent"
            style={{ fontFamily: 'var(--font-roboto)' }}
          />
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="flex-1 p-4 text-[14px] text-text-primary outline-none resize-none bg-transparent"
          style={{ fontFamily: 'var(--font-roboto)' }}
          placeholder="Compose your email..."
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center h-12 px-3 border-t border-border flex-shrink-0">
        <button
          className="flex items-center gap-2 h-9 px-6 rounded-full bg-primary text-white text-[14px] hover:opacity-90 active:scale-[0.97] transition-all duration-150 cursor-pointer"
          style={{ fontFamily: 'var(--font-google-sans)', fontWeight: 500 }}
        >
          <Send size={16} />
          Send
        </button>
        <div className="flex-1" />
        <button
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-hover-bg text-text-secondary transition-colors duration-150 cursor-pointer"
          title="Attach files"
        >
          <Paperclip size={18} />
        </button>
        <button
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-hover-bg text-text-secondary transition-colors duration-150 cursor-pointer"
          title="More options"
        >
          <MoreVertical size={18} />
        </button>
      </div>
    </div>
  )
}
