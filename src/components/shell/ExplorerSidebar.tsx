import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cx } from '../../lib/cx'
import { StatusDot } from '../Badges'

/**
 * ExplorerSidebar — the VS Code-style tree rail, and the two pieces that fill
 * it.
 *
 * The container is generic on purpose: what goes inside is contextual per page
 * (see ShellExplorer), and every page feeds it the same real data its content
 * area already renders. Nothing in here holds page data itself.
 *
 * The reference's vanilla-JS section collapse becomes React state on
 * ExplorerSection; the chevron rotation and aria-expanded both read from it.
 */

interface ExplorerSidebarProps {
  collapsed: boolean
  onToggle: () => void
  /** Head label — uppercased by CSS, so pass it in sentence case. */
  title?: string
  children: ReactNode
}

export function ExplorerSidebar({
  collapsed,
  onToggle,
  title = 'Explorer',
  children,
}: ExplorerSidebarProps) {
  return (
    <aside
      aria-label="Explorer"
      className={cx(
        'flex-shrink-0 flex flex-col overflow-hidden bg-[var(--ide-deep)]',
        'transition-[width] duration-[var(--d-base)] ease-standard',
        collapsed ? 'w-0 border-r-0' : 'w-[260px] border-r border-[var(--ide-border)]',
      )}
    >
      {!collapsed && (
        <>
          <div className="h-9 flex-shrink-0 flex items-center justify-between pl-3.5 pr-2">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[var(--ide-text-dim)]">
              {title}
            </span>
            <button
              type="button"
              onClick={onToggle}
              aria-label="Collapse explorer"
              title="Collapse explorer"
              className="w-5 h-5 inline-flex items-center justify-center rounded-control
                         text-[var(--ide-text-faint)] transition-colors duration-[var(--d-quick)]
                         hover:bg-[var(--ide-raised)] hover:text-[var(--ide-text)]"
            >
              <ChevronRight size={13} className="rotate-180" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pt-1 pb-3">{children}</div>
        </>
      )}
    </aside>
  )
}

/* ────────────────────────────────────────────────────────────────────── */

interface ExplorerSectionProps {
  label: string
  /** Mono count shown at the right of the header. */
  count?: number
  defaultOpen?: boolean
  children: ReactNode
}

export function ExplorerSection({
  label,
  count,
  defaultOpen = true,
  children,
}: ExplorerSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full h-6 flex items-center gap-[5px] pl-3 pr-2 text-left
                   text-[11px] font-semibold text-[var(--ide-text-dim)]
                   transition-colors duration-[var(--d-quick)] hover:text-[var(--ide-text)]"
      >
        <ChevronRight
          size={12}
          aria-hidden="true"
          className={cx(
            'flex-shrink-0 transition-transform duration-[var(--d-quick)]',
            open && 'rotate-90',
          )}
        />
        <span className="truncate">{label}</span>
        {typeof count === 'number' && (
          <span className="ml-auto font-mono font-normal text-[var(--ide-text-faint)]">{count}</span>
        )}
      </button>
      {open && <div>{children}</div>}
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────── */

interface ExplorerRowProps {
  /** Renders a router Link when set, otherwise a button. */
  to?: string
  onClick?: () => void
  icon?: ReactNode
  label: string
  /** Feeds the shared StatusDot, so the tree speaks the app's status language. */
  status?: string
  active?: boolean
  /** Anything rendered at the far right instead of a status dot. */
  trailing?: ReactNode
  title?: string
}

export function ExplorerRow({
  to,
  onClick,
  icon,
  label,
  status,
  active = false,
  trailing,
  title,
}: ExplorerRowProps) {
  const className = cx(
    'w-full flex items-center gap-[7px] h-[26px] pl-[30px] pr-2.5 text-left',
    'text-[12.5px] whitespace-nowrap border-l-2',
    'transition-colors duration-[var(--d-quick)]',
    active
      ? 'bg-[var(--ide-accent-quiet)] border-l-[var(--ide-accent)] text-[var(--ide-text-hi)]'
      : 'border-l-transparent text-[var(--ide-text)] hover:bg-[var(--ide-hover)]',
  )

  const inner = (
    <>
      {icon && (
        <span className="flex-shrink-0 inline-flex text-[var(--ide-text-faint)]" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="flex-1 overflow-hidden text-ellipsis">{label}</span>
      {trailing}
      {!trailing && status && <StatusDot status={status} />}
    </>
  )

  if (to) {
    return (
      <Link
        to={to}
        className={className}
        title={title ?? label}
        aria-current={active ? 'page' : undefined}
      >
        {inner}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className} title={title ?? label}>
      {inner}
    </button>
  )
}
