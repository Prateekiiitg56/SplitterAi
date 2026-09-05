import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

/**
 * Panel — the app's single raised surface.
 *
 * This replaces roughly sixteen hand-rolled copies of
 * `border border-[var(--border-soft)] rounded-[var(--radius)] bg-[var(--panel)]`
 * plus eight legacy `rounded-2xl border-white/[0.08]` glass cards that
 * belonged to an older visual system.
 */

interface PanelProps {
  children: ReactNode
  /** flush removes the radius+border, for panels that fill a region. */
  flush?: boolean
  /** inset uses the darker well colour — for logs, code, terminal output. */
  inset?: boolean
  className?: string
}

export function Panel({ children, flush = false, inset = false, className }: PanelProps) {
  return (
    <div
      className={cx(
        'flex flex-col min-h-0 min-w-0',
        inset ? 'bg-[var(--bg-inset)]' : 'bg-[var(--panel)]',
        !flush && 'border border-[var(--border-soft)] rounded-panel',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface PanelHeaderProps {
  /**
   * Sentence case. Not ALL CAPS — tracked-out caps labels above every
   * region were the loudest generated-template tell in the original, and
   * they also read worse at 10px than sentence case does at 12px.
   */
  title: ReactNode
  /** Rendered in mono after the title. For counts, ids, paths. */
  meta?: ReactNode
  /** Right-aligned controls. */
  actions?: ReactNode
  icon?: ReactNode
  className?: string
}

export function PanelHeader({ title, meta, actions, icon, className }: PanelHeaderProps) {
  return (
    <div
      className={cx(
        'flex items-center gap-2.5 h-9 px-3 flex-shrink-0',
        'border-b border-[var(--border-soft)]',
        className,
      )}
    >
      {icon ? <span className="text-[var(--faint)] flex-shrink-0">{icon}</span> : null}
      <h2 className="text-meta font-medium text-[var(--text-2)] truncate">{title}</h2>
      {meta ? (
        <span className="font-mono text-micro text-[var(--faint)] flex-shrink-0 tabular-nums">
          {meta}
        </span>
      ) : null}
      {actions ? <div className="ml-auto flex items-center gap-1 flex-shrink-0">{actions}</div> : null}
    </div>
  )
}

export function PanelBody({
  children,
  scroll = true,
  className,
}: {
  children: ReactNode
  scroll?: boolean
  className?: string
}) {
  return (
    <div className={cx('flex-1 min-h-0 min-w-0', scroll && 'overflow-y-auto', className)}>
      {children}
    </div>
  )
}

/**
 * SectionLabel — for structure inside a page rather than inside a panel.
 *
 * The trailing hairline is doing work, not decorating: it shows how far
 * the section's scope extends. Per the design system, structural devices
 * encode information about the content or they come out.
 */
export function SectionLabel({
  children,
  meta,
  actions,
  className,
}: {
  children: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex items-center gap-3 min-w-0', className)}>
      <h2 className="text-meta font-medium text-[var(--text-2)] flex-shrink-0">{children}</h2>
      {meta ? (
        <span className="font-mono text-micro text-[var(--faint)] flex-shrink-0 tabular-nums">
          {meta}
        </span>
      ) : null}
      <span aria-hidden="true" className="flex-1 h-px bg-[var(--border-soft)] min-w-4" />
      {actions ? <div className="flex items-center gap-1.5 flex-shrink-0">{actions}</div> : null}
    </div>
  )
}
