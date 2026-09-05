import type { ReactNode } from 'react'
import { cx } from '../lib/cx'

/**
 * PageHeader — the one page-level scrim.
 *
 * Replaces the five hand-built 48px bars scattered across the routes, each
 * with a different height, padding, and pair of hex valuess. One height,
 * one padding, token colours only.
 *
 * Hierarchy stays quiet: the title is sentence case at the "title" size,
 * the meta is mono and de-emphasised, and the accent never appears except
 * where the content is genuinely interactive.
 */

interface PageHeaderProps {
  /** The page's name or the thing it is about. */
  title: ReactNode
  /** Mono meta string — counts, ids, paths. */
  meta?: ReactNode
  /** Right-aligned controls. */
  actions?: ReactNode
  icon?: ReactNode
  className?: string
}

export function PageHeader({ title, meta, actions, icon, className }: PageHeaderProps) {
  return (
    <header
      className={cx(
        'flex items-center gap-3 h-12 px-5 flex-shrink-0',
        'bg-[var(--bg)] border-b border-[var(--border-soft)]',
        className,
      )}
    >
      {icon ? (
        <span className="text-[var(--accent)] flex-shrink-0 inline-flex" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div className="flex items-baseline gap-2.5 min-w-0">
        <h1 className="text-title font-semibold text-[var(--text)] tracking-tight truncate">
          {title}
        </h1>
        {meta ? (
          <span className="font-mono text-micro text-[var(--faint)] whitespace-nowrap tabular-nums">
            {meta}
          </span>
        ) : null}
      </div>
      {actions ? <div className="ml-auto flex items-center gap-2 flex-shrink-0">{actions}</div> : null}
    </header>
  )
}
