import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

/**
 * EmptyState.
 *
 * Replaces seven variants that centred a 30%-opacity icon in a `p-12`
 * card. An empty screen is an invitation to act, so the primary line says
 * what to do rather than restating that there is nothing here, and the
 * action sits with it.
 */
export function EmptyState({
  icon,
  title,
  detail,
  action,
  className,
}: {
  icon?: ReactNode
  /** What to do next, not "No data found". */
  title: ReactNode
  detail?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-col items-center justify-center text-center px-6 py-10', className)}>
      {icon ? (
        <span aria-hidden="true" className="text-[var(--ghost)] mb-3">
          {icon}
        </span>
      ) : null}
      <p className="text-ui font-medium text-[var(--text-2)]">{title}</p>
      {detail ? (
        <p className="mt-1 text-meta text-[var(--faint)] max-w-[42ch] leading-[1.55]">{detail}</p>
      ) : null}
      {action ? <div className="mt-4 flex items-center gap-2">{action}</div> : null}
    </div>
  )
}
