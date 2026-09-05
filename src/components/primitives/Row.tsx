import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

/**
 * Clickable rows, done correctly.
 *
 * The original made whole table rows and cards clickable by putting
 * `onClick` on a `div` — no role, no tabIndex, no key handler — and then
 * nested real `<button>`s inside for the secondary actions, held together
 * with `stopPropagation`. Those rows were unreachable by keyboard, and a
 * screen reader announced an unlabelled clickable group.
 *
 * The fix is the overlay pattern rather than `role="button"` on the
 * container: `RowPrimary` is a real button whose `::after` stretches over
 * the whole row. Pointer users can click anywhere, keyboard users get one
 * properly labelled button, and `RowActions` sits above the overlay so
 * the secondary buttons stay independently clickable — no event
 * interception needed.
 */

export function Row({
  children,
  selected = false,
  className,
}: {
  children: ReactNode
  selected?: boolean
  className?: string
}) {
  return (
    <div
      className={cx(
        'group relative flex items-center gap-3 min-w-0',
        'transition-colors duration-[var(--d-quick)] ease-standard',
        selected ? 'bg-[var(--panel-3)]' : 'hover:bg-[var(--panel-2)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function RowPrimary({
  children,
  onClick,
  className,
}: {
  children: ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        // The pseudo-element resolves against Row's `relative`, so it
        // covers the row. The button must not be positioned itself.
        'text-left min-w-0 outline-offset-4',
        'after:content-[""] after:absolute after:inset-0 after:rounded-panel',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Secondary actions. Sits above RowPrimary's overlay. */
export function RowActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'relative z-10 flex items-center gap-1 flex-shrink-0',
        // Revealed on hover for pointer users, but always present for
        // keyboard users — opacity-0 would hide the focus ring.
        'opacity-0 group-hover:opacity-100 focus-within:opacity-100',
        'transition-opacity duration-[var(--d-quick)] ease-standard',
        className,
      )}
    >
      {children}
    </div>
  )
}
