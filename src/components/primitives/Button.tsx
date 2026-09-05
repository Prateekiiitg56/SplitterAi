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

type Variant = 'primary' | 'ghost' | 'quiet' | 'danger'

interface Base extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> {
  variant?: Variant
  size?: 'sm' | 'md'
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
}

export function Button(props: ButtonProps) {
  const { variant = 'ghost', size = 'md', className, icon, label, children, ...rest } = props as
    & Base
    & { icon?: ReactNode; label?: string; children?: ReactNode }

  const iconOnly = !children

  return (
    <button
      type="button"
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-panel',
        'text-meta leading-none whitespace-nowrap select-none',
        'transition-[background-color,border-color,color,filter,transform]',
        'duration-[var(--d-quick)] ease-standard',
        'active:scale-[0.985]',
        'disabled:opacity-45 disabled:pointer-events-none',
        size === 'sm' ? 'h-6' : 'h-7',
        iconOnly ? (size === 'sm' ? 'w-6' : 'w-7') : size === 'sm' ? 'px-2' : 'px-2.5',
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {icon ? <span className="flex-shrink-0 inline-flex">{icon}</span> : null}
      {children}
    </button>
  )
}
