import { useCallback, useEffect, useId, useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useScore } from '../../lib/motion'
import { cx } from '../../lib/cx'
import { Button } from './Button'

/**
 * Modal — an actual dialog.
 *
 * The original had seven overlays. None of them had `role="dialog"`,
 * `aria-modal`, a focus trap, initial focus, Escape-to-close, or a
 * dismissable backdrop: a keyboard user could tab straight out of an open
 * modal into the page behind it, and a screen reader was never told a
 * dialog had opened. All seven are replaced by this.
 *
 * Renders through a portal so it cannot be clipped by the ancestor
 * `overflow: hidden` on the app shell.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

interface ModalProps {
  open: boolean
  onClose: () => void
  /** Becomes the dialog's accessible name via aria-labelledby. */
  title: string
  /** Optional supporting line, wired to aria-describedby. */
  description?: ReactNode
  children: ReactNode
  /** Right-aligned action row, divided from the body. */
  footer?: ReactNode
  /** Max width in px. Dense dialogs should stay under ~520. */
  width?: number
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 460,
}: ModalProps) {
  const score = useScore()
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)
  const id = useId()
  const titleId = `${id}-title`
  const descId = `${id}-desc`

  /* Remember what had focus, then move focus into the dialog. */
  useEffect(() => {
    if (!open) return
    restoreTo.current = document.activeElement as HTMLElement | null

    const panel = panelRef.current
    if (panel) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE)
      // Focusing the panel itself is the correct fallback for a dialog
      // whose body happens to contain nothing focusable.
      ;(first ?? panel).focus({ preventScroll: true })
    }

    return () => {
      restoreTo.current?.focus?.({ preventScroll: true })
    }
  }, [open])

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (items.length === 0) {
        event.preventDefault()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      // Wrap at both ends so focus can never leave the dialog.
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="overlay"
          variants={score.backdrop}
          initial="hidden"
          animate="shown"
          exit="gone"
          className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-[rgba(3,5,9,0.72)] backdrop-blur-[2px]"
          onMouseDown={(event) => {
            // Only a press that both starts and ends on the backdrop
            // dismisses — otherwise a drag that ends outside a text
            // selection closes the dialog and loses the user's input.
            if (event.target === event.currentTarget) onClose()
          }}
        >
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            variants={score.dialog}
            initial="hidden"
            animate="shown"
            exit="gone"
            style={{ maxWidth: width }}
            className={cx(
              'w-full max-h-[calc(100vh-2.5rem)] flex flex-col outline-none',
              'bg-[var(--panel)] border border-[var(--border)] rounded-float shadow-float',
            )}
          >
            <div className="flex items-start gap-3 px-4 pt-3.5 pb-3 border-b border-[var(--border-soft)] flex-shrink-0">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-strong font-semibold text-[var(--text)] leading-snug">
                  {title}
                </h2>
                {description ? (
                  <p id={descId} className="mt-1 text-meta text-[var(--faint)]">
                    {description}
                  </p>
                ) : null}
              </div>
              <Button variant="quiet" size="sm" label="Close dialog" icon={<X className="w-3.5 h-3.5" />} onClick={onClose} />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">{children}</div>

            {footer ? (
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border-soft)] flex-shrink-0">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
