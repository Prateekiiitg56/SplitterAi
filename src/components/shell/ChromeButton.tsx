import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

/**
 * ChromeButton — the one icon button used by every piece of IDE chrome.
 *
 * The title bar, explorer head and chat head all repeat the same 20–22px
 * square control: transparent until hovered, then a neutral raised fill. The
 * Button primitive is deliberately not used here — its smallest size is a
 * 28px bordered control built for content areas, which does not fit a 34px
 * title bar or a 36px panel head. Everything inside the *content* pane still
 * uses Button.
 *
 * A label is always required and becomes both aria-label and title, so no
 * chrome control ships without an accessible name.
 */

interface ChromeButtonProps {
  icon: ReactNode
  /** Accessible name — required. Becomes aria-label and the native tooltip. */
  label: string
  onClick?: () => void
  /** Square edge length in px. */
  size?: number
  /** Renders the pressed/selected fill. */
  active?: boolean
  /** Mirrors the control's disclosure state to assistive tech. */
  expanded?: boolean
  disabled?: boolean
  className?: string
}

export function ChromeButton({
  icon,
  label,
  onClick,
  size = 22,
  active = false,
  expanded,
  disabled = false,
  className,
}: ChromeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      aria-expanded={expanded}
      style={{ width: size, height: size }}
      className={cx(
        'inline-flex items-center justify-center rounded-control flex-shrink-0',
        'transition-colors duration-[var(--d-quick)]',
        active
          ? 'bg-[var(--ide-raised)] text-[var(--ide-text-hi)]'
          : 'text-[var(--ide-text-faint)] hover:bg-[var(--ide-raised)] hover:text-[var(--ide-text)]',
        disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent',
        className,
      )}
    >
      {icon}
    </button>
  )
}
