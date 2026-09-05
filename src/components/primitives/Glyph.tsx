import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

/**
 * The one icon container.
 *
 * The codebase previously had nine variants of "icon in a rounded square"
 * across five sizes, four radii, and several tinted fills. Tinted fills
 * behind icons are the SaaS-card default and put a coloured chip in every
 * card; here the container is a hairline and the icon itself carries any
 * colour, via `tone`.
 */

export type Tone = 'default' | 'accent' | 'planner' | 'coder' | 'reviewer' | 'runner'

const TONE_INK: Record<Tone, string> = {
  default: 'text-[var(--dim)]',
  accent: 'text-[var(--accent)]',
  planner: 'text-[var(--role-planner)]',
  coder: 'text-[var(--role-coder)]',
  reviewer: 'text-[var(--role-reviewer)]',
  runner: 'text-[var(--role-runner)]',
}

interface GlyphProps {
  children: ReactNode
  /** sm = 20px (inline, rows), md = 28px (cards, headers) */
  size?: 'sm' | 'md'
  tone?: Tone
  className?: string
}

export function Glyph({ children, size = 'sm', tone = 'default', className }: GlyphProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex items-center justify-center flex-shrink-0',
        'rounded-control border border-[var(--border)] bg-[var(--panel-2)]',
        size === 'sm' ? 'w-5 h-5' : 'w-7 h-7',
        TONE_INK[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
