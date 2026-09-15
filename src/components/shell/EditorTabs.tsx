import { X, ChevronRight } from 'lucide-react'
import { cx } from '../../lib/cx'
import { getShellChrome } from './shellNav'

/**
 * EditorTabs — the 36px tab strip, and the breadcrumb under it.
 *
 * The reference's tab strip is static markup with vanilla-JS switching; here it
 * is backed by real state in AppShell. Every route you visit opens a tab,
 * clicking one navigates to it, and closing one falls back to the neighbouring
 * tab. Labels and icons come from getShellChrome(), so a tab can never disagree
 * with the route it points at.
 *
 * A tab is a wrapper holding two sibling buttons rather than a button
 * containing a button — nesting them would be invalid markup and would break
 * keyboard access to the closer.
 */

interface EditorTabsProps {
  /** Open tabs, as pathnames. */
  tabs: string[]
  activePath: string
  onSelect: (path: string) => void
  onClose: (path: string) => void
}

export function EditorTabs({ tabs, activePath, onSelect, onClose }: EditorTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Open views"
      className="h-9 flex-shrink-0 flex items-stretch overflow-x-auto
                 bg-[var(--ide-deep)] border-b border-[var(--ide-border)]"
    >
      {tabs.map((path) => {
        const { label, icon: Icon } = getShellChrome(path)
        const active = path === activePath
        return (
          <div
            key={path}
            className={cx(
              'relative flex items-center flex-shrink-0 h-full',
              'border-r border-[var(--ide-border)] text-[12.5px]',
              'transition-colors duration-[var(--d-quick)]',
              active
                ? 'bg-[var(--ide-editor)] text-[var(--ide-text-hi)]'
                : 'bg-[var(--ide-deep)] text-[var(--ide-text-dim)] hover:text-[var(--ide-text)]',
            )}
          >
            {active && (
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 top-0 h-[1.5px] bg-[var(--ide-accent)]"
              />
            )}
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(path)}
              title={path}
              className="flex items-center gap-[7px] h-full pl-3.5 pr-1.5 max-w-[220px]"
            >
              <Icon
                size={13}
                className={cx('flex-shrink-0', active && 'text-[var(--ide-accent)]')}
              />
              <span className="truncate">{label}</span>
            </button>
            <button
              type="button"
              onClick={() => onClose(path)}
              aria-label={`Close ${label}`}
              title={`Close ${label}`}
              className="w-4 h-4 mr-2.5 inline-flex items-center justify-center rounded-control
                         flex-shrink-0 text-[var(--ide-text-faint)]
                         transition-colors duration-[var(--d-quick)]
                         hover:bg-[var(--ide-raised-2)] hover:text-[var(--ide-text)]"
            >
              <X size={11} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────── */

export function Breadcrumb({ crumbs }: { crumbs: string[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="h-[26px] flex-shrink-0 flex items-center gap-1.5 px-4 overflow-hidden
                 text-[11.5px] text-[var(--ide-text-faint)]
                 border-b border-[var(--ide-border-soft)]"
    >
      {crumbs.map((crumb, i) => (
        <span key={`${crumb}-${i}`} className="flex items-center gap-1.5 min-w-0">
          {i > 0 && (
            <ChevronRight
              size={11}
              className="flex-shrink-0 text-[var(--ide-muted)]"
              aria-hidden="true"
            />
          )}
          <span
            className={cx('truncate', i === crumbs.length - 1 && 'text-[var(--ide-text-dim)]')}
            aria-current={i === crumbs.length - 1 ? 'page' : undefined}
          >
            {crumb}
          </span>
        </span>
      ))}
    </nav>
  )
}
