import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'

/**
 * Button.
 *
 * Four variants, two sizes, one radius. Replaces seven inline copies of
 * the primary/ghost pair scattered through the modals and topbars.
 *
 * Icon-only buttons are a separate shape in the type system: `label` is
 * required, so an unlabelled icon button cannot be written. The original
 * had eleven icon-only buttons relying on `title` alone, which is not a
 * reliable accessible name.
 */

type Variant = 'primary' | 'ghost' | 'quiet' | 'danger' | 'warn'

interface Base extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> {
  variant?: Variant
  size?: 'sm' | 'md'
  loading?: boolean
  className?: string
}

interface WithText extends Base {
  children: ReactNode
  icon?: ReactNode
  /** Not permitted when the button has visible text — the text is the name. */
  label?: never
}

interface IconOnly extends Base {
  children?: never
  icon: ReactNode
  /** Required. Becomes the accessible name. */
  label: string
}

export type ButtonProps = WithText | IconOnly

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-[var(--accent)] text-[var(--accent-ink)] font-semibold border border-transparent hover:brightness-110 active:brightness-95',
  ghost:
    'bg-transparent text-[var(--text-2)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--text)]',
  quiet:
    'bg-transparent text-[var(--dim)] border border-transparent hover:bg-[var(--panel-2)] hover:text-[var(--text)]',
  danger:
    'bg-[var(--bad-quiet)] text-[var(--bad)] border border-[rgba(255,110,130,0.28)] hover:border-[var(--bad)]',
  warn:
    'bg-[rgba(245,158,11,0.12)] text-[#fbbf24] border border-[rgba(245,158,11,0.3)] hover:border-[#fbbf24]',
}

export function Button(props: ButtonProps) {
  const { variant = 'ghost', size = 'md', loading = false, className, icon, label, children, disabled, ...rest } = props as
    & Base
    & { icon?: ReactNode; label?: string; children?: ReactNode }

  const iconOnly = !children

  return (
    <button
      type="button"
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-panel',
        'text-meta leading-none whitespace-nowrap select-none',
        'transition-[background-color,border-color,color,filter,transform]',
        'duration-[var(--d-quick)] ease-standard',
        'active:scale-[0.985]',
        'disabled:opacity-45 disabled:pointer-events-none',
        size === 'sm' ? 'h-8' : 'h-9',
        iconOnly ? (size === 'sm' ? 'w-8 h-8' : 'w-9 h-9') : size === 'sm' ? 'px-3' : 'px-4',
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <svg className="animate-spin h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="flex-shrink-0 inline-flex">{icon}</span>
      ) : null}
      {children}
    </button>
  )
}
