import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { cx } from '../../lib/cx'
import { ACTIVITY_ITEMS, isActivityItemActive } from './shellNav'

/**
 * ActivityBar — the 48px icon rail on the far left.
 *
 * Replaces the old Sidebar's nav list. Every route the old sidebar reached is
 * still reachable here, plus the new /home route: Home, Console, Projects,
 * Agents, Workflow, Integrations. The old sidebar's icons referenced an SVG
 * sprite (`<use href="#i-home">`) whose <symbol> definitions were never
 * actually mounted anywhere in the app, so those glyphs rendered blank; these
 * are real lucide icons.
 *
 * The active entry gets the 2px accent bar on its left edge — one of the five
 * places in this design where the blue is allowed to appear.
 */

interface ActivityBarProps {
  pathname: string
  /** Opens the existing DownloadAppModal, which previously had no trigger. */
  onOpenDownload: () => void
}

export function ActivityBar({ pathname, onOpenDownload }: ActivityBarProps) {
  return (
    <nav
      className="w-12 flex-shrink-0 flex flex-col items-center py-2.5 bg-[var(--ide-deep)] select-none"
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
                  'relative w-12 h-10 flex items-center justify-center',
                  'transition-colors duration-[var(--d-quick)]',
                  active
                    ? 'text-[var(--ide-text-hi)]'
                    : 'text-[var(--ide-text-faint)] hover:text-[var(--ide-text)]',
                )}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-sm bg-[var(--ide-accent)]"
                  />
                )}
                <Icon size={21} />
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="flex-1" aria-hidden="true" />

      <div className="flex flex-col items-center gap-0.5">
        <button
          type="button"
          onClick={onOpenDownload}
          aria-label="Download desktop app"
          title="Download desktop app"
          className="w-12 h-10 flex items-center justify-center text-[var(--ide-text-faint)]
                     hover:text-[var(--ide-text)] transition-colors duration-[var(--d-quick)]"
        >
          <Download size={21} />
        </button>
        <div
          role="img"
          aria-label="Signed in as Prateek Singh"
          title="Prateek Singh · prateek@workspace.dev"
          className="w-6 h-6 mt-1 rounded-full flex items-center justify-center
                     bg-[var(--ide-accent)] text-[var(--ide-accent-ink)] text-[10px] font-bold"
        >
          PS
        </div>
      </div>
    </nav>
  )
}
