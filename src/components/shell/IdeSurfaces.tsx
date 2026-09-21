import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../../lib/cx'

/**
 * IdeSurfaces — the small surface atoms the converted pages share.
 *
 * These exist because the reference's `.ide-card` / `.ide-progress-*` are not
 * the same object as the app's `Panel` primitive. Panel paints the cool-gray
 * app surface (--panel / --border-soft); these paint the IDE chrome greys
 * (--ide-raised / --ide-border). Adding an `ide` flag to Panel would have
 * leaked a shell concern into the ~16 places Panel is already used, so the two
 * stay separate: Panel for content regions, IdeCard for the IDE-styled pages.
 *
 * Status pills are deliberately absent. `StatusBadge` in components/Badges
 * already renders what the reference's `.ide-badge` shows, and because
 * `.ide-shell` rebinds --accent/--good/--bad it adopts the IDE palette without
 * being touched — so pages reuse that rather than a parallel component.
 */

/* ── Card ──────────────────────────────────────────────────────────── */

interface IdeCardProps {
  children: ReactNode
  /** Adds the hover border-lift the reference gives clickable cards. */
  interactive?: boolean
  className?: string
}

export function IdeCard({ children, interactive = false, className }: IdeCardProps) {
  return (
    <div
      className={cx(
        'rounded-panel bg-[var(--ide-raised)] border border-[var(--ide-border)]',
        interactive &&
          'transition-all duration-150 ease-standard hover:border-[var(--ide-edge-hover)] hover:bg-[var(--ide-raised-2)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ── Progress ──────────────────────────────────────────────────────── */

type ProgressTone = 'accent' | 'good' | 'bad' | 'warn' | 'dim'

const PROGRESS_TONE: Record<ProgressTone, string> = {
  accent: 'bg-[var(--ide-accent)]',
  good: 'bg-[var(--ide-good)]',
  bad: 'bg-[var(--ide-bad)]',
  warn: 'bg-[var(--ide-warn)]',
  dim: 'bg-[var(--ide-muted)]',
}

interface IdeProgressProps {
  /** 0–100. Clamped, so a bad value can't overflow the track. */
  value: number
  tone?: ProgressTone
  /**
   * The width the bar animates *from* on mount. The reference did this by
   * setting width to 0 and bumping it in a double rAF; here the caller passes
   * the already-resolved start width so a reduced-motion render can simply
   * pass the final value and skip the transition entirely.
   */
  from?: number
  className?: string
  /** Accessible description, e.g. "4 of 6 subtasks". */
  label?: string
}

export function IdeProgress({ value, tone = 'accent', from, className, label }: IdeProgressProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const width = from === undefined ? pct : from

  return (
    <div
      className={cx('h-1 rounded-full bg-[var(--ide-track)] overflow-hidden', className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cx(
          'h-full rounded-full',
          PROGRESS_TONE[tone],
          // 700ms cubic-bezier(0.16,1,0.3,1), matching the reference exactly.
          'transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'motion-reduce:transition-none',
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

/* ── Section heading ───────────────────────────────────────────────── */

interface SectionRowProps {
  title: string
  /** Optional "View all →" style link on the right. */
  action?: { label: string; to: string }
  /** Renders an <h2> by default; pages with one heading may want a different level. */
  as?: 'h2' | 'h3'
  className?: string
}

export function SectionRow({ title, action, as: Heading = 'h2', className }: SectionRowProps) {
  return (
    <div className={cx('flex items-center justify-between mb-[10px]', className)}>
      <Heading className="text-[13px] font-semibold text-[var(--ide-text-dim)]">{title}</Heading>
      {action && (
        <Link
          to={action.to}
          className="text-[12px] text-[var(--ide-accent)] rounded-control
                     transition-opacity duration-[var(--d-quick)] hover:opacity-80"
        >
          {action.label} →
        </Link>
      )}
    </div>
  )
}
