import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Search } from 'lucide-react'
import { cx } from '../../lib/cx'

/**
 * Form fields.
 *
 * Every control here generates its own id and wires `htmlFor` to it.
 * `htmlFor` appeared zero times in the original codebase: modal labels
 * were plain text sitting near an input, and search inputs had only a
 * placeholder, so none of them were programmatically associated.
 */

const CONTROL = cx(
  'w-full bg-[var(--bg-inset)] text-[var(--text)] text-ui',
  'border border-[var(--border)] rounded-control',
  'placeholder:text-[var(--faint)]',
  'transition-[border-color] duration-[var(--d-quick)] ease-standard',
  'hover:border-[var(--border-strong)]',
  'focus:border-[var(--accent)]',
  'disabled:opacity-45',
)

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-meta font-medium text-[var(--dim)] mb-1.5">
      {children}
    </label>
  )
}

function Help({ hint, error, id }: { hint?: ReactNode; error?: ReactNode; id: string }) {
  if (!error && !hint) return null
  return (
    <p
      id={id}
      className={cx('mt-1.5 text-micro', error ? 'text-[var(--bad)]' : 'text-[var(--faint)]')}
    >
      {error ?? hint}
    </p>
  )
}

interface Common {
  label: string
  hint?: ReactNode
  error?: ReactNode
  className?: string
}

export function TextField({
  label,
  hint,
  error,
  className,
  ...rest
}: Common & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id'>) {
  const id = useId()
  const helpId = `${id}-help`
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? helpId : undefined}
        className={cx(CONTROL, 'h-7 px-2', Boolean(error) && 'border-[var(--bad)]')}
        {...rest}
      />
      <Help hint={hint} error={error} id={helpId} />
    </div>
  )
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  rows = 4,
  ...rest
}: Common & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'id'>) {
  const id = useId()
  const helpId = `${id}-help`
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? helpId : undefined}
        className={cx(CONTROL, 'px-2 py-1.5 resize-none leading-[1.55]', Boolean(error) && 'border-[var(--bad)]')}
        {...rest}
      />
      <Help hint={hint} error={error} id={helpId} />
    </div>
  )
}

export function SelectField({
  label,
  hint,
  error,
  className,
  children,
  ...rest
}: Common & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'id'>) {
  const id = useId()
  const helpId = `${id}-help`
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        aria-describedby={hint || error ? helpId : undefined}
        className={cx(CONTROL, 'h-7 px-1.5 cursor-pointer', Boolean(error) && 'border-[var(--bad)]')}
        {...rest}
      >
        {children}
      </select>
      <Help hint={hint} error={error} id={helpId} />
    </div>
  )
}

/**
 * Search. The label is visually hidden rather than absent — the magnifier
 * is not an accessible name.
 */
export function SearchField({
  label,
  className,
  ...rest
}: Common & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id' | 'type'>) {
  const id = useId()
  return (
    <div className={cx('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        aria-hidden="true"
        className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--faint)] pointer-events-none"
      />
      <input id={id} type="search" className={cx(CONTROL, 'h-7 pl-7 pr-2')} {...rest} />
    </div>
  )
}
