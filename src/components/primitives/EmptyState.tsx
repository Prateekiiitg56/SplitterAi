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
    <div className={cx('flex flex-col items-center justify-center text-center px-4 py-6 gap-1.5', className)}>
      {icon ? (
        <span aria-hidden="true" className="text-[var(--ide-text-faint)] mb-1">
          {icon}
        </span>
      ) : null}
      <p className="text-[13px] font-semibold text-[var(--ide-text-hi)]">{title}</p>
      {detail ? (
        <p className="text-[12px] text-[var(--ide-text-dim)] max-w-[42ch] leading-[1.4]">{detail}</p>
      ) : null}
      {action ? <div className="mt-2 flex items-center gap-2">{action}</div> : null}
    </div>
  )
}
