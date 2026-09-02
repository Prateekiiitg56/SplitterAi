import { Star, Archive, Trash2, Clock, Paperclip, AlertCircle } from 'lucide-react'
import type { Email } from '../data'
import { labels as labelDefs } from '../data'

interface EmailRowProps {
  email: Email
  selected: boolean
  onToggleSelect: (id: string) => void
  onToggleStar: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}

export default function EmailRow({
  email,
  selected,
  onToggleSelect,
  onToggleStar,
  onArchive,
  onDelete,
}: EmailRowProps) {
  const fontWeight = email.read ? 400 : 500

  return (
    <div
      className={`group flex items-center h-10 px-4 border-b border-border transition-colors duration-100 cursor-pointer ${
        selected ? 'bg-selected-bg/40' : 'hover:bg-hover-bg'
      }`}
    >
      {/* Checkbox */}
      <div className="flex items-center flex-shrink-0 w-8">
        <input
          type="checkbox"
          className="mail-checkbox"
          checked={selected}
          onChange={() => onToggleSelect(email.id)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Star */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleStar(email.id)
        }}
        className="flex items-center justify-center w-8 h-8 flex-shrink-0 cursor-pointer"
      >
        <Star
          size={18}
          className={`transition-colors duration-150 ${
            email.starred
              ? 'fill-star-yellow text-star-yellow'
              : 'text-text-secondary hover:text-star-yellow'
          }`}
        />
      </button>

      {/* Urgent indicator */}
      <div className="w-5 flex-shrink-0 flex items-center justify-center">
        {email.urgent && <AlertCircle size={14} className="text-urgent-red" />}
      </div>

      {/* Sender */}
      <div
        className="w-[200px] flex-shrink-0 truncate text-[14px] pr-4"
        style={{ fontWeight, fontFamily: 'var(--font-roboto)' }}
      >
        {email.sender}
      </div>

      {/* Subject + preview + labels */}
      <div className="flex-1 flex items-center gap-2 min-w-0 pr-4 overflow-hidden">
        {/* Labels */}
        {email.labels?.map((lid) => {
          const def = labelDefs.find((l) => l.id === lid)
          if (!def) return null
          return (
            <span
              key={lid}
              className="flex-shrink-0 px-1.5 py-px rounded text-[11px]"
              style={{
                backgroundColor: def.color + '18',
                color: def.color,
                fontFamily: 'var(--font-google-sans)',
                fontWeight: 500,
              }}
            >
              {def.label}
            </span>
          )
        })}

        <span
          className="truncate text-[14px]"
          style={{ fontWeight, fontFamily: 'var(--font-roboto)' }}
        >
          {email.subject}
        </span>
        <span className="text-[14px] text-text-secondary truncate" style={{ fontWeight: 400 }}>
          — {email.preview}
        </span>
      </div>

      {/* Right side: hover actions OR date + attachment */}
      <div className="flex items-center gap-1 flex-shrink-0 relative">
        {/* Date + attachment (visible by default, hidden on hover) */}
        <div className="flex items-center gap-2 group-hover:opacity-0 transition-opacity duration-150">
          {email.hasAttachment && (
            <Paperclip size={15} className="text-text-secondary" />
          )}
          <span
            className="text-[12px] text-text-secondary whitespace-nowrap tabular-nums"
            style={{ fontWeight: email.read ? 400 : 500, fontFamily: 'var(--font-roboto)' }}
          >
            {email.date}
          </span>
        </div>

        {/* Hover action icons (hidden by default, shown on hover) */}
        <div className="absolute right-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onArchive(email.id)
            }}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/80 text-text-secondary transition-colors duration-100 cursor-pointer"
            title="Archive"
          >
            <Archive size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(email.id)
            }}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/80 text-text-secondary transition-colors duration-100 cursor-pointer"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
          <button
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/80 text-text-secondary transition-colors duration-100 cursor-pointer"
            title="Snooze"
          >
            <Clock size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
