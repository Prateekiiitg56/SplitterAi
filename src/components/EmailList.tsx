import EmailRow from './EmailRow'
import type { Email } from '../data'
import { Inbox } from 'lucide-react'

interface EmailListProps {
  emails: Email[]
  selectedEmails: Set<string>
  onToggleSelect: (id: string) => void
  onToggleStar: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}

export default function EmailList({
  emails,
  selectedEmails,
  onToggleSelect,
  onToggleStar,
  onArchive,
  onDelete,
}: EmailListProps) {
  if (emails.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-secondary gap-3">
        <Inbox size={48} strokeWidth={1} className="opacity-40" />
        <p
          className="text-[16px]"
          style={{ fontFamily: 'var(--font-google-sans)', fontWeight: 400 }}
        >
          Nothing here yet
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {emails.map((email) => (
        <EmailRow
          key={email.id}
          email={email}
          selected={selectedEmails.has(email.id)}
          onToggleSelect={onToggleSelect}
          onToggleStar={onToggleStar}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
