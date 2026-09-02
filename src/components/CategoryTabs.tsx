import { Inbox, Users, Tag, Bell } from 'lucide-react'
import type { Category } from '../App'

interface CategoryTabsProps {
  active: Category
  onChange: (c: Category) => void
  counts: Record<Category, number>
}

const tabs: { id: Category; label: string; icon: React.ReactNode }[] = [
  { id: 'primary', label: 'Primary', icon: <Inbox size={18} /> },
  { id: 'social', label: 'Social', icon: <Users size={18} /> },
  { id: 'promotions', label: 'Promotions', icon: <Tag size={18} /> },
  { id: 'updates', label: 'Updates', icon: <Bell size={18} /> },
]

export default function CategoryTabs({ active, onChange, counts }: CategoryTabsProps) {
  return (
    <div className="flex items-stretch border-b border-border flex-shrink-0">
      {tabs.map((tab) => {
        const isActive = active === tab.id
        const unreadCount = counts[tab.id]
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 px-6 h-12 transition-colors duration-150 cursor-pointer ${
              isActive
                ? 'text-primary'
                : 'text-text-secondary hover:bg-hover-bg'
            }`}
            style={{ fontFamily: 'var(--font-google-sans)', fontWeight: isActive ? 500 : 400 }}
          >
            <span className={isActive ? 'text-primary' : 'text-text-secondary'}>
              {tab.icon}
            </span>
            <span className="text-[14px]">{tab.label}</span>
            {unreadCount > 0 && (
              <span
                className={`text-[12px] tabular-nums ${
                  isActive ? 'text-primary' : 'text-text-secondary'
                }`}
                style={{ fontWeight: 500 }}
              >
                {unreadCount} new
              </span>
            )}
            {/* Active indicator — underline bar */}
            {isActive && (
              <div className="absolute bottom-0 left-3 right-3 h-[3px] rounded-t-full bg-primary" />
            )}
          </button>
        )
      })}
    </div>
  )
}
