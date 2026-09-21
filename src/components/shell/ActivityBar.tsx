import { Link } from 'react-router-dom'
import { DownloadSimple } from '@phosphor-icons/react'
import { cx } from '../../lib/cx'
import { ACTIVITY_ITEMS, isActivityItemActive } from './shellNav'

/**
 * ActivityBar — the 48px icon rail on the far left.
 *
 * Uses Phosphor icons with dynamic weight (fill on active, regular on default)
 * for a hand-crafted, studio-grade appearance.
 */

interface ActivityBarProps {
  pathname: string
  /** Opens the existing DownloadAppModal, which previously had no trigger. */
  onOpenDownload: () => void
}

export function ActivityBar({ pathname, onOpenDownload }: ActivityBarProps) {
  return (
    <nav
      className="w-12 flex-shrink-0 flex flex-col items-center py-2.5 bg-[var(--ide-deep)] select-none border-r border-[var(--ide-border-soft)]"
      aria-label="Primary navigation"
    >
      <ul className="flex flex-col items-center gap-0.5 list-none">
        {ACTIVITY_ITEMS.map((item) => {
          const active = isActivityItemActive(item, pathname)
          const Icon = item.icon
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-label={item.label}
                title={item.label}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'relative w-10 h-10 rounded-md flex items-center justify-center',
                  'transition-all duration-[var(--d-quick)]',
                  active
                    ? 'text-[var(--ide-accent)] bg-[var(--ide-accent-quiet)]'
                    : 'text-[var(--ide-text-dim)] hover:text-[var(--ide-text)] hover:bg-[var(--ide-hover)]',
                )}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute -left-[5px] top-2 bottom-2 w-0.5 rounded-r-sm bg-[var(--ide-accent)] shadow-[0_0_8px_var(--ide-accent)]"
                  />
                )}
                <Icon size={20} weight={active ? 'fill' : 'regular'} />
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="flex-1" aria-hidden="true" />

      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenDownload}
          aria-label="Download desktop app"
          title="Download desktop app"
          className="w-10 h-10 rounded-md flex items-center justify-center text-[var(--ide-text-dim)]
                     hover:text-[var(--ide-text)] hover:bg-[var(--ide-hover)] transition-colors duration-[var(--d-quick)]"
        >
          <DownloadSimple size={20} />
        </button>
        <div
          role="img"
          aria-label="Signed in as Prateek Singh"
          title="Prateek Singh · prateek@workspace.dev"
          className="w-7 h-7 mt-0.5 rounded-full flex items-center justify-center
                     bg-[var(--ide-accent)] text-white text-[10px] font-bold shadow-[0_0_12px_rgba(124,92,252,0.3)] cursor-pointer"
        >
          PS
        </div>
      </div>
    </nav>
  )
}
